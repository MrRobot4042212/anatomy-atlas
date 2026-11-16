import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  BodySystem,
  Paginated,
  Structure,
  StructureDetail,
  StructureTreeNode,
} from '@atlas/shared';
import { Prisma, type Structure as StructureRow } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListStructuresDto } from './dto/list-structures.dto.js';
import { normalizeQuery, rankStructures, type RankInput } from './search-rank.js';
import { toStructure } from './structure.mapper.js';

/** ILIKE patterns, one per word of the query, with the user's own wildcards escaped. */
export function searchPatterns(q: string | undefined): string[] {
  return (q ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `%${word.replace(/[\\%_]/g, '\\$&')}%`);
}

/** A matching row's ranking columns: names as Postgres normalized them, the query likewise, depth. */
type SearchRow = RankInput & { id: string; q: string };

interface SubtreeBounds {
  id: string;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

@Injectable()
export class StructuresService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Filtered, paginated listing. Text search is accent-insensitive over the three name
   * columns (Postgres `unaccent`), which is enough for ~3k rows; revisit with full-text or
   * Meilisearch only when measured latency demands it (ADR 0003). With a query the results are
   * ranked by relevance (`search-rank.ts`); without one they are listed by name.
   */
  async list(query: ListStructuresDto): Promise<Paginated<Structure>> {
    const conditions: Prisma.Sql[] = [];
    if (query.system) conditions.push(Prisma.sql`"system" = ${query.system}::"BodySystem"`);
    if (query.region) {
      conditions.push(Prisma.sql`"region" = ${query.region.replace('-', '_')}::"BodyRegion"`);
    }
    // Every word must appear in one of the three names, in any order, so "ganglio axilar"
    // finds "Ganglios linfáticos axilares". A plural only adds a suffix, so substring matching
    // covers it.
    const patterns = searchPatterns(query.q);
    for (const pattern of patterns) {
      conditions.push(
        Prisma.sql`(unaccent("nameEs") ILIKE unaccent(${pattern})
          OR unaccent("nameEn") ILIKE unaccent(${pattern})
          OR unaccent("nameLa") ILIKE unaccent(${pattern}))`,
      );
    }
    const where = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;
    const offset = (query.page - 1) * query.pageSize;

    if (patterns.length > 0) {
      return this.search(where, normalizeQuery(query.q), query.page, query.pageSize);
    }

    const [rows, [{ count }]] = await Promise.all([
      this.prisma.$queryRaw<StructureRow[]>`
        SELECT * FROM "Structure" ${where}
        ORDER BY "nameEn" ASC, "laterality" ASC
        LIMIT ${query.pageSize} OFFSET ${offset}`,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM "Structure" ${where}`,
    ]);

    return {
      items: rows.map(toStructure),
      total: Number(count),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * Ranked text search. The first query returns the ranking columns of every matching row (a few
   * dozen for a real query, about 1,500 for the broadest two-letter one): names normalized by
   * Postgres and the depth in the hierarchy. `rankStructures` orders them, the page is cut in
   * memory (so `total` needs no COUNT) and only the page is then loaded as full rows.
   * Depth walks up from the matches only (a recursive CTE over the primary key), not down the whole
   * table: for a narrow query that is a handful of lookups. No index helps the filter: `unaccent` is
   * not immutable, so it is a sequential scan of 3,269 rows either way, as before.
   * Measured on the real catalog over HTTP (median of 40, interleaved with the previous version,
   * 2026-11-16): narrow queries 9 ms before, 11 to 15 ms now; "ar" (1,507 matches) 7 ms before,
   * 25 ms now. A generated, indexed `unaccent` column is the next lever if that ever matters.
   */
  private async search(
    where: Prisma.Sql,
    phrase: string,
    page: number,
    pageSize: number,
  ): Promise<Paginated<Structure>> {
    const rows = await this.prisma.$queryRaw<SearchRow[]>`
      WITH RECURSIVE hits AS MATERIALIZED (
        SELECT * FROM "Structure" ${where}
      ),
      lineage AS (
        SELECT h."id" AS origin, h."parentId" AS next, 0 AS depth FROM hits h
        UNION ALL
        SELECT l.origin, p."parentId", l.depth + 1
        FROM lineage l JOIN "Structure" p ON p."id" = l.next
      ),
      depths AS (SELECT origin, max(depth)::int AS depth FROM lineage GROUP BY origin),
      term AS MATERIALIZED (SELECT lower(unaccent(${phrase})) AS q)
      SELECT h."id", h."nameEn", h."subsystem", h."meshId", h."laterality", d.depth, t.q,
        lower(unaccent(h."nameEs")) AS es,
        lower(unaccent(h."nameEn")) AS en,
        lower(unaccent(h."nameLa")) AS la
      FROM hits h JOIN depths d ON d.origin = h."id" CROSS JOIN term t`;

    const ranked = rows.length ? rankStructures(rows, rows[0].q) : [];
    const offset = (page - 1) * pageSize;
    const pageIds = ranked.slice(offset, offset + pageSize).map((r) => r.id);
    if (pageIds.length === 0) return { items: [], total: rows.length, page, pageSize };

    // Only the page travels as full rows; the ranking above read the light columns.
    const full = await this.prisma.structure.findMany({ where: { id: { in: pageIds } } });
    const byId = new Map(full.map((r) => [r.id, r]));
    const pageRows = pageIds.flatMap((id) => byId.get(id) ?? []);
    const bounds = await this.subtreeBounds(
      pageRows.filter((r) => !r.meshId && r.boundsMin.length !== 3).map((r) => r.id),
    );

    return {
      items: pageRows.map((r) => {
        const b = bounds.get(r.id);
        return toStructure(
          b
            ? { ...r, boundsMin: [b.minX, b.minY, b.minZ], boundsMax: [b.maxX, b.maxY, b.maxZ] }
            : r,
        );
      }),
      total: rows.length,
      page,
      pageSize,
    };
  }

  /**
   * Bounds of group nodes (no geometry of their own) as the union of their descendants' bounds,
   * so a search result such as "Heart" can be framed like any structure. Only for the groups on
   * the page being returned; groups with no geometry below them get none.
   */
  private async subtreeBounds(ids: string[]): Promise<Map<string, SubtreeBounds>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<SubtreeBounds[]>`
      WITH RECURSIVE subtree AS (
        SELECT "id" AS root, "id" FROM "Structure" WHERE "id" IN (${Prisma.join(ids)})
        UNION ALL
        SELECT t.root, c."id" FROM "Structure" c JOIN subtree t ON c."parentId" = t."id"
      )
      SELECT t.root AS id,
        min(s."boundsMin"[1]) AS "minX", min(s."boundsMin"[2]) AS "minY",
        min(s."boundsMin"[3]) AS "minZ", max(s."boundsMax"[1]) AS "maxX",
        max(s."boundsMax"[2]) AS "maxY", max(s."boundsMax"[3]) AS "maxZ"
      FROM subtree t JOIN "Structure" s ON s."id" = t."id"
      WHERE cardinality(s."boundsMin") = 3 AND cardinality(s."boundsMax") = 3
      GROUP BY t.root`;
    return new Map(rows.map((r) => [r.id, r]));
  }

  async byMeshId(meshId: string): Promise<StructureDetail> {
    const row = await this.prisma.structure.findUnique({ where: { meshId } });
    if (!row) throw new NotFoundException(`No structure with meshId ${meshId}`);

    const [ancestors, children] = await Promise.all([
      this.ancestorsOf(row.parentId),
      this.prisma.structure.findMany({
        where: { parentId: row.id },
        orderBy: [{ nameEn: 'asc' }, { laterality: 'asc' }],
      }),
    ]);

    return {
      structure: toStructure(row),
      ancestors: ancestors.map(toStructure),
      children: children.map(toStructure),
    };
  }

  /** Root first, direct parent last. Recursive CTE, one round trip. */
  private async ancestorsOf(parentId: string | null): Promise<StructureRow[]> {
    if (!parentId) return [];
    const rows = await this.prisma.$queryRaw<(StructureRow & { depth: number })[]>`
      WITH RECURSIVE up AS (
        SELECT s.*, 0 AS depth FROM "Structure" s WHERE s."id" = ${parentId}
        UNION ALL
        SELECT p.*, up.depth + 1 FROM "Structure" p JOIN up ON p."id" = up."parentId"
      )
      SELECT * FROM up ORDER BY depth DESC`;
    return rows;
  }

  /** Whole hierarchy of one system, assembled in memory (a system is < 1k rows). */
  async tree(system: BodySystem): Promise<StructureTreeNode[]> {
    const rows = await this.prisma.structure.findMany({
      where: { system },
      orderBy: [{ nameEn: 'asc' }, { laterality: 'asc' }],
    });
    return buildTree(rows);
  }
}

/**
 * Group nodes come first; structures with geometry but no parent in this system are collected
 * under a synthetic "unclassified" root at the end, so the tree opens on the real hierarchy.
 */
export function buildTree(rows: StructureRow[]): StructureTreeNode[] {
  const nodes = new Map<string, StructureTreeNode>();
  for (const r of rows) {
    nodes.set(r.id, {
      id: r.id,
      termKey: r.termKey,
      meshId: r.meshId,
      name: r.nameEn,
      nameEs: r.nameEs || r.nameEn,
      laterality: r.laterality,
      children: [],
    });
  }
  const groups: StructureTreeNode[] = [];
  const loose: StructureTreeNode[] = [];
  for (const r of rows) {
    const node = nodes.get(r.id) as StructureTreeNode;
    const parent = r.parentId ? nodes.get(r.parentId) : undefined;
    if (parent) parent.children.push(node);
    else if (node.meshId) loose.push(node);
    else groups.push(node);
  }
  if (loose.length === 0) return groups;
  const system = rows[0]?.system ?? 'unknown';
  return [
    ...groups,
    {
      id: `${system}:unclassified`,
      termKey: 'za:unclassified',
      meshId: null,
      name: 'Unclassified',
      nameEs: 'Sin agrupar',
      laterality: 'midline',
      children: loose,
    },
  ];
}

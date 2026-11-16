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
import { toStructure } from './structure.mapper.js';

/** ILIKE patterns, one per word of the query, with the user's own wildcards escaped. */
export function searchPatterns(q: string | undefined): string[] {
  return (q ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `%${word.replace(/[\\%_]/g, '\\$&')}%`);
}

@Injectable()
export class StructuresService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Filtered, paginated listing. Text search is accent-insensitive over the three name
   * columns (Postgres `unaccent`), which is enough for ~3k rows; revisit with full-text or
   * Meilisearch only when measured latency demands it (ADR 0003).
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
    for (const pattern of searchPatterns(query.q)) {
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

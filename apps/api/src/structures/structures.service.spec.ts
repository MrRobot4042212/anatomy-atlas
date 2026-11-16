import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Structure as StructureRow } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toStructure } from './structure.mapper.js';
import { buildTree, searchPatterns, StructuresService } from './structures.service.js';

function row(partial: Partial<StructureRow> & { id: string; nameEn: string }): StructureRow {
  return {
    termKey: `za:${partial.nameEn.toLowerCase()}`,
    ta2Id: null,
    meshId: null,
    nameLa: partial.nameEn,
    nameEs: partial.nameEn,
    system: 'skeletal',
    subsystem: null,
    region: null,
    laterality: 'midline',
    description: null,
    parentId: null,
    assetId: null,
    boundsMin: [],
    boundsMax: [],
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...partial,
  };
}

describe('toStructure', () => {
  it('maps snake_case region to kebab-case and empty bounds to null', () => {
    const s = toStructure(row({ id: 'a', nameEn: 'Femur', region: 'lower_limb' }));
    expect(s.region).toBe('lower-limb');
    expect(s.bounds).toBeNull();
    expect(s.names).toEqual({ la: 'Femur', en: 'Femur', es: 'Femur' });
  });

  it('keeps bounds when both arrays have three components', () => {
    const s = toStructure(
      row({ id: 'a', nameEn: 'Femur', boundsMin: [0, 1, 2], boundsMax: [3, 4, 5] }),
    );
    expect(s.bounds).toEqual({ min: [0, 1, 2], max: [3, 4, 5] });
  });
});

describe('searchPatterns', () => {
  it('returns one pattern per word so word order and plurals do not matter', () => {
    expect(searchPatterns('  ganglio   linfático axilar ')).toEqual([
      '%ganglio%',
      '%linfático%',
      '%axilar%',
    ]);
  });

  it('returns no patterns for an empty or missing query', () => {
    expect(searchPatterns(undefined)).toEqual([]);
    expect(searchPatterns('   ')).toEqual([]);
  });

  it('escapes the user wildcards', () => {
    expect(searchPatterns('100%_a\\b')).toEqual(['%100\\%\\_a\\\\b%']);
  });
});

describe('buildTree', () => {
  it('collects loose structures with geometry under a synthetic root', () => {
    const rows = [
      row({ id: 'root', nameEn: 'Skeletal system' }),
      row({ id: 'loose', nameEn: 'Patella', meshId: 'ta2-1', parentId: 'outside' }),
    ];
    const tree = buildTree(rows);
    expect(tree.map((n) => n.id)).toEqual(['root', 'skeletal:unclassified']);
    expect(tree[1]).toMatchObject({ nameEs: 'Sin agrupar', children: [{ id: 'loose' }] });
  });

  it('nests children under parents and keeps orphan groups as roots', () => {
    const rows = [
      row({ id: 'root', nameEn: 'Skeletal system' }),
      row({ id: 'limb', nameEn: 'Bones of lower limb', parentId: 'root' }),
      row({
        id: 'femur-l',
        nameEn: 'Femur',
        parentId: 'limb',
        meshId: 'ta2-1360-l',
        laterality: 'left',
      }),
      row({ id: 'orphan', nameEn: 'Orphan', parentId: 'outside-this-system' }),
    ];
    const tree = buildTree(rows);
    expect(tree.map((n) => n.id)).toEqual(['root', 'orphan']);
    expect(tree[1].meshId).toBeNull();
    expect(tree[0].children[0].children[0]).toMatchObject({
      meshId: 'ta2-1360-l',
      laterality: 'left',
    });
  });
});

describe('StructuresService.list with a query', () => {
  const prisma = { $queryRaw: vi.fn(), structure: { findMany: vi.fn() } };
  let service: StructuresService;
  const stored = new Map<string, StructureRow>();

  // Rows as the ranking query returns them: light columns, normalized names, depth and the query.
  // The full row is kept for the `findMany` that loads the page.
  const hit = (partial: Partial<StructureRow> & { id: string; nameEn: string }, depth: number) => {
    const base = row(partial);
    stored.set(base.id, base);
    return {
      id: base.id,
      nameEn: base.nameEn,
      subsystem: base.subsystem,
      meshId: base.meshId,
      laterality: base.laterality,
      es: base.nameEs.toLowerCase(),
      en: base.nameEn.toLowerCase(),
      la: base.nameLa.toLowerCase(),
      depth,
      q: partial.nameEn.split(' ')[0].toLowerCase(),
    };
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    stored.clear();
    // Prisma returns `in` lookups in storage order, not in the order asked for.
    prisma.structure.findMany.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) =>
        [...stored.values()].filter((r) => where.id.in.includes(r.id)),
    );
    const module = await Test.createTestingModule({
      providers: [StructuresService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(StructuresService);
  });

  it('ranks, paginates in memory and counts without a COUNT query', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      hit(
        {
          id: 'bursa',
          nameEn: 'Sciatic bursa of obturator internus',
          subsystem: 'bursae',
          meshId: 'b',
        },
        2,
      ),
      hit({ id: 'nerve-r', nameEn: 'Sciatic nerve', meshId: 'n-r', laterality: 'right' }, 6),
      hit({ id: 'nerve-l', nameEn: 'Sciatic nerve', meshId: 'n-l', laterality: 'left' }, 6),
    ]);
    const page = await service.list({ q: 'sciatic', page: 1, pageSize: 2 });
    expect(page.items.map((s) => s.id)).toEqual(['nerve-l', 'nerve-r']);
    expect(page.total).toBe(3);
    // One ranking query, no COUNT and no subtree bounds (every row on the page has geometry).
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.structure.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['nerve-l', 'nerve-r'] } },
    });
  });

  it('frames a group on the page with the union of its descendants bounds', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([hit({ id: 'heart', nameEn: 'Heart' }, 1)])
      .mockResolvedValueOnce([
        { id: 'heart', minX: -0.1, minY: 1.2, minZ: -0.05, maxX: 0.08, maxY: 1.35, maxZ: 0.1 },
      ]);
    const page = await service.list({ q: 'heart', page: 1, pageSize: 12 });
    expect(page.items[0].meshId).toBeNull();
    expect(page.items[0].bounds).toEqual({ min: [-0.1, 1.2, -0.05], max: [0.08, 1.35, 0.1] });
  });

  it('returns an empty page when nothing matches', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);
    const page = await service.list({ q: 'zzz', page: 1, pageSize: 12 });
    expect(page).toEqual({ items: [], total: 0, page: 1, pageSize: 12 });
  });
});

describe('StructuresService.byMeshId', () => {
  const prisma = {
    structure: { findUnique: vi.fn(), findMany: vi.fn() },
    $queryRaw: vi.fn(),
  };
  let service: StructuresService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [StructuresService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(StructuresService);
  });

  it('returns the structure with ancestors (root first) and children', async () => {
    prisma.structure.findUnique.mockResolvedValueOnce(
      row({ id: 'femur-l', nameEn: 'Femur', parentId: 'limb', meshId: 'ta2-1360-l' }),
    );
    prisma.$queryRaw.mockResolvedValueOnce([
      { ...row({ id: 'root', nameEn: 'Skeletal system' }), depth: 1 },
      { ...row({ id: 'limb', nameEn: 'Bones of lower limb', parentId: 'root' }), depth: 0 },
    ]);
    prisma.structure.findMany.mockResolvedValueOnce([]);

    const detail = await service.byMeshId('ta2-1360-l');
    expect(detail.structure.meshId).toBe('ta2-1360-l');
    expect(detail.ancestors.map((a) => a.names.en)).toEqual([
      'Skeletal system',
      'Bones of lower limb',
    ]);
    expect(detail.children).toEqual([]);
  });

  it('throws 404 for an unknown meshId', async () => {
    prisma.structure.findUnique.mockResolvedValueOnce(null);
    await expect(service.byMeshId('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

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

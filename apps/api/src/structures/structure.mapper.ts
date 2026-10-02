import type { BodyRegion, Structure } from '@atlas/shared';
import type { Structure as StructureRow } from '../generated/prisma/index.js';

/** Prisma row -> shared Structure. Region is snake_case in Postgres, kebab-case in the API. */
export function toStructure(row: StructureRow): Structure {
  return {
    id: row.id,
    termKey: row.termKey,
    ta2Id: row.ta2Id,
    meshId: row.meshId,
    names: { la: row.nameLa, en: row.nameEn, es: row.nameEs },
    system: row.system,
    subsystem: row.subsystem,
    region: row.region ? (row.region.replace('_', '-') as BodyRegion) : null,
    laterality: row.laterality,
    parentId: row.parentId,
    description: row.description,
    assetId: row.assetId,
    bounds:
      row.boundsMin.length === 3 && row.boundsMax.length === 3
        ? {
            min: [row.boundsMin[0], row.boundsMin[1], row.boundsMin[2]],
            max: [row.boundsMax[0], row.boundsMax[1], row.boundsMax[2]],
          }
        : null,
  };
}

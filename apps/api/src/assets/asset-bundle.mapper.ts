import { BODY_ZONES, type AssetBundle, type BodyZone } from '@atlas/shared';
import type { AssetBundle as AssetBundleRow, Prisma } from '../generated/prisma/index.js';

/** A bundle row with the meshIds and subsystems of its structures. */
export type AssetBundleWithStructures = AssetBundleRow & {
  structures: { meshId: string | null; subsystem: string | null }[];
};

/**
 * The `zones` JSON column -> zone index. The column is written by the seed, but JSON has no
 * schema in Postgres, so only BodyZone keys holding arrays of strings survive, in BODY_ZONES
 * order. Null when there is nothing (the `{}` default before the pipeline provides zones).
 */
export function toZones(value: Prisma.JsonValue): Partial<Record<BodyZone, string[]>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const zones: Partial<Record<BodyZone, string[]>> = {};
  let found = false;
  for (const zone of BODY_ZONES) {
    const ids = value[zone];
    if (!Array.isArray(ids)) continue;
    const meshIds = ids.filter((id): id is string => typeof id === 'string');
    if (meshIds.length === 0) continue;
    zones[zone] = meshIds;
    found = true;
  }
  return found ? zones : null;
}

/** Prisma row -> shared AssetBundle. `zones` is left out until the bundle has any. */
export function toAssetBundle(row: AssetBundleWithStructures): AssetBundle {
  const meshes: string[] = [];
  const subsystems: Record<string, string[]> = {};
  for (const s of row.structures) {
    if (!s.meshId) continue;
    meshes.push(s.meshId);
    (subsystems[s.subsystem ?? 'other'] ??= []).push(s.meshId);
  }
  const zones = toZones(row.zones);
  return {
    id: row.id,
    system: row.system,
    url: row.url,
    sizeBytes: row.sizeBytes,
    meshCount: row.meshCount,
    hash: row.hash,
    meshes,
    subsystems,
    ...(zones ? { zones } : {}),
  };
}

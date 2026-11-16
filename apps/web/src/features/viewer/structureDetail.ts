import type { StructureDetail } from '@atlas/shared';
import { api } from '@/lib/api';

// One promise per meshId, shared by the specimen label (React `use()`) and the embed bridge;
// details never change during a session, so a structure is fetched once.
const detailPromises = new Map<string, Promise<StructureDetail>>();

export function detailFor(meshId: string): Promise<StructureDetail> {
  let p = detailPromises.get(meshId);
  if (!p) {
    p = api.structure(meshId).catch((err: unknown) => {
      detailPromises.delete(meshId); // allow a retry on the next selection
      throw err;
    });
    detailPromises.set(meshId, p);
  }
  return p;
}

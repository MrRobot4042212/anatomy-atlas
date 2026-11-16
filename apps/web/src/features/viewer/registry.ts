import { Box3, type Mesh, type Object3D } from 'three';
import type { MaterialSet } from './materials';
import type { Bounds } from './store';

/**
 * One selectable structure: the named node and the meshes that are its own. A structure may
 * contain other structures (the GLB keeps the Blender parenting: the brachial artery is a child
 * of the axillary artery), so `meshes` stops at the next named structure below it.
 */
export interface StructureEntry {
  meshId: string;
  node: Object3D;
  meshes: Mesh[];
  materials: MaterialSet[];
}

/**
 * meshId -> entry, across all loaded layers. Filled once per layer on load, never traversed
 * per frame. A structure is a NAMED node; its mesh may be an unnamed child (instanced
 * geometry shared by left/right after meshopt quantization), so hits resolve upward.
 */
export const registry = new Map<string, StructureEntry>();

export function resolveMeshId(object: Object3D | null): string | null {
  let current: Object3D | null = object;
  while (current) {
    const id = current.userData.meshId as string | undefined;
    if (id) return id;
    current = current.parent;
  }
  return null;
}

/** World-space bounds of a structure's own meshes (nested structures excluded). */
export function entryBounds(entry: StructureEntry): Bounds | null {
  const box = new Box3();
  const part = new Box3();
  for (const mesh of entry.meshes) {
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) continue;
    mesh.updateWorldMatrix(true, false);
    box.union(part.copy(geometry.boundingBox).applyMatrix4(mesh.matrixWorld));
  }
  if (box.isEmpty()) return null;
  return { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
}

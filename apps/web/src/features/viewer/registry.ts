import { Box3, Mesh, type Object3D } from 'three';
import type { MaterialSet } from './materials';

/**
 * One selectable structure: the named node and its own meshes (those below it down to the next
 * structure node; nested structures such as vessel branches are entries of their own).
 */
export interface StructureEntry {
  meshId: string;
  node: Object3D;
  meshes: Mesh[];
  materials: MaterialSet[];
}

/** Whether the paint pass currently shows this structure. */
export const isShown = (entry: StructureEntry) => entry.meshes.some((m) => m.visible);

/** World bounds of the structure's own meshes (nested structures excluded). */
export function ownBounds(entry: StructureEntry, target = new Box3()): Box3 {
  target.makeEmpty();
  for (const mesh of entry.meshes) {
    mesh.updateWorldMatrix(true, false);
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      target.union(new Box3().copy(geometry.boundingBox).applyMatrix4(mesh.matrixWorld));
    }
  }
  return target;
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

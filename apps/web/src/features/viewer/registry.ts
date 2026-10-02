import { Mesh, type Object3D } from 'three';
import type { MaterialSet } from './materials';

/** One selectable structure: the named node and the meshes beneath it. */
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

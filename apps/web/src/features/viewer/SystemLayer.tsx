'use client';

import { useEffect } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh';
import type { AssetBundle, BodySystem, BodyZone } from '@atlas/shared';
import { materialSetFor } from './materials';
import { entryBounds, registry, resolveMeshId, type StructureEntry } from './registry';
import { subsystemKey, useViewerStore, type ViewerState } from './store';
import { passesFilters, variantFor, type PaintState } from './visibility';

// BVH-accelerated raycast for every mesh in the app (module scope, set once).
Mesh.prototype.raycast = acceleratedRaycast;

const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS_URL ?? '/models';

function bundleUrl(bundle: AssetBundle): string {
  // Bundle urls are "/models/<file>" relative to the assets host; cache-bust with the hash.
  const file = bundle.url.split('/').pop() as string;
  return `${ASSETS_URL}/${file}?v=${bundle.hash}`;
}

// three-mesh-bvh is pinned to the same major drei depends on so only one copy (and one
// module augmentation of BufferGeometry) exists in the bundle.
type BvhGeometry = BufferGeometry & { boundsTree?: MeshBVH };

/** Layer that neither the camera nor the raycaster sees: how a structure is hidden. */
const HIDDEN_LAYER = 31;

/**
 * Register every structure of a loaded scene and return their meshIds. A structure is a node
 * named with one of the bundle's meshIds, at any depth: the GLB keeps the Blender parenting, so
 * structures nest (the arterial tree hangs from the aorta). Each mesh belongs to its nearest
 * structure ancestor. Unnamed shared-geometry children are named by three after the glTF mesh
 * plus a `_n` suffix, so they never match a meshId. Idempotent: BVHs are built once per geometry
 * and materials are shared, so re-running after a StrictMode remount costs a traversal.
 */
function registerScene(scene: Object3D, meshIds: ReadonlySet<string>): string[] {
  const started = performance.now();
  let built = 0;
  const entries = new Map<string, StructureEntry>();
  const visit = (object: Object3D, owner: StructureEntry | null) => {
    let current = owner;
    if (meshIds.has(object.name) && !entries.has(object.name)) {
      current = { meshId: object.name, node: object, meshes: [], materials: [] };
      object.userData.meshId = object.name;
      entries.set(object.name, current);
    }
    if (current && object instanceof Mesh) {
      const geometry = object.geometry as BvhGeometry;
      if (!geometry.boundsTree) {
        geometry.boundsTree = new MeshBVH(geometry);
        built += 1;
      }
      // The GLB material name is the palette key. After a StrictMode remount the mesh already
      // carries one of our materials, so the original key is kept on the mesh the first time.
      const source = object.material as Material;
      const key = (object.userData.materialKey as string | undefined) ?? (source.name || 'default');
      object.userData.materialKey = key;
      const set = materialSetFor(key, source);
      object.material = set.base;
      current.meshes.push(object);
      current.materials.push(set);
    }
    for (const child of object.children) visit(child, current);
  };
  visit(scene, null);
  const ids: string[] = [];
  for (const [meshId, entry] of entries) {
    if (entry.meshes.length === 0) continue;
    registry.set(meshId, entry);
    ids.push(meshId);
  }
  if (process.env.NODE_ENV === 'development') {
    console.debug(
      `[viewer] registered ${ids.length} structures, built ${built} BVHs in ${Math.round(performance.now() - started)} ms`,
    );
  }
  return ids;
}

/** What the layer knows about each mesh besides its geometry: subsystem, zone and side. */
interface MeshFacts {
  system: BodySystem;
  subsystemOf: Map<string, string>;
  zoneOf: Map<string, BodyZone>;
}

function paint(meshIds: string[], facts: MeshFacts, state: PaintState) {
  for (const meshId of meshIds) {
    const entry = registry.get(meshId);
    if (!entry) continue;
    const sub = facts.subsystemOf.get(meshId);
    const visible =
      !state.hidden.has(meshId) &&
      !(sub && state.hiddenSubsystems.has(sub)) &&
      passesFilters(meshId, facts.zoneOf, state.zones, state.side);
    // Hide the structure's own meshes through a layer, never `node.visible`: that would also
    // hide the structures nested below it, which have their own zone and state.
    const variant = visible ? variantFor(meshId, facts.system, state) : null;
    entry.meshes.forEach((mesh, i) => {
      mesh.layers.set(variant ? 0 : HIDDEN_LAYER);
      if (variant) mesh.material = entry.materials[i][variant];
    });
  }
}

function paintStateChanged(a: ViewerState, b: ViewerState): boolean {
  return (
    a.hovered !== b.hovered ||
    a.selected !== b.selected ||
    a.hidden !== b.hidden ||
    a.hiddenSubsystems !== b.hiddenSubsystems ||
    a.isolated !== b.isolated ||
    a.transparent !== b.transparent ||
    a.translucentSystems !== b.translucentSystems ||
    a.zones !== b.zones ||
    a.side !== b.side ||
    a.dimOthers !== b.dimOthers
  );
}

export function SystemLayer({ bundle }: { bundle: AssetBundle }) {
  const { scene } = useGLTF(bundleUrl(bundle), false, true);

  const hover = useViewerStore((s) => s.hover);
  const select = useViewerStore((s) => s.select);
  const focus = useViewerStore((s) => s.focus);

  // Register, paint and subscribe in one effect so the cleanup (unsubscribe + unregister)
  // always pairs with a registration, StrictMode remounts included.
  useEffect(() => {
    const meshIds = registerScene(scene, new Set(bundle.meshes));
    const subsystemOf = new Map<string, string>();
    for (const [subsystem, ids] of Object.entries(bundle.subsystems)) {
      const key = subsystemKey(bundle.system, subsystem);
      for (const id of ids) subsystemOf.set(id, key);
    }
    const zoneOf = new Map<string, BodyZone>();
    for (const [zone, ids] of Object.entries(bundle.zones ?? {})) {
      for (const id of ids) zoneOf.set(id, zone as BodyZone);
    }
    const facts: MeshFacts = { system: bundle.system, subsystemOf, zoneOf };
    paint(meshIds, facts, useViewerStore.getState());
    const unsubscribe = useViewerStore.subscribe((state, prev) => {
      if (paintStateChanged(state, prev)) paint(meshIds, facts, state);
    });
    return () => {
      unsubscribe();
      for (const meshId of meshIds) registry.delete(meshId);
    };
  }, [scene, bundle]);

  /** While isolating, ghosted structures are not interactive. */
  const interactive = (meshId: string | null) => {
    const isolated = useViewerStore.getState().isolated;
    return meshId !== null && (!isolated || isolated === meshId);
  };

  const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const meshId = resolveMeshId(e.object);
    hover(interactive(meshId) ? meshId : null);
  };
  const onPointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hover(null);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const meshId = resolveMeshId(e.object);
    if (!interactive(meshId)) return;
    select(meshId);
    const entry = meshId ? registry.get(meshId) : undefined;
    // World-space bounds of the structure's own meshes, computed on demand (the scene is
    // attached by now); nested structures are not part of it.
    const bounds = entry ? entryBounds(entry) : null;
    if (bounds) focus(bounds);
  };

  return (
    <primitive
      object={scene}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    />
  );
}

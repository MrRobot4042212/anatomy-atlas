'use client';

import { useEffect } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh';
import type { AssetBundle, BodySystem, BodyZone } from '@atlas/shared';
import { materialSetFor } from './materials';
import { registry, resolveMeshId, type StructureEntry } from './registry';
import { subsystemKey, useViewerStore, type ViewerState } from './store';
import { passesFilters, variantFor, type PaintState } from './visibility';

// BVH-accelerated raycast for every mesh in the app (module scope, set once). Neither three
// nor R3F skips invisible objects when picking, so a hidden structure would still take the
// click; the paint pass hides structures mesh by mesh and the raycast honours that flag.
Mesh.prototype.raycast = function raycastVisible(this: Mesh, raycaster, intersects) {
  if (!this.visible) return;
  acceleratedRaycast.call(this, raycaster, intersects);
};

const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS_URL ?? '/models';

function bundleUrl(bundle: AssetBundle): string {
  // Bundle urls are "/models/<file>" relative to the assets host; cache-bust with the hash.
  const file = bundle.url.split('/').pop() as string;
  return `${ASSETS_URL}/${file}?v=${bundle.hash}`;
}

// three-mesh-bvh is pinned to the same major drei depends on so only one copy (and one
// module augmentation of BufferGeometry) exists in the bundle.
type BvhGeometry = BufferGeometry & { boundsTree?: MeshBVH };

/**
 * Register every structure node of a loaded scene and return their meshIds. A structure is a
 * node named with a meshId of the bundle, at any depth: vessel and nerve trees nest branches
 * under their trunk (616 of 676 cardiovascular structures are nested), so registering only
 * the scene's children would make every branch resolve to, and paint as, its root. Each mesh
 * belongs to its nearest structure ancestor, the same rule `resolveMeshId` applies to a hit.
 * Idempotent: BVHs are built once per geometry and materials are shared, so re-running after
 * a StrictMode remount costs a traversal, not a rebuild.
 */
function registerScene(scene: Object3D, meshIds: ReadonlySet<string>): string[] {
  const started = performance.now();
  let built = 0;
  const ids: string[] = [];
  const isStructure = (node: Object3D) => meshIds.has(node.name);

  /** Meshes of this structure: itself and its descendants down to the next structure. */
  const ownMeshes = (node: Object3D, out: Mesh[]) => {
    if (node instanceof Mesh) out.push(node);
    for (const child of node.children) if (!isStructure(child)) ownMeshes(child, out);
    return out;
  };

  const register = (node: Object3D) => {
    const meshId = node.name;
    node.userData.meshId = meshId;
    const meshes = ownMeshes(node, []);
    if (meshes.length === 0) return;
    const materials = meshes.map((mesh) => {
      const geometry = mesh.geometry as BvhGeometry;
      if (!geometry.boundsTree) {
        geometry.boundsTree = new MeshBVH(geometry);
        built += 1;
      }
      // The GLB material name is the palette key. After a StrictMode remount the mesh already
      // carries one of our materials, so the original key is kept on the mesh the first time.
      const source = mesh.material as Material;
      const key = (mesh.userData.materialKey as string | undefined) ?? (source.name || 'default');
      mesh.userData.materialKey = key;
      const set = materialSetFor(key, source);
      mesh.material = set.base;
      return set;
    });
    const entry: StructureEntry = { meshId, node, meshes, materials };
    registry.set(meshId, entry);
    ids.push(meshId);
  };

  scene.traverse((node) => {
    if (isStructure(node)) register(node);
  });
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
    // Visibility is set on the structure's own meshes, not on its node: hiding a trunk must
    // not hide the branches nested under it.
    const variant = visible ? variantFor(meshId, facts.system, state) : null;
    entry.meshes.forEach((mesh, i) => {
      mesh.visible = visible;
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
    if (entry) {
      // World-space bounds of one node, computed on demand (the scene is attached by now).
      const { min, max } = new Box3().setFromObject(entry.node);
      focus({ min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] });
    }
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

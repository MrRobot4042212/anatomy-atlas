'use client';

import { useEffect } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh';
import type { AssetBundle } from '@atlas/shared';
import { materialSetFor, type Variant } from './materials';
import { registry, resolveMeshId, type StructureEntry } from './registry';
import { subsystemKey, useViewerStore, type ViewerState } from './store';

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

/**
 * Register the named nodes of a loaded scene and return their meshIds. Idempotent: BVHs are
 * built once per geometry and materials are shared, so re-running after a StrictMode remount
 * costs a traversal, not a rebuild.
 */
function registerScene(scene: Object3D): string[] {
  const started = performance.now();
  let built = 0;
  const ids: string[] = [];
  for (const node of scene.children) {
    const meshId = node.name;
    if (!meshId) continue;
    node.userData.meshId = meshId;
    const meshes: Mesh[] = [];
    node.traverse((child) => {
      if (child instanceof Mesh) meshes.push(child);
    });
    if (meshes.length === 0) continue;
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
  }
  if (process.env.NODE_ENV === 'development') {
    console.debug(
      `[viewer] registered ${ids.length} structures, built ${built} BVHs in ${Math.round(performance.now() - started)} ms`,
    );
  }
  return ids;
}

type PaintState = Pick<
  ViewerState,
  'hovered' | 'selected' | 'hidden' | 'hiddenSubsystems' | 'isolated' | 'transparent'
>;

function variantFor(meshId: string, state: PaintState): Variant {
  if (meshId === state.selected) return 'selected';
  if (meshId === state.hovered) return 'hover';
  if (state.isolated && meshId !== state.isolated) return 'ghost';
  if (state.transparent.has(meshId)) return 'translucent';
  return 'base';
}

function paint(meshIds: string[], subsystemOf: Map<string, string>, state: PaintState) {
  for (const meshId of meshIds) {
    const entry = registry.get(meshId);
    if (!entry) continue;
    const sub = subsystemOf.get(meshId);
    const visible = !state.hidden.has(meshId) && !(sub && state.hiddenSubsystems.has(sub));
    entry.node.visible = visible;
    if (!visible) continue;
    const variant = variantFor(meshId, state);
    entry.meshes.forEach((mesh, i) => {
      mesh.material = entry.materials[i][variant];
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
    a.transparent !== b.transparent
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
    const meshIds = registerScene(scene);
    const subsystemOf = new Map<string, string>();
    for (const [subsystem, ids] of Object.entries(bundle.subsystems)) {
      const key = subsystemKey(bundle.system, subsystem);
      for (const id of ids) subsystemOf.set(id, key);
    }
    paint(meshIds, subsystemOf, useViewerStore.getState());
    const unsubscribe = useViewerStore.subscribe((state, prev) => {
      if (paintStateChanged(state, prev)) paint(meshIds, subsystemOf, state);
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

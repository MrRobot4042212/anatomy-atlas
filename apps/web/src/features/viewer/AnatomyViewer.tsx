'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, StatsGl } from '@react-three/drei';
import {
  Box3,
  Frustum,
  Matrix4,
  Plane,
  Raycaster,
  Vector3,
  type Material,
  type Mesh,
  type PerspectiveCamera,
} from 'three';
import type { AssetBundle } from '@atlas/shared';
import { fitDistance, nearFor, viewExtents } from './cameraFit';
import { setClippingPlanes } from './materials';
import { isShown, ownBounds, registry, resolveMeshId } from './registry';
import { SelectionCue } from './SelectionCue';
import { clippedAway, indexMeshFacts, occlusionVerdict, type Sight } from './selectionSight';
import { SystemLayer } from './SystemLayer';
import { useViewerStore, type Bounds, type CameraPreset, type ClippingState } from './store';

// The model's frame (ADR 0004): metres, Y up, floor between the feet at the origin, 1.7 m tall,
// facing +Z. Rendered at the origin so API bounds and world bounds coincide.
export const BODY_BOUNDS = {
  min: [-0.34, 0.0, -0.12] as const,
  max: [0.34, 1.71, 0.14] as const,
};
const BODY: Bounds = { min: [...BODY_BOUNDS.min], max: [...BODY_BOUNDS.max] };
const CENTER = new Vector3(0, 0.88, 0);
const DISTANCE = 3.2;
const PRESET_EYES: Record<CameraPreset, Vector3> = {
  anterior: new Vector3(0, CENTER.y, DISTANCE),
  posterior: new Vector3(0, CENTER.y, -DISTANCE),
  left: new Vector3(DISTANCE, CENTER.y, 0), // subject's left is +X
  right: new Vector3(-DISTANCE, CENTER.y, 0),
  superior: new Vector3(0, CENTER.y + DISTANCE, 0.001),
};
// Dolly limit: small enough to study an ossicle up close (the fit puts the malleus at ~2 cm).
const MIN_DISTANCE = 0.003;
const MAX_DISTANCE = 8;

/**
 * Frames `cameraTarget` and applies camera presets; the only consumer of those slices. Focus
 * keeps the current viewing direction and moves the camera to the distance at which the
 * structure's bounds fill a fixed share of the canvas (`cameraFit.ts`), whatever its size. The
 * near plane follows the distance every frame, so a close-up never clips the structure and the
 * full-body view keeps its depth precision.
 */
function CameraDirector() {
  const controls = useRef<CameraControls>(null);
  const target = useViewerStore((s) => s.cameraTarget);
  const preset = useViewerStore((s) => s.cameraPreset);

  useEffect(() => {
    const eye = PRESET_EYES.anterior;
    void controls.current?.setLookAt(eye.x, eye.y, eye.z, CENTER.x, CENTER.y, CENTER.z, false);
  }, []);

  useEffect(() => {
    const c = controls.current;
    if (!target || !c) return;
    const camera = c.camera as PerspectiveCamera;
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const forward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const extents = viewExtents(
      target.min,
      target.max,
      right.toArray(),
      up.toArray(),
      forward.toArray(),
    );
    const distance = fitDistance(extents, { fovDeg: camera.fov, aspect: camera.aspect });
    const center = new Box3(new Vector3(...target.min), new Vector3(...target.max)).getCenter(
      new Vector3(),
    );
    const eye = center.clone().addScaledVector(forward, -distance);
    void c.setLookAt(eye.x, eye.y, eye.z, center.x, center.y, center.z, true);
  }, [target]);

  useEffect(() => {
    if (!preset || !controls.current) return;
    const eye = PRESET_EYES[preset.name];
    void controls.current.setLookAt(eye.x, eye.y, eye.z, CENTER.x, CENTER.y, CENTER.z, true);
  }, [preset]);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const camera = c.camera as PerspectiveCamera;
    const near = nearFor(c.distance);
    // Only touch the projection when the change matters (more than 10 %).
    if (Math.abs(camera.near - near) > near * 0.1) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
    />
  );
}

/** The plane the clipping director builds; `null` while the cut is off. */
function cuttingPlane(clipping: ClippingState): Plane | null {
  if (!clipping.enabled) return null;
  const i = { x: 0, y: 1, z: 2 }[clipping.axis];
  const at = BODY_BOUNDS.min[i] + clipping.offset * (BODY_BOUNDS.max[i] - BODY_BOUNDS.min[i]);
  const normal = new Vector3();
  normal.setComponent(i, clipping.flip ? 1 : -1);
  // Keeps the half-space where dot(normal, p) + constant >= 0.
  return new Plane(normal, -normal.getComponent(i) * at);
}

/** Turns the store's cutting plane into a three.js clipping plane shared by all materials. */
function ClippingDirector() {
  const clipping = useViewerStore((s) => s.clipping);

  useEffect(() => {
    const plane = cuttingPlane(clipping);
    setClippingPlanes(plane ? [plane] : []);
  }, [clipping]);

  useEffect(() => () => setClippingPlanes([]), []);
  return null;
}

export interface SightReport {
  meshId: string | null;
  sight: Sight;
}

const SIGHT_INTERVAL_MS = 250;
/** Rays per measure, aimed at vertices of the selection spread evenly over its meshes. */
const SAMPLE_COUNT = 12;

/**
 * Points on the selection's surface (world space) to aim the rays at. Points inside the bounds
 * would miss thin or branching structures (a coronary artery fills a few % of its box);
 * vertices are on the geometry by definition. Vertices on the cut-away side are skipped.
 */
function surfaceSamples(meshes: readonly Mesh[], plane: Plane | null, scratch: Vector3) {
  const total = meshes.reduce((n, m) => n + m.geometry.attributes.position.count, 0);
  const step = Math.max(1, Math.floor(total / SAMPLE_COUNT));
  const points: Vector3[] = [];
  let offset = 0;
  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position;
    for (let i = (step - (offset % step)) % step; i < position.count; i += step) {
      scratch.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      if (!plane || plane.distanceToPoint(scratch) >= 0) points.push(scratch.clone());
      if (points.length >= SAMPLE_COUNT) return points;
    }
    offset += position.count;
  }
  return points;
}

function sightTools() {
  const raycaster = new Raycaster();
  raycaster.firstHitOnly = true;
  return {
    raycaster,
    frustum: new Frustum(),
    matrix: new Matrix4(),
    lastCamera: new Matrix4(),
    box: new Box3(),
    sample: new Vector3(),
    dir: new Vector3(),
  };
}

/**
 * Measures whether the selection can be seen from the camera: cut away, outside the frustum,
 * or behind opaque structures (twelve BVH rays at vertices of its surface; translucent and
 * ghosted structures do not occlude, hits on the cut-away side do not count). It runs only
 * when the camera has come to rest or the view state changed, at most every 250 ms, never per
 * frame while orbiting. Development builds publish the cost on `data-atlas-sight`.
 */
function SightProbe({ onSight }: { onSight: (report: SightReport) => void }) {
  const camera = useThree((s) => s.camera);
  // Scratch objects reused by every measure, so a measure allocates almost nothing.
  const toolsRef = useRef<ReturnType<typeof sightTools> | null>(null);
  const memo = useRef({ at: 0, deps: [] as unknown[], pending: true, reported: '' });

  useFrame(() => {
    const tools = (toolsRef.current ??= sightTools());
    const m = memo.current;
    const now = performance.now();
    if (now - m.at < SIGHT_INTERVAL_MS) return;
    m.at = now;

    const st = useViewerStore.getState();
    const report = (sight: Sight) => {
      const key = `${st.selected}|${sight}`;
      if (key === m.reported) return;
      m.reported = key;
      onSight({ meshId: st.selected, sight });
    };
    if (!st.selected) {
      m.pending = true;
      report('unknown');
      return;
    }

    // Wait for the camera to rest: measuring mid-transition is wasted work.
    const moved = !tools.lastCamera.equals(camera.matrixWorld);
    tools.lastCamera.copy(camera.matrixWorld);
    const deps = [
      st.selected,
      st.hidden,
      st.hiddenSubsystems,
      st.isolated,
      st.transparent,
      st.translucentSystems,
      st.visibleSystems,
      st.zones,
      st.side,
      st.dimOthers,
      st.clipping,
      registry.size,
    ];
    const depsChanged = deps.some((d, i) => d !== m.deps[i]);
    m.deps = deps;
    if (moved || depsChanged) {
      m.pending = true;
      return;
    }
    if (!m.pending) return;
    m.pending = false;

    const started = performance.now();
    const selected = st.selected;
    const entry = registry.get(selected);
    if (!entry || !isShown(entry)) {
      report('unknown');
      return;
    }
    const box = ownBounds(entry, tools.box);
    if (box.isEmpty()) {
      report('unknown');
      return;
    }
    if (clippedAway({ min: box.min.toArray(), max: box.max.toArray() }, st.clipping, BODY)) {
      report('clipped');
      return;
    }
    tools.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    tools.frustum.setFromProjectionMatrix(tools.matrix);
    if (!tools.frustum.intersectsBox(box)) {
      report('out-of-view');
      return;
    }

    // Occluders: visible structures drawn opaque. The selection is always a candidate.
    const candidates: Mesh[] = [...entry.meshes];
    for (const other of registry.values()) {
      if (other === entry) continue;
      for (const mesh of other.meshes) {
        if (mesh.visible && !(mesh.material as Material).transparent) candidates.push(mesh);
      }
    }
    const plane = cuttingPlane(st.clipping);
    const samples = surfaceSamples(entry.meshes, plane, tools.sample);
    // Rays stop just short of the sample so the sample's own surface is not counted as an
    // occluder; hits on the selection anywhere along the ray count as seeing it.
    const firstHits = samples.map((point) => {
      tools.dir.subVectors(point, camera.position);
      const distance = tools.dir.length();
      tools.raycaster.set(camera.position, tools.dir.normalize());
      tools.raycaster.near = (camera as PerspectiveCamera).near;
      tools.raycaster.far = distance * 1.001;
      const hits = tools.raycaster.intersectObjects(candidates, false);
      const first = hits.find((h) => !plane || plane.distanceToPoint(h.point) >= 0);
      if (!first) return null;
      const id = resolveMeshId(first.object);
      return id === selected || first.distance < distance * 0.999 ? id : null;
    });
    const sight = occlusionVerdict(firstHits, selected);
    report(sight);
    if (process.env.NODE_ENV === 'development') {
      document.body.dataset.atlasSight = JSON.stringify({
        meshId: selected,
        sight,
        rays: samples.length,
        candidates: candidates.length,
        ms: +(performance.now() - started).toFixed(2),
      });
    }
  });
  return null;
}

/**
 * Development only. Publishes renderer counters, frame time and camera position every 500 ms
 * on `document.body.dataset.atlasStats`, so they can be read from devtools or automation
 * (page globals are not reachable from isolated scripting contexts).
 */
function DevProbe() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const acc = useRef({ frames: 0, ms: 0, published: 0 });

  useFrame((_, delta) => {
    const a = acc.current;
    a.frames += 1;
    a.ms += delta * 1000;
    const now = performance.now();
    if (now - a.published < 500) return;
    let meshes = 0;
    let withBvh = 0;
    let translucent = 0;
    const materialNames = new Map<string, boolean>();
    scene.traverse((o) => {
      const mesh = o as {
        geometry?: { boundsTree?: unknown };
        material?: { name?: string; transparent?: boolean };
      };
      if (!mesh.geometry) return;
      meshes += 1;
      if (mesh.geometry.boundsTree) withBvh += 1;
      if (mesh.material?.transparent) translucent += 1;
      if (mesh.material?.name) materialNames.set(mesh.material.name, !!mesh.material.transparent);
    });
    document.body.dataset.atlasStats = JSON.stringify({
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      frameMs: +(a.ms / a.frames).toFixed(2),
      meshes,
      withBvh,
      translucent,
      materials: [...materialNames].map(([n, t]) => (t ? `${n}*` : n)),
      dpr: gl.getPixelRatio(),
      camera: camera.position.toArray().map((v) => +v.toFixed(2)),
      near: +(camera as PerspectiveCamera).near.toFixed(4),
    });
    a.frames = 0;
    a.ms = 0;
    a.published = now;
  });
  return null;
}

export function AnatomyViewer({ bundles }: { bundles: AssetBundle[] }) {
  const visibleSystems = useViewerStore((s) => s.visibleSystems);
  const select = useViewerStore((s) => s.select);
  const active = bundles.filter((b) => visibleSystems.has(b.system));
  const facts = useMemo(() => indexMeshFacts(bundles), [bundles]);
  const [sight, setSight] = useState<SightReport>({ meshId: null, sight: 'unknown' });
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: PRESET_EYES.anterior.toArray(), fov: 35, near: 0.05, far: 50 }}
        gl={{ antialias: true, powerPreference: 'high-performance', localClippingEnabled: true }}
        onPointerMissed={() => select(null)}
        className="h-full w-full"
      >
        <color attach="background" args={['#0a0a0a']} />
        <hemisphereLight args={['#e8eef7', '#30271f', 1.1]} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.6} />
        <directionalLight position={[-3, 1.5, -2]} intensity={0.5} />
        {active.map((bundle) => (
          <Suspense key={bundle.id} fallback={null}>
            <SystemLayer bundle={bundle} />
          </Suspense>
        ))}
        <CameraDirector />
        <ClippingDirector />
        <SightProbe onSight={setSight} />
        {isDev ? <DevProbe /> : null}
        {isDev ? <StatsGl className="stats" /> : null}
      </Canvas>
      <SelectionCue facts={facts} sight={sight} />
    </>
  );
}

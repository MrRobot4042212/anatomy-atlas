'use client';

import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, StatsGl } from '@react-three/drei';
import { Box3, Plane, Vector3 } from 'three';
import type { AssetBundle } from '@atlas/shared';
import { setClippingPlanes } from './materials';
import { SystemLayer } from './SystemLayer';
import { useViewerStore, type CameraPreset } from './store';

// The model's frame (ADR 0004): metres, Y up, floor between the feet at the origin, 1.7 m tall,
// facing +Z. Rendered at the origin so API bounds and world bounds coincide.
export const BODY_BOUNDS = {
  min: [-0.34, 0.0, -0.12] as const,
  max: [0.34, 1.71, 0.14] as const,
};
const CENTER = new Vector3(0, 0.88, 0);
const DISTANCE = 3.2;
const PRESET_EYES: Record<CameraPreset, Vector3> = {
  anterior: new Vector3(0, CENTER.y, DISTANCE),
  posterior: new Vector3(0, CENTER.y, -DISTANCE),
  left: new Vector3(DISTANCE, CENTER.y, 0), // subject's left is +X
  right: new Vector3(-DISTANCE, CENTER.y, 0),
  superior: new Vector3(0, CENTER.y + DISTANCE, 0.001),
};

/** Frames `cameraTarget` and applies camera presets; the only consumer of those slices. */
function CameraDirector() {
  const controls = useRef<CameraControls>(null);
  const target = useViewerStore((s) => s.cameraTarget);
  const preset = useViewerStore((s) => s.cameraPreset);

  useEffect(() => {
    const eye = PRESET_EYES.anterior;
    void controls.current?.setLookAt(eye.x, eye.y, eye.z, CENTER.x, CENTER.y, CENTER.z, false);
  }, []);

  useEffect(() => {
    if (!target || !controls.current) return;
    const box = new Box3(new Vector3(...target.min), new Vector3(...target.max));
    void controls.current.fitToBox(box, true, {
      paddingTop: 0.15,
      paddingBottom: 0.15,
      paddingLeft: 0.15,
      paddingRight: 0.15,
    });
  }, [target]);

  useEffect(() => {
    if (!preset || !controls.current) return;
    const eye = PRESET_EYES[preset.name];
    void controls.current.setLookAt(eye.x, eye.y, eye.z, CENTER.x, CENTER.y, CENTER.z, true);
  }, [preset]);

  return <CameraControls ref={controls} makeDefault minDistance={0.05} maxDistance={8} />;
}

/** Turns the store's cutting plane into a three.js clipping plane shared by all materials. */
function ClippingDirector() {
  const clipping = useViewerStore((s) => s.clipping);

  useEffect(() => {
    if (!clipping.enabled) {
      setClippingPlanes([]);
      return;
    }
    const i = { x: 0, y: 1, z: 2 }[clipping.axis];
    const at = BODY_BOUNDS.min[i] + clipping.offset * (BODY_BOUNDS.max[i] - BODY_BOUNDS.min[i]);
    const normal = new Vector3();
    normal.setComponent(i, clipping.flip ? 1 : -1);
    // Keeps the half-space where dot(normal, p) + constant >= 0.
    const plane = new Plane(normal, -normal.getComponent(i) * at);
    setClippingPlanes([plane]);
  }, [clipping]);

  useEffect(() => () => setClippingPlanes([]), []);
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
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: PRESET_EYES.anterior.toArray(), fov: 35, near: 0.01, far: 50 }}
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
      {isDev ? <DevProbe /> : null}
      {isDev ? <StatsGl className="stats" /> : null}
    </Canvas>
  );
}

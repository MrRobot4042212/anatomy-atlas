'use client';

import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, StatsGl } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import type { AssetBundle } from '@atlas/shared';
import { SystemLayer } from './SystemLayer';
import { useViewerStore } from './store';

// The model's frame (ADR 0004): metres, Y up, floor between the feet at the origin, 1.7 m tall.
// It is rendered at the origin so API bounds and world bounds coincide.
const INITIAL_EYE: [number, number, number] = [0, 1.0, 3.2];
const INITIAL_TARGET: [number, number, number] = [0, 0.9, 0];

/** Frames `cameraTarget` whenever it changes; the only consumer of that slice. */
function FocusController() {
  const controls = useRef<CameraControls>(null);
  const target = useViewerStore((s) => s.cameraTarget);

  useEffect(() => {
    void controls.current?.setLookAt(...INITIAL_EYE, ...INITIAL_TARGET, false);
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

  return <CameraControls ref={controls} makeDefault minDistance={0.05} maxDistance={8} />;
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
  const acc = useRef({ frames: 0, ms: 0, last: 0, published: 0 });

  useFrame((_, delta) => {
    const a = acc.current;
    a.frames += 1;
    a.ms += delta * 1000;
    const now = performance.now();
    if (now - a.published < 500) return;
    let meshes = 0;
    let withBvh = 0;
    scene.traverse((o) => {
      const geometry = (o as { geometry?: { boundsTree?: unknown } }).geometry;
      if (!geometry) return;
      meshes += 1;
      if (geometry.boundsTree) withBvh += 1;
    });
    document.body.dataset.atlasStats = JSON.stringify({
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      frameMs: +(a.ms / a.frames).toFixed(2),
      meshes,
      withBvh,
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
      camera={{ position: INITIAL_EYE, fov: 35, near: 0.01, far: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => select(null)}
      className="h-full w-full"
    >
      <color attach="background" args={['#101214']} />
      <hemisphereLight args={['#e8eef7', '#30271f', 1.1]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.6} />
      <directionalLight position={[-3, 1.5, -2]} intensity={0.5} />
      {active.map((bundle) => (
        <Suspense key={bundle.id} fallback={null}>
          <SystemLayer bundle={bundle} />
        </Suspense>
      ))}
      <FocusController />
      {isDev ? <DevProbe /> : null}
      {isDev ? <StatsGl className="stats" /> : null}
    </Canvas>
  );
}

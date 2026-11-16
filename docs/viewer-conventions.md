# Viewer conventions

Location: `apps/web/src/features/viewer/`. Entry component: `AnatomyViewer` (client component).

## Store (zustand)

One store, sliced selectors. Shape:

```ts
{
  visibleSystems: Set<BodySystem>;
  hidden: Set<string>; // meshIds
  isolated: string | null; // meshId; when set, everything else is ghosted
  transparent: Set<string>;
  selected: string | null;
  hovered: string | null;
  clipping: {
    axis: 'x' | 'y' | 'z';
    offset: number;
    enabled: boolean;
  }
  cameraTarget: [number, number, number] | null;
}
```

Actions are verbs (`toggleSystem`, `showSystem`, `toggleSubsystem`, `select`, `isolate`,
`clearIsolation`, `toggleTransparent`, `hide`, `unhideAll`, `setClipping`, `focus(bounds)`,
`preset(name)`). Components subscribe to the smallest slice they need. Never pass the whole
store as a prop.

Components (`apps/web/src/features/viewer/`): `AnatomyViewer` (Canvas, `CameraDirector`,
`ClippingDirector`, dev probe), `SystemLayer` (one per bundle), `LayerPanel` (systems and
subsystems), `HierarchyTree` (API tree per visible system), `SearchBox` (header), `InfoPanel`
(the specimen label), `ViewerToolbar` (camera presets, cutting plane, "Mostrar todo"),
`LayerSummary`. Visual rules live in `apps/web/DESIGN.md`; product truth in `apps/web/PRODUCT.md`.

Paint precedence per structure: hidden (node invisible) > selected > hovered > ghost (when
another structure is isolated) > translucent > base. Ghost and translucent materials are
`forceSinglePass`, otherwise DoubleSide transparency doubles draw calls.

## Loading

- One `<SystemLayer system="skeletal" />` per toggled system, each wrapped in `<Suspense>`.
- Bundles come from `NEXT_PUBLIC_ASSETS_URL/<bundleId>.glb`; use drei `useGLTF` with the
  meshopt decoder enabled once at app level.
- After load, traverse once: build `Map<meshId, Object3D>`, compute a BVH (`three-mesh-bvh`) per
  geometry, and register in the layer registry. No per-frame traversals.
- Subsystem toggles come from `AssetBundle.subsystems` (API groups meshIds by subsystem);
  the store keeps `hiddenSubsystems` as `<system>/<subsystem>` keys and the layer's paint pass
  applies them with per-structure `hidden`.
- A structure is a NAMED node. Left/right bones share geometry, and after meshopt quantization
  the shared mesh sits in an unnamed child under each named node. Resolve the `meshId` of a hit
  by walking up to the nearest named ancestor, never from `mesh.name`.

## Lessons that cost time (keep)

- Register structures, paint and subscribe in ONE effect whose cleanup unregisters. Registering
  in `useMemo` and cleaning in an effect leaves the registry empty after a StrictMode remount:
  hover/select still "work" (ids come from `userData`) but highlighting and focus silently stop.
- Viewer materials are keyed by the GLB material name, kept on `mesh.userData.materialKey`
  the first time a mesh is registered. On a StrictMode remount the mesh already carries one of
  our materials; keying by `mesh.material.name` then produces `Fascia/base/base`, the scene
  palette lookup misses, and per-material opacity silently disappears while colours survive.
  The dev probe lists material names (`*` = transparent) to catch exactly this.
- Highlight colours are brand decisions (`apps/web/DESIGN.md`): hover sky `#33B2FB`, selection
  magenta `#FF3CA6`. They live in `materials.ts` and in the CSS tokens `--scene-hover` /
  `--scene-selected`; change both or neither.
- Materials are `DoubleSide`. Left/right share geometry and the left instance has negative X
  scale; the renderer flips winding for it, the raycaster does not, so with `FrontSide` a ray
  passes through mirrored bones and selects what is behind. Alternative is duplicating sided
  geometry in the pipeline; revisit only if fill-rate becomes the bottleneck.
- Bounds for focus are computed on demand with `Box3.setFromObject(node)` once the scene is
  attached; the model is rendered at the origin so API bounds equal world bounds.
- Dev metrics live on `document.body.dataset.atlasStats` (draw calls, triangles, frame ms,
  BVH count, camera). Page globals are not reachable from automation contexts, DOM data is.
  Frame time is only meaningful in a focused, visible browser tab.

## Interaction

- Pointer events via R3F `onPointerOver/Out/Click` on the layer group, with BVH-accelerated
  raycast (`mesh.raycast = acceleratedRaycast`).
- Hover: emissive tint via a shared material uniform, not material cloning per mesh.
- Select: outline pass (postprocessing) on the selected mesh; the info panel reads `selected`.
- Isolate/ghost: swap to a shared transparent material; keep the original on
  `mesh.userData.baseMaterial`.
- Focus: compute bounds from the manifest or `Box3`, animate camera with drei `CameraControls`.

## Performance budget

- 60 fps with skeletal + cardiovascular on an integrated GPU.
- Baseline (2026-10-03, 1280x686, dpr 1). Skeletal alone, full body: 988 draw calls, 729k
  triangles; close-up on a leg 262 calls / 100k. Skeletal + cardiovascular, full body:
  1,664 calls, 1.47M triangles; chest close-up 537 calls / 650k. Draw calls, not triangles,
  are the first thing to cut when a real frame time is measured above budget.
  BVH build for 376 geometries: 271 ms on load. Next lever when needed: merge static
  geometry per subsystem (ribs, carpals, tarsals) to cut draw calls, keeping per-structure
  selection via geometry groups.
- Measure with drei `<StatsGl />` plus `gl.info.render` (draw calls, triangles) in dev. Report numbers when changing
  materials, lights or postprocessing.
- Do not add a postprocessing effect without numbers before and after.
- Prefer merging static geometry per subsystem when selection granularity allows it.

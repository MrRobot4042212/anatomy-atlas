# Roadmap

## Phase 1: skeletal system end to end (current)

- [x] Monorepo scaffold, tooling, Prisma schema, shared types
- [x] Asset pipeline: dump, build_mapping (TA2), Blender export, gltf-transform optimize, manifest
- [x] Skeletal bundle exported and optimized (690 meshes, 4.0 MB meshopt)
- [x] API: `PrismaModule`, seed from manifest (3,269 nodes, la/en/es names)
- [x] API: `structures` (list/search, detail with ancestors, tree) and `assets` modules
- [x] Viewer: load skeletal bundle, layer toggle, hover, select, focus, hide, info panel
- [x] Credits/attribution component

## Phase 2: cardiovascular + performance

- [x] Cardiovascular bundle (676 structures, 4.0 MB; heart, arteries, veins, pulmonary as subsystem toggles)
- [x] Baseline numbers: draw calls, triangles, bytes (see docs/viewer-conventions.md). Frame time pending on real hardware
- [ ] Draw-call reduction (merge static geometry per subsystem) if measured frame time exceeds budget
- [x] Lazy loading per system (nothing downloads until its layer is on)
- [ ] Bundle splitting by region when a bundle exceeds 25 MB

## Phase 3: exploration tools

- [ ] Search with camera focus
- [ ] Hierarchy tree navigation
- [ ] Isolate / hide / transparency
- [ ] Clipping planes
- [ ] Camera presets (anterior, posterior, lateral)

## Phase 4: remaining systems

- [ ] muscular, nervous, lymphatic, digestive, respiratory, urinary, reproductive, endocrine,
      integumentary

## Phase 5: learning features

- [ ] Auth and user accounts
- [ ] Progress tracking
- [ ] Quiz mode (identify the highlighted structure)
- [ ] Personal annotations

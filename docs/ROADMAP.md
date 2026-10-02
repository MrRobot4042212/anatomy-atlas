# Roadmap

## Phase 1: skeletal system end to end (current)

- [x] Monorepo scaffold, tooling, Prisma schema, shared types
- [x] Asset pipeline: dump, build_mapping (TA2), Blender export, gltf-transform optimize, manifest
- [x] Skeletal bundle exported and optimized (690 meshes, 4.0 MB meshopt)
- [x] API: `PrismaModule`, seed from manifest (3,269 nodes, la/en/es names)
- [ ] API: `structures` and `assets` modules
- [ ] Viewer: load skeletal bundle, layer toggle, hover, select, info panel
- [ ] Credits/attribution component

## Phase 2: cardiovascular + performance

- [ ] Cardiovascular bundle (heart, arteries, veins as subsystems)
- [ ] Performance pass with numbers: draw calls, frame time, bytes over the wire
- [ ] Lazy loading per system, bundle splitting by region when needed

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

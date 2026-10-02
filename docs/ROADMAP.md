# Roadmap

## Phase 1: skeletal system end to end (current)

- [x] Monorepo scaffold, tooling, Prisma schema, shared types
- [ ] Asset pipeline: Blender export script, gltf-transform optimize, manifest
- [ ] Skeletal bundle exported and optimized (< 25 MB)
- [ ] API: `PrismaModule`, `structures` and `assets` modules, seed from manifest
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

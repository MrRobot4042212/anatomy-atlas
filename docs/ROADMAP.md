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
- [x] Baseline numbers: draw calls, triangles, bytes (see viewer skill). Frame time pending on real hardware
- [ ] Draw-call reduction (merge static geometry per subsystem) if measured frame time exceeds budget
- [x] Lazy loading per system (nothing downloads until its layer is on)
- [ ] Bundle splitting by region when a bundle exceeds 25 MB

## Phase 3: exploration tools

- [x] Search with camera focus (accent-insensitive, keyboard driven, turns the layer on)
- [x] Hierarchy tree navigation (per visible system, loose structures under "Sin agrupar")
- [x] Isolate / hide / translucent, with "Mostrar todo"
- [x] Cutting plane: sagittal / axial / coronal, position, invert
- [x] Camera presets (anterior, posterior, lateral izq./der., superior)

## Phase 3b: identity (done 2026-10-03)

- [x] Wazo Anatomy visual world on the WAZO brand system (logo, isotype, colours, gradients),
      EB Garamond italic for Latin, Geist Mono for data, specimen label with caliper. See `apps/web/DESIGN.md`.
- [x] UI typeface: Albert Sans as the open stand-in for BR Sonoma (`apps/web/src/fonts/README.md`)
- [x] Licence audit and quarantine of non-commercial meshes (ADR 0005, 2026-11-16)
- [ ] Replace the 8 quarantined meshes (kidneys, renal pelvis, cochlea, vestibule) with BodyParts3D CC BY 4.0 or commissioned work
- [x] Editorial Spanish names for all 1,959 terms, drafted and cross-reviewed (status draft)
- [ ] Human anatomist review of `editorial/names.es.json` (flip status to reviewed; 267 flagged first)
- [ ] Triage `editorial/source-issues.json` (144 data errors in Latin, English and hierarchy)
- [ ] Descriptions per structure (source to be decided: Wikipedia extracts as Z-Anatomy does)
- [ ] Language switch for the UI (es/en)

## Phase 4: remaining systems (done 2026-10-03)

- [x] muscular (6.5 MB), nervous (4.5 MB), lymphatic (0.5), digestive (1.3), respiratory (0.9),
      urinary, reproductive, endocrine, integumentary (0.1 to 0.2 each). 11 bundles, 22.1 MB,
      2,903 structures with geometry. All layers on: 3,584 draw calls, 4.4M triangles.
- [ ] Draw-call reduction (merge static geometry per subsystem) once frame time is measured
      on the target laptop; with every layer on this is the first thing that will hurt.
- [ ] Spanish names for the subsystem groups that TA2 does not translate (e.g. "Arthrology")

## Phase 5: learning features

- [ ] Auth and user accounts
- [ ] Progress tracking
- [ ] Quiz mode (identify the highlighted structure)
- [ ] Personal annotations

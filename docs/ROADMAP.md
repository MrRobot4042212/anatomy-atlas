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
- [ ] Draw-call reduction (merge static geometry per subsystem) if measured frame time exceeds budget.
      Measured 2026-11-16, see `docs/PERFORMANCE.md`: 1,664 calls for skeletal + cardiovascular and 3,532
      with all layers, one call per mesh. Holds the 72 Hz display cap on a discrete GPU, so the integrated-GPU
      target is still unverified
- [ ] Find the cause of the 0.2 to 2.5 s main-thread stalls in the first seconds after load (production build, trace)
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
- [x] Kidneys restored from BodyParts3D CC BY 4.0 (the blend's kidney was that mesh)
- [x] Renal pelvis, cochlea and vestibule (with semicircular canals) authored as parametric models
- [x] Auditory ossicles quarantined (probably from the NC Dundee model) and authored as parametric models
- [ ] Anatomist validation of the authored models (cochlea, vestibule, renal pelvis, ossicles)
- [x] Editorial Spanish names for all 1,959 terms, drafted and cross-reviewed (status draft)
- [ ] Human anatomist review of `editorial/names.es.json` (flip status to reviewed; 267 flagged first)
- [x] Source-data errors fixed through `editorial/corrections.json` (137 of 144; 4 declined, 3 deferred)
- [x] Corrected Latin names checked against the official TA2 (73 confirmed, 69 unverifiable, 3 deliberate deviations)
- [x] Eyelid tarsal plates moved to the accessory visual structures of the eye
- [ ] Identify the two unnamed model objects on the mesh (hypotheses in `docs/review/README.md`)
- [ ] Fix the three TA2 id mismatches in the id mapping (`editorial/source-issues.json`)
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

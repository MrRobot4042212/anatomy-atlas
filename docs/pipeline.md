# Asset pipeline

Goal: Z-Anatomy `Startup.blend` -> one optimized GLB per body system -> `manifest.json` -> DB seed.
Everything lives in `tools/asset-pipeline/`. `raw/` and `out/` are git-ignored. Decisions: ADR 0004.

Blender 5.x is required. Set `BLENDER` to its executable (the Blender on `PATH` may be too old).
Run every command from `tools/asset-pipeline/`.

## Contract

1. Mesh name inside a GLB == `meshId` == `<termKey with '-'>[-l|-r]`, e.g. `ta2-4231-r`,
   `za-adductor-minimus-l`. `termKey` is `ta2:<id>` (TA2.csv, matched by English name) or
   `za:<slug>` for unofficial names Z-Anatomy writes in parentheses.
2. `out/mapping.json` is the single source of truth (objects -> keys, names la/en/es, system,
   subsystem, region, laterality, parentKey). It is generated, never hand-edited. Fix the rules in
   `scripts/build_mapping.py` and regenerate.
3. One bundle per `BodySystem`; split by region when a bundle exceeds 25 MB compressed and name
   it `<system>-<region>-v<N>.glb`. Bundle ids must start with the system name.
4. Frame: metres, Y up after export, origin at the floor between the feet (as in the .blend,
   1.79 m tall). All bundles share it so layers overlay exactly.
5. Excluded from export: labels (`.j .t .st .g`), bone-landmark indicator lines (`.i`),
   muscle insertion areas (`.o* .e*`), reference planes/lines, region surfaces.

## Steps

```bash
B="$BLENDER"
BLEND=raw/z-anatomy/Z-Anatomy/Startup.blend
"$B" -b $BLEND -P blender/dump_objects.py -- --json out/objects.json   # ~40 s, once per blend
python scripts/build_mapping.py                                          # -> out/mapping.json
pnpm bundle --system skeletal                                            # export + optimize with the system preset
pnpm bundle --system cardiovascular                                      # -> out/<system>-v1.glb
pnpm manifest                                                            # -> out/manifest.json
pnpm --filter api db:seed                                                # from repo root
cp out/*-v1.glb ../../apps/web/public/models/                            # local dev fallback
```

`pnpm bundle` wraps `blender/export_system.py` + `optimize.ts` with the presets in
`src/bundle.ts` (simplify ratio, curve `resolution_u`, `bevel_resolution`). Change a preset
there, never by hand on the command line, so every bundle is reproducible. `pnpm inspect
<glb>` prints nodes, triangles (unique and drawn) and heaviest meshes.

- `inspect_blend.py` prints the collection tree and naming stats; `scripts/analyze_dump.py`
  reports TA2 name coverage per system. Use them before changing mapping rules.
- `optimize.ts` refuses meshes whose name is not a valid meshId; `manifest.ts` refuses meshes
  that are not in the mapping. Both failures mean the export or the mapping is wrong, not the
  checker.
- Curves (vessels, nerves) are tessellated by Blender at export. Source settings
  (resolution_u 12, bevel_resolution 4) give 3.8M drawn triangles for the cardiovascular
  system; `u6/b2` gives 1.41M with clean topology, and simplify 0.5 on top gives 744k at 4.0 MB
  with tubes that still read as round in close-up. Lower the resolution at the source first,
  simplify second: simplification of 12x4 tubes to 0.35 produced 1.38M triangles for the same
  bytes.
- Report GLB bytes before/after and drawn triangles (`pnpm inspect`) in the PR.

## Body zones

After the bundles are built and before the manifest, run `python scripts/build_zones.py` and
`python scripts/check_zones.py`. They give every mesh exactly one zone (head, neck, thorax, abdomen,
pelvis, back, shoulder, arm, forearm, hand, thigh, leg, foot) from its bounding box against landmark
heights taken from named bones. The manifest carries the zones index per bundle and the viewer's region
filter uses it. Order after any model change: build_mapping, bundle, build_zones, manifest, seed.

## Facts about the source (measured 2026-10-03)

- 4,569 meshes, 951 bevelled curves (vessels, nerves), 2.1 M vertices, metric units.
- Hierarchy (11 levels) lives only in `Bonus collection`; the numbered collections are flat.
  One object is linked in several sub-collections; the deepest path within its own system is
  the parent, `Regions of human body > Main divisions > ...` paths give the region.
- Name coverage against TA2.csv is 87-100 % per system; the rest get `za:` keys.
- Z-Anatomy keeps modelling helpers next to structures (`*-curve`, `*-path`, `*-profile`,
  `BezierCircle`, eyeball axes); `build_mapping.py` drops them (`HELPER_RE`). If a bundle
  reports structures "with meshId but not in a bundle", it is almost always one of these.
- Blender 5.2 may crash on exit after a successful export; `pnpm bundle` tolerates it when the
  raw file was written in the run.
- The seed deletes rows that left the manifest, so re-running the pipeline never leaves ghosts.
- Attribution: Z-Anatomy and BodyParts3D are CC BY-SA. The credits component must stay visible.
- Source errors: fix them in `editorial/corrections.json` (name substitutions, hierarchy moves),
  never in `TA2.csv` or the blend. The builder fails if a correction no longer applies. keys,
  meshIds and TA2 ids never change, even when the name contains a typo.
- Spanish names: only from `editorial/names.es.json` (status draft or reviewed). The Spanish
  column of TA2.csv is never read. A term missing from that file makes `build_mapping.py` fail.
- BodyParts3D re-sourcing: `sources/bodyparts3d/replacements.json` lists quarantined objects whose
  geometry is rebuilt from the original OBJ (`source: "bodyparts3d:<element>"` in the mapping).
  After adding one, run `scripts/register_bodyparts3d.py`, `build_mapping.py`, then `pnpm bundle`.
- Authored models: `sources/authored/models.json` maps quarantined objects to generators
  (`source: "authored:<generator>"`). Run `python scripts/check_authored.py` after editing a
  generator, then `build_mapping.py` and `pnpm bundle`. Generators work in a lateral, anterior,
  superior frame; `build.py` mirrors the left side and fixes the winding.
- Licence quarantine: `licensing/quarantine.json` objects get `hasGeometry: false` and
  `excluded: "license:<source>"` in the mapping, so they are never exported. `manifest.ts` fails
  on a bundle that still carries one: rebuild that system with `pnpm bundle`. Never add NC-origin
  meshes back; see ADR 0005.

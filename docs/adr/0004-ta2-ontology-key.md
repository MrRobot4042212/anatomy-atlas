# ADR 0004: TA2 as the ontology key, hierarchy from the Z-Anatomy collection tree

Date: 2026-10-03
Status: accepted. Supersedes the FMA id contract in ADR 0001 and ADR 0003.

## Context

Inspection of the Z-Anatomy `Startup.blend` (307 MB, 4,569 meshes, 951 bevelled curves, 2.1 M
vertices, metric units, 1.79 m tall) showed:

- Objects carry no FMA id. They are named with English Terminologia Anatomica 2 (TA2) terms plus
  suffixes: `.l`/`.r` laterality, `.g` group mesh, `.j`/`.t`/`.st` label lines and texts,
  `.i` bone-landmark indicator lines, `.o*`/`.e*` muscle origin/insertion areas.
- `TA2.csv` (7,314 rows) maps a numeric TA2 id to English, Latin, Spanish, French, Portuguese,
  Italian and Farsi names. English names in the file are unique.
- Matching cleaned object names to the English column covers 87-100 % per system. The rest are
  unofficial names written in parentheses, e.g. `(Adductor minimus)`, which TA2 does not list.
- The flat numbered collections (`1: Skeletal system` ...) carry no hierarchy. The full
  11-level hierarchy lives in `Bonus collection`, where one object is linked into several
  sub-collections (taxonomic parents plus `Regions of human body > Main divisions > ...`).
- Vessels and nerves are Blender curves with bevel; the glTF exporter converts them to meshes.

Mapping to FMA would require an external TA2-to-FMA crosswalk with partial coverage and would
add nothing the product needs in phase 1.

## Decision

1. **Term key.** A structure's key is its TA2 id (`ta2:4231`). Unofficial names get a stable
   local key derived from the normalized English name (`za:adductor-minimus`). FMA stays an
   optional column for a later crosswalk.
2. **Mesh id and mesh name.** One row and one GLB mesh per sided object:
   `meshId = <term key without colon>[-l|-r]`, e.g. `ta2-4231-r`, `za-adductor-minimus-l`.
   The mesh name inside the GLB is the `meshId`. This replaces the FMA id in the pipeline
   contract, the Prisma schema and `@atlas/shared`.
3. **Hierarchy.** The parent of a structure is the deepest sub-collection of its own system
   inside `Bonus collection`. Group nodes (collections, `.g` meshes) become rows with no
   geometry, so the tree is navigable even where only leaves have meshes.
4. **Region.** Derived from the `Regions of human body > Main divisions` paths and mapped to
   `BodyRegion`; nullable when no region path exists.
5. **Excluded from export.** Label objects (`.j`, `.t`, `.st`, `.i`), reference planes and
   lines, and muscle insertion areas (`.o*`/`.e*`), which are deferred to a later
   "attachments" feature.
6. **System mapping.** Z-Anatomy's nine top groups map onto `BodySystem`: Joints fold into
   `skeletal` with subsystem `joints`; `Visceral systems` splits into digestive, respiratory,
   urinary, reproductive and endocrine using its sub-collections; `Regions of human body` is
   not a system and only feeds the region field.

## Consequences

- Names in three languages come from `TA2.csv` for free; descriptions still need a source
  (Wikipedia extracts, as Z-Anatomy itself does) and are a separate task.
- `tools/asset-pipeline` gains a deterministic `build_mapping` step that turns
  `objects.json` + `TA2.csv` into `out/mapping.json`; export, manifest and seed all read it.
- The UI must still credit Z-Anatomy and BodyParts3D (CC BY-SA).

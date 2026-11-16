# ADR 0005: Model and nomenclature licensing policy

Date: 2026-11-16
Status: accepted, with open items listed below

## Context

Wazo Anatomy will be embedded in WAZO's commercial learning platform, so every asset is used
commercially. An audit on 2026-11-16 found:

- All npm dependencies are permissive (MIT, ISC, Apache 2.0, BSD, MPL 2.0 as tooling only).
- Z-Anatomy is CC BY-SA 4.0 as a project, but its attributions list two components under
  non-commercial licences: "Anatomy of the Inner Ear" (University of Dundee, CC BY-NC-SA 4.0)
  and "Kidney" (Lissie Cowley, CC BY-NC 4.0). The .blend does not tag which objects come from
  them.
- BodyParts3D, the upstream of most meshes, was relicensed to CC BY 4.0 by DBCLS on 2025-02-27.
  Its README still links the previous BY-SA 2.1 JP deed.
- Terminologia Anatomica 2 (FIPAT/IFAA) is CC BY-ND 4.0. A translation is a derivative.

## Decision

1. **No non-commercial geometry ships.** `tools/asset-pipeline/licensing/quarantine.json` lists
   the Blender objects that probably derive from the two NC components: Kidney, Renal pelvis,
   Cochlea and Vestibule, both sides (8 meshes). `build_mapping.py` keeps their catalog row and
   removes their geometry (`excluded: "license:<source>"`). `manifest.ts` fails if a bundle still
   carries one. The list is conservative because upstream gives no per-object provenance.
   A quarantined object can be re-sourced from BodyParts3D 4.0 (CC BY 4.0) through
   `sources/bodyparts3d/replacements.json`: the exporter then builds the mesh from the original
   OBJ, placed with the transform from `scripts/register_bodyparts3d.py`.
   - **Kidneys restored (2026-11-16).** Z-Anatomy's Kidney.l and Kidney.r turned out to be the
     BodyParts3D meshes (1,163 and 1,497 vs 1,163 and 1,493 vertices, extents within 0.8 mm), so
     the kidneys now come straight from FJ3147 and FJ3145. Placement uses the Z-Anatomy twin's
     position, which the renal vessels and ureters of that body were attached to.
   - **Still excluded:** renal pelvis, cochlea and vestibule. BodyParts3D 4.0 has no such parts
     (checked against its official part lists, which also lack the auditory ossicles).
2. **Models are published under CC BY-SA 4.0 with the attribution Z-Anatomy requires**, in the
   viewer footer and in the full notice at `/licencias`. Application code, API, content and brand
   are not part of the model licence.
3. **Nomenclature.** Latin and English terms come from TA2 unaltered and are cited. Spanish names
   are our own editorial work in `tools/asset-pipeline/editorial/names.es.json`, written from the
   Latin and English without consulting any existing Spanish list. `build_mapping.py` no longer
   reads the Spanish column of `TA2.csv`. Each name has a status: `draft` (drafted and cross-checked in two passes, not reviewed by a human anatomist) or `reviewed` (approved by a human anatomist).
   `--es-min-status reviewed` builds the catalog with only human-approved names. The style
   guide and editorial decisions are in `editorial/STYLE.md`.
4. **No Wikipedia text is stored.** Z-Anatomy definitions are CC BY-SA 3.0 and are not loaded.
   Structure descriptions will be written for this product.

## Consequences

- The nervous layer has no cochlea or vestibule, and the urinary layer no renal pelvis, until a
  replacement exists. The structures still appear in the tree, search and info panel.
- The BodyParts3D archive used is `partof_BP3D_4.0_obj_99.zip` (62 MB, git-ignored under
  `tools/asset-pipeline/raw/bodyparts3d/`). Attribution: "BodyParts3D, © The Database Center for
  Life Science licensed under CC Attribution 4.0 International", shown at `/licencias`.
- Not quarantined but unverified: auditory ossicles, intrarenal vessels, ureters. Their origin
  inside the blend is unknown. Re-check when the blend is updated or when provenance is known.
- Metrics after the change: 2,906 structures with geometry (was 2,912).

## Open items

- Replace the 6 meshes still excluded (renal pelvis, cochlea, vestibule, both sides). BodyParts3D
  does not have them, so the options are commissioned work with assignment of rights or a
  parametric model built from published dimensions.
- A human anatomist must review `names.es.json` (1,959 terms; 267 flagged medium or low
  confidence, each with a note) and flip `status` to `reviewed`. Until then every name is `draft`.
- Fix the source-data errors found by the review (`editorial/source-issues.json`, 144 items:
  Latin typos, wrong parents, English slips). They come from the Z-Anatomy .blend and TA2.csv.
- Legal confirmation that (a) the 2025 BodyParts3D relicensing covers the 2013 data, (b) glTF
  bundles loaded at runtime do not extend ShareAlike to application code, (c) editorial Spanish
  names written independently are not a derivative of the FIPAT translation.
- Copyright holder of the application code (owner or WAZO) to be settled in writing.

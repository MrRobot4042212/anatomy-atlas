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
   - **Authored instead:** renal pelvis, cochlea and vestibule. BodyParts3D 4.0 has no such
     parts (checked against its official part lists, which also lack the auditory ossicles), so
     they are original parametric models in `tools/asset-pipeline/sources/authored/`, built
     from published adult dimensions and oriented in the body from the structure's position in
     the Z-Anatomy body (a measurement, not geometry). The vestibule mesh includes the three
     osseous semicircular canals, as the Z-Anatomy one did. Left is the exact mirror of right.
     `scripts/check_authored.py` verifies closed surfaces, outward normals and plausible sizes.
     They are WAZO's own work, not derived from any third-party mesh.
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

- The authored shapes are teaching approximations, not scans. The renal pelvis sits inside the
  kidney and shows only with the translucent or cutting-plane tools.
- The BodyParts3D archive used is `partof_BP3D_4.0_obj_99.zip` (62 MB, git-ignored under
  `tools/asset-pipeline/raw/bodyparts3d/`). Attribution: "BodyParts3D, © The Database Center for
  Life Science licensed under CC Attribution 4.0 International", shown at `/licencias`.
- **Auditory ossicles (2026-11-16).** Research found that the Dundee "Anatomy of the Inner Ear"
  model credited by Z-Anatomy also contains the ossicles (and derives from the McGill 3D ear,
  CC BY-NC-SA 2.5 Canada), and BodyParts3D has none. No source maps the blend's Malleus, Incus
  and Stapes to it, so this rests on elimination (about 60% confidence), but a wrong guess
  costs a licence breach and a right one costs three small meshes. They are quarantined and
  authored like the inner ear (`ossicles.py`: malleus with head, neck, handle and processes;
  incus with body, short and long process and lenticular process; stapes with head, crura and
  footplate; 6 meshes). The open alternative is the OpenEar library (CC BY 4.0, Sieber et al.
  2019), but it is 59 GB; a single specimen would be 4 to 14 GB, not worth it for three bones.
- Not quarantined but unverified: intrarenal vessels and ureters. Their origin inside the blend
  is unknown. Re-check when the blend is updated or when provenance is known.
- Metrics after the change: 2,912 structures with geometry, as before the audit.

## Open items

- An anatomist must validate the authored models: cochlear spiral sense (`HANDEDNESS` in
  `inner_ear.py`), canal planes, calyx layout and the three ossicles. Commissioned work with assignment of rights can
  replace them later without changing any meshId.
- A human anatomist must review `names.es.json` (1,959 terms; 267 flagged medium or low
  confidence, each with a note) and flip `status` to `reviewed`. Until then every name is `draft`.
- Source-data errors found by the review (`editorial/source-issues.json`, 144 items): 137 fixed
  in `editorial/corrections.json` (299 name edits over 161 terms, 23 hierarchy moves, applied
  strictly by `build_mapping.py`), 4 declined as not errors (Latin part vs English head, an
  unverifiable bundle name, a short term id) and 2 deferred (two objects unnamed in the source
  model carry descriptive placeholder names; geometric analysis suggests the small cardiac vein
  for one and cannot decide the other). The eyelid tarsal plates were moved to the accessory
  visual structures of the eye (nervous, sense organs), as TA2 classes them.
- **TA2 verification (2026-11-16).** The 145 corrected Latin names were checked against the full
  official TA2 text (`editorial/ta2-verification.json`): 73 confirmed, 69 unverifiable (TA2 has
  no entry for numbered instances such as single ribs, fingers and teeth, and none above its id
  7113), 3 deliberate deviations kept (two TA2 misprints and one name TA2 does not have). The
  check also caught a fix that was wrong (pudendalis was right) and eight that were not the
  official form; all are now the official text. Three source ids do not match TA2 (the name is
  the entry of the previous id); the keys stay, the mapping is listed as an open source issue.
- Legal confirmation that (a) the 2025 BodyParts3D relicensing covers the 2013 data, (b) glTF
  bundles loaded at runtime do not extend ShareAlike to application code, (c) editorial Spanish
  names written independently are not a derivative of the FIPAT translation.
- Copyright holder of the application code (owner or WAZO) to be settled in writing.

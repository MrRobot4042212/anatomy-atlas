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
2. **Models are published under CC BY-SA 4.0 with the attribution Z-Anatomy requires**, in the
   viewer footer and in the full notice at `/licencias`. Application code, API, content and brand
   are not part of the model licence.
3. **Nomenclature.** Latin and English terms come from TA2 unaltered and are cited. Spanish names
   currently come from Z-Anatomy's `TA2.csv` translation and are a derivative of TA2; they stay
   until replaced by editorial Spanish names written and reviewed by an anatomist.
4. **No Wikipedia text is stored.** Z-Anatomy definitions are CC BY-SA 3.0 and are not loaded.
   Structure descriptions will be written for this product.

## Consequences

- The urinary layer has no kidneys and the nervous layer has no cochlea or vestibule until a
  replacement exists. The structures still appear in the tree, search and info panel.
- Replacement source: BodyParts3D 4.0 OBJ (CC BY 4.0). It needs a mapping from FMA ids to TA2
  keys, keeping the `meshId` contract. Not started: it requires downloading the dataset
  (isa_BP3D_4.0_obj_99.zip, 136 MB, dbarchive.biosciencedbc.jp).
- Not quarantined but unverified: auditory ossicles, intrarenal vessels, ureters. Their origin
  inside the blend is unknown. Re-check when the blend is updated or when provenance is known.
- Metrics after the change: 2,904 structures with geometry (was 2,912).

## Open items

- Replace the 8 quarantined meshes (BodyParts3D or commissioned work with assignment of rights).
- Replace Z-Anatomy's Spanish names with editorial names (tracked in `docs/ROADMAP.md`).
- Legal confirmation that (a) the 2025 BodyParts3D relicensing covers the 2013 data, (b) glTF
  bundles loaded at runtime do not extend ShareAlike to application code, (c) editorial Spanish
  names written independently are not a derivative of the FIPAT translation.
- Copyright holder of the application code (owner or WAZO) to be settled in writing.

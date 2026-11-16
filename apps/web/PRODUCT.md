# Product

## Platform

web

## Users

Primary: health-science students (medicine, nursing, physiotherapy) studying for exams. They
need exact nomenclature in Latin, Spanish and English, and they explore the body system by
system, region by region, usually on a laptop, often at night. Confirmed by the owner on
2026-10-03. Secondary audiences (general public, teachers projecting in class) are not confirmed
and must not drive decisions.

## Product Purpose

Wazo Anatomy is an interactive 3D atlas of the whole human body. Every bone, muscle, vessel,
nerve and organ is a selectable structure with its Terminologia Anatomica 2 identity, trilingual
name, hierarchy and region. Success: a student finds any structure in seconds, sees exactly where
it sits and what surrounds it, and leaves with the correct name.

## Positioning

Built on an ontology, not on a model file: the TA2 term is the unit of the product, the 3D
mesh is one view of it. That is what lets search, hierarchy, hiding, isolating and future quizzes
all speak the same vocabulary. Internal project at WAZO; it will be presented to the company's
CEO.

## Operating Context

Students study at a desk with the atlas open next to notes or a textbook; sessions are long and
the screen is the main light source, so the interface must be comfortable in the dark. The model
(Z-Anatomy, CC BY-SA 4.0, derived from BodyParts3D) is credited on screen at all times.

## Capabilities and Constraints

- 11 body systems; bundles exist today for skeletal (690 structures) and cardiovascular (676).
  The remaining systems are pending and the UI must say so without shame.
- Catalog: 3,269 nodes with la/en/es names; descriptions are not yet available (open).
- Viewer: layer toggles per system and subsystem, hover, select, focus, hide. Phase 3 adds
  search with focus, hierarchy tree, isolate, transparency, clipping planes, camera presets.
- Performance target: 60 fps on an integrated-GPU laptop with skeletal + cardiovascular on.
- Terminology: structure names are never translated by the UI; they come from TA2.csv.
- Undecided: user accounts, progress, quiz mode (roadmap phase 5).

## Brand Commitments

- Name: **Wazo Anatomy**. WAZO is the owner's employer. The visual identity follows the WAZO
  platform (https://new.wazotechnologies.com/), captured with measured values in
  `docs/design/wazo-platform-capture.md` on 2026-11-16 and applied in `DESIGN.md`. It supersedes the
  brand sheet of 2026-10-03 (navy palette, electric blue). Assets: wordmark `public/brand/wazo-logo.svg`
  (WAZO®), isotype `public/brand/wazo-mark.svg` (also the app icon), typeface **BR Sonoma** (licensed,
  weights 400 and 500; its files are not in the repository, so the atlas ships the closest open face,
  Albert Sans, see `src/fonts/README.md`). Platform colours: page `#0A0A0A`, surfaces `#141414` `#1A1A1A`
  `#242424`, white with alpha for secondary text, primary blue `#2E5BBA`, accent `#6FB1FC`, and a vertical
  blue gradient (`#0000FF` to `#9DE2EE`) reserved for the primary action.
- Dark theme is mandatory (owner decision, 2026-10-03).
- Interface language: Spanish; terminology stays trilingual.
- Identity must read as scientific rigor and precision, closer to an academic atlas than to a
  consumer app.

## Evidence on Hand

- Real catalog and two real bundles served by the API; no mock data anywhere.
- No testimonials, usage numbers or institutional endorsements: do not fabricate them.
- Model credits: Z-Anatomy (CC BY-SA 4.0), BodyParts3D by DBCLS (CC BY-SA 2.1 JP).

## Product Principles

1. Nomenclature is the product: Latin, Spanish and English always visible together, never
   abbreviated or invented.
2. The body is the hero; the interface recedes and never competes with the model for light.
3. Every control names what it does to the model (focus, isolate, hide, cut), in the student's
   words.
4. Real numbers only: counts, sizes and measurements come from the catalog and the geometry.
5. Fast on ordinary laptops; nothing ships without measured draw calls and frame time.

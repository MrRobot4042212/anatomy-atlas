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

- Name: **Wazo Anatomy**. WAZO is the owner's employer. Brand assets provided 2026-10-03:
  wordmark `public/brand/wazo-logo.svg` (WAZO®), isotype `public/brand/wazo-mark.svg` (blurred
  blue gradient shield, also the app icon), typeface **BR Sonoma** (licensed; files pending, see
  `src/fonts/README.md`), and the WAZO colour system: electric blue `#0000FF`, black, white;
  secondary blues `#0442D7` `#007BFF` `#33B2FB` `#89D4ED`; neutrals `#212639` `#D9D9D9`
  `#F1EFEF`; primary gradient `#8DD8EF → #0000FF` (radial and linear); secondary gradients
  4 (`#068BFF → #EEF7FF`), 5 (`#0088FF → #0118D6` radial), 6 (`#0209F0 → #86C5EA`); gradient
  palettes warm (`#FF6709 #FF4C5A #FF3CA6 #4D5CD9 #000000`), navy (`#0000FF #043CDF #032CBC
#000066`) and sky-to-red (`#0088FF #C694FF #FF6E93 #FF0000`). Values sampled from the brand
  sheet; the isotype SVG carries the exact blues.
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

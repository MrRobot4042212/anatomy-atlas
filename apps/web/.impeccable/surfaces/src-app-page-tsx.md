---
version: 1
slug: 'src-app-page-tsx'
primary_target: 'src/app/page.tsx'
related_targets: []
---

# Surface: viewer (route /)

Mode: Operate. Health-science students find a structure, see it in context and learn its name.
Task: toggle systems, search or browse the hierarchy, select, focus, isolate, cut, read the
label. Proof/content: real catalog (3,269 TA2 nodes), real bundles (skeletal, cardiovascular).
Constraints: dark theme mandatory; Spanish UI with trilingual nomenclature; model credits always
visible; 60 fps budget on integrated GPUs, so the viewer owns the centre and the chrome is light.

## Direction contract

THESIS: The reading room, not the dashboard. The body is the only light source; the interface
is the dark instrument around it. Refuses the category default of a near-black app with one neon
accent and glowing edges, and the hero-metric dashboard.

OWN-WORLD: Cool graphite surfaces (#0C0F14 ground, #12161D panels, #1A2029 raised, hairlines
#283040), text #E7E4DC, muted #9AA3B2. One accent, dissection-pin ochre #D9A441, used only for
the current selection and primary actions; hover inside the scene is a cool cyan #6BC6E0 because
it must read on bone and on red/blue vessels. Latin names set in EB Garamond italic (the
typeface era of the Fabrica); UI in Atkinson Hyperlegible; TA2 codes and millimetres in Geist
Mono with tabular figures. Hairline rules, 2px radii, no cards inside cards.

STORY: "This is an instrument of reference. Every structure has a name in three languages and a
measurable size; I can take the body apart and put it back without losing my place."

FIRST VIEWPORT: 48px header: wordmark WAZO Anatomy left, search field centred (primary action),
loaded-layer count right. Left rail 280px: Capas (systems, subsystem toggles) above Jerarquía
(tree of the visible systems). Centre: viewer edge to edge with a bottom overlay toolbar of camera
presets and the cutting plane. Right rail 340px: the specimen label (Latin italic display,
Spanish, English, TA2 code, region, side, measured extents with a drawn caliper rule, actions
Enfocar / Aislar / Translúcido / Ocultar). Footer 28px credits.

FORM: Specimen-label layout, first of three considered (label rail, bottom drawer, floating
cards); no concept tournament because the owner pinned "scientific rigor" and dark; seed n/a.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Finish review (2026-10-03, in-thread; no reviewer subagent was run)

Audited the render against the contract in the embedded browser at 1280px and 375px:
header/search/summary, rails, viewer with bottom toolbar, specimen label with Latin italic,
caliper and four actions all present and working against the live API. Mechanical detector:
no findings. Verdict: ships. Known gaps recorded in docs/ROADMAP.md: frame time on real
hardware, structure descriptions, UI language switch. DESIGN.md written from the built world.

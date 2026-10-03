# Design

Wazo Anatomy, viewer surface. Written from the built world on 2026-10-03 (in-thread, no
documenter subagent was run). Product truth lives in `PRODUCT.md`; the direction contract in
`.impeccable/surfaces/src-app-page-tsx.md`.

## World

The reading room, not the dashboard. A student at night, the screen the only light: the body is
the light source and the interface is the dark instrument around it. Mode: Operate. Color
strategy: Restrained (neutrals plus one accent).

## Tokens (`src/app/globals.css`)

| Role                                  | Token                                   | Value                             |
| ------------------------------------- | --------------------------------------- | --------------------------------- |
| Ground (page, canvas)                 | `--ground`                              | `#0C0F14`                         |
| Panel (rails, header, footer)         | `--panel`                               | `#12161D`                         |
| Raised (hover rows, pressed segments) | `--raised`                              | `#1A2029`                         |
| Hairline / strong                     | `--hairline` / `--hairline-strong`      | `#283040` / `#36404F`             |
| Ink / muted / faint                   | `--ink` / `--ink-muted` / `--ink-faint` | `#E7E4DC` / `#9AA3B2` / `#6B7483` |
| Accent (selection, primary action)    | `--accent`                              | `#D9A441` dissection-pin ochre    |
| Accent on accent                      | `--accent-ink`                          | `#1A1304`                         |
| Accent wash (pressed, active row)     | `--accent-soft`                         | `rgba(217,164,65,0.14)`           |
| Scene hover (3D only)                 | `--scene-hover`                         | `#6BC6E0`                         |
| Danger                                | `--danger`                              | `#E06B6B`                         |

Cyan is never used in the DOM; it exists because hover must read on bone and on red/blue
vessels inside the scene. Ochre marks what the student chose: the selected mesh, the active
tree row, the pressed toggle, the primary button. Nothing else is coloured.

## Type

- UI: Atkinson Hyperlegible 400/700 (`--font-ui`), 13px rows, 11px captions, uppercase section
  labels at 11px bold with 0.14em tracking.
- Latin nomenclature: EB Garamond italic (`--font-latin`, `.font-latin`), 30px in the label,
  19px in the wordmark, 24px in the empty state. Scientific names are italic by convention;
  this is the only serif on the surface.
- Data: Geist Mono (`--font-data`, `.font-mono`) for TA2 codes, millimetres, counts in badges,
  the hovered meshId. Tabular figures via `.tabular`.

## Layout

Header 48px (wordmark, search, live layer summary). Left rail 280px: Capas then Jerarquía.
Centre: viewer edge to edge, toolbar overlaid at the bottom (camera presets, cutting plane,
"Mostrar todo"). Right rail 340px: the specimen label. Footer 28px credits. Below `lg` the grid
stacks: viewer 60vh first, then rails. Radii 2px/4px; hairline borders; no cards inside cards;
no shadows except the search dropdown (offset, soft blur).

## Components

- Specimen label (`InfoPanel`): breadcrumb, Latin italic, Spanish bold, English small, data
  grid, caliper (three proportional bars with end ticks, numbers in mono), four actions in a
  2x2 grid (Enfocar primary; Aislar and Translúcido are toggles with `aria-pressed`; Ocultar).
- Toolbar segments: 28px tall, text labels, `aria-pressed` for toggles, one icon per action
  from lucide at 14px.
- Checkboxes use `accent-color` ochre; tree rows highlight with the accent wash; structures
  with geometry show a 6px dot.
- Search: combobox with listbox, keyboard navigation, `/` shortcut, Latin shown in italic
  after the Spanish name.

## States

Hover rows `--raised`; focus-visible ring 2px ground + 2px accent; disabled layers in
`--ink-faint` with "modelo pendiente"; loading shown as skeleton bars in the label and a text
line in the tree; errors in `--danger` naming the problem and the recovery; empty label states
teach the interface.

## Motion

One authored moment: the label settles in (180 ms, 4px rise) and the caliper bars draw
(260 ms, staggered 60 ms). Camera framing animates through camera-controls. Everything else is
150 ms colour transitions. `prefers-reduced-motion` disables the label and caliper animations.

## Browser surfaces

Selection ochre on accent-ink, caret ochre, thin scrollbars in `--hairline-strong`, range
input restyled for the cutting plane, `color-scheme: dark`.

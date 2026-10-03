# Design

Wazo Anatomy, viewer surface. Written from the built world on 2026-10-03 and revised the same
day when the WAZO brand assets arrived (in-thread, no documenter subagent was run). Product
truth lives in `PRODUCT.md`; the direction contract in `.impeccable/surfaces/src-app-page-tsx.md`.

## World

The reading room, not the dashboard. A student at night, the screen the only light: the body is
the light source and the interface is the dark instrument around it, built from WAZO's night
navy and lit by WAZO's electric blue. Mode: Operate. Color strategy: Restrained (brand neutrals
plus the brand primary).

## Brand constants (from the WAZO brand sheet and the isotype SVG)

| Name             | Value                         | Use here                                                    |
| ---------------- | ----------------------------- | ----------------------------------------------------------- |
| Electric         | `#0000FF`                     | fills: primary button end stop, text selection              |
| Royal            | `#0442D7`                     | reserved (gradients)                                        |
| Azure            | `#007BFF`                     | pressed wash at 16%                                         |
| Sky              | `#33B2FB`                     | interactive text, focus ring, slider thumb, scene hover     |
| Ice              | `#89D4ED`                     | reserved (gradient start)                                   |
| Mint             | `#D8FFE6`                     | reserved (isotype)                                          |
| Night            | `#212639`                     | raised surfaces                                             |
| Magenta          | `#FF3CA6`                     | scene selection only (from the brand warm gradient palette) |
| Primary gradient | `#8DD8EF → #0E69ED → #0000FF` | the primary action (Enfocar)                                |

Other brand gradients (secondary 4, 5, 6; warm, navy and sky-to-red palettes) are recorded in
`PRODUCT.md` and not used on this surface: an Operate surface earns one gradient, on its one
primary action.

## Tokens (`src/app/globals.css`)

| Role                                  | Token                                   | Value                                     |
| ------------------------------------- | --------------------------------------- | ----------------------------------------- |
| Ground (page, canvas)                 | `--ground`                              | `#0B0E1A`                                 |
| Panel (rails, header, footer)         | `--panel`                               | `#12162A`                                 |
| Raised (hover rows, pressed segments) | `--raised`                              | `#212639` (brand night)                   |
| Hairline / strong                     | `--hairline` / `--hairline-strong`      | `#2A3049` / `#3A4160`                     |
| Ink / muted / faint                   | `--ink` / `--ink-muted` / `--ink-faint` | `#F1EFEF` (brand) / `#A3AAC4` / `#6F7694` |
| Accent fill / on accent               | `--accent` / `--accent-ink`             | `#0000FF` / `#FFFFFF`                     |
| Accent text                           | `--accent-text`                         | `#33B2FB`                                 |
| Accent wash                           | `--accent-soft`                         | `rgba(0,123,255,0.16)`                    |
| Scene hover / selected                | `--scene-hover` / `--scene-selected`    | `#33B2FB` / `#FF3CA6`                     |
| Danger                                | `--danger`                              | `#FF6E93` (from the sky-to-red palette)   |

Electric blue never carries text on the dark ground (2.4:1); it is a fill under white. Sky
carries interactive text (7.9:1 on ground). Magenta exists only inside the 3D scene and as the
small dot before the selected structure's Latin name, so the label and the model agree.

## Scene palette

Tissue colours inside the 3D scene follow atlas convention, not the brand: muscle `#A9463F`,
nerve `#E3C75A`, lymph `#79B77F`, cerebral cortex `#E0A48E`, bronchi `#D9CFC0`, generic organ
`#C97B6B`, bone `#ECE5D6`. These override the pure-white materials Z-Anatomy exports
(`SCENE_PALETTE` in `materials.ts`); every other material keeps its source colour (arteries
`#E46E6E`, veins `#7873E4`, cartilage, ligaments, mucosa, glands). Fascia renders at 35 %
opacity and bursae at 60 %, as veils over what they wrap; the muscular layer starts with its
`fascia` subsystem switched off.

## Logo

Isotype `public/brand/wazo-mark.svg` at 22px and wordmark `public/brand/wazo-logo.svg` (white,
68x18) in the header, followed by "Anatomy" in italic. The isotype is also the app
icon (`src/app/icon.svg`) and appears at 72px in the empty label state. Never recolour the
isotype; never set the wordmark in a typeface.

## Type

One family only: Albert Sans 400/500/600/700 with italics (`src/fonts/ui.ts`), the closest
open face to the brand's BR Sonoma (owner decision 2026-10-03; the `localFont` block stays
ready). 13px rows, 11px captions, uppercase section labels at 11px bold with 0.14em tracking.

- Latin nomenclature: Albert Sans italic 500 (`.font-latin`), 30px in the label, 19px for
  "Anatomy" in the header, 24px in the empty state. Scientific names are italic by convention.
- Data: TA2 codes, millimetres and counts use the same face with tabular figures (`.tabular`).

## Layout

Header 48px (isotype + wordmark + Anatomy, search, live layer summary). Left rail 280px: Capas
then Jerarquía. Centre: viewer edge to edge, toolbar overlaid at the bottom (camera presets,
cutting plane, "Mostrar todo"). Right rail 340px: the specimen label. Footer 28px credits.
Below `lg` the grid stacks: viewer 60vh first, then rails. Radii 2px/4px; hairline borders; no
cards inside cards; no shadows except the search dropdown (offset, soft blur).

## Components

- Specimen label (`InfoPanel`): breadcrumb, Latin italic with the selection dot, Spanish bold,
  English small, data grid, caliper (three proportional bars with end ticks, numbers in mono),
  four actions in a 2x2 grid (Enfocar on the brand gradient; Aislar and Translúcido are toggles
  with `aria-pressed` in the azure wash; Ocultar).
- Toolbar segments: 28px tall, text labels, `aria-pressed` for toggles, one icon per action
  from lucide at 14px.
- Checkboxes use `accent-color` electric; tree rows highlight with the azure wash; structures
  with geometry show a 6px dot, magenta when selected.
- Search: combobox with listbox, keyboard navigation, `/` shortcut, Latin shown in italic
  after the Spanish name.

## States

Hover rows `--raised`; focus-visible ring 2px ground + 2px sky; disabled layers in
`--ink-faint` with "modelo pendiente"; loading shown as skeleton bars in the label and a text
line in the tree; errors in `--danger` naming the problem and the recovery; empty label state
shows the isotype and teaches the interface.

## Motion

One authored moment: the label settles in (180 ms, 4px rise) and the caliper bars draw
(260 ms, staggered 60 ms). Camera framing animates through camera-controls. Everything else is
150 ms colour transitions. `prefers-reduced-motion` disables the label and caliper animations.

## Browser surfaces

Selection electric on white, caret sky, thin scrollbars in `--hairline-strong`, range input
restyled for the cutting plane, `color-scheme: dark`.

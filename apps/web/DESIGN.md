# Design

Wazo Anatomy, viewer surface. It follows the WAZO platform design (https://new.wazotechnologies.com/),
captured with measured values in `docs/design/wazo-platform-capture.md`; that file is the source and
this one says how the atlas applies it. Product truth lives in `PRODUCT.md`.

Revised 2026-11-16: the first version of this file (2026-10-03) was built from a brand sheet with a navy
palette; the platform's live design replaced it. Where the two differ, the platform wins.

## World

An instrument for studying at night, on the same family footing as WAZO's simulators. The surfaces
are near-black, white is the only emphasis, blue appears on the one primary action, on focus and on
the active state. The body is the light source and the interface recedes around it. Mode: Operate.
Colour strategy: Restrained.

## Tokens (`src/app/globals.css`)

| Role                        | Token                                       | Value                                                           |
| --------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| Ground (page, canvas)       | `--ground`                                  | `#0A0A0A`                                                       |
| Panel (rails, footer)       | `--panel`                                   | `#141414`                                                       |
| Raised, raised 2            | `--raised`, `--raised-2`                    | `#1A1A1A`, `#242424` (focused field)                            |
| Bar (header, toolbar)       | `--bar`                                     | `rgba(22,22,22,.85)` with blur 18 and saturate 1.4              |
| Hairline, strong            | `--hairline`, `--hairline-strong`           | `rgba(255,255,255,.096)`, `.192`                                |
| Ink, strong, muted, faint   | `--ink`, `--ink-strong`, `-muted`, `-faint` | white at 1, .92, .7, .55: secondary text lowers alpha, no greys |
| Accent fill                 | `--accent`                                  | `#2E5BBA` (checkbox, selection)                                 |
| Accent text, ring           | `--accent-text`                             | `#6FB1FC`                                                       |
| Accent wash                 | `--accent-soft`                             | `rgba(111,177,252,.16)` (pressed)                               |
| Primary action              | `.btn-primary`                              | `linear-gradient(180deg,#0000FF,#043CDF,#1587F7 69%,#9DE2EE)`   |
| Danger                      | `--danger`                                  | `#FF6B6B`                                                       |
| Scene hover, scene selected | `--scene-hover`, `--scene-selected`         | `#6FB1FC`, `#FF3CA6`                                            |

Magenta exists only inside the 3D scene and as the dot before the selected structure's Latin name, so
the label and the model agree; no tissue is that hue. Everything else is the platform palette.
Accent text on the panels is 9:1 or better; the faintest ink (white at .55) is 6:1 on `#141414`.

## Scene palette

Tissue colours inside the 3D scene follow atlas convention, not the brand: muscle `#A9463F`, nerve
`#E3C75A`, lymph `#79B77F`, cerebral cortex `#E0A48E`, bronchi `#D9CFC0`, generic organ `#C97B6B`,
bone `#ECE5D6`. These override the pure-white materials Z-Anatomy exports (`SCENE_PALETTE` in
`materials.ts`); every other material keeps its source colour (arteries `#E46E6E`, veins `#7873E4`,
cartilage, ligaments, mucosa, glands). Fascia renders at 35 % opacity and bursae at 60 %. The canvas
clear colour is the ground (`#0A0A0A`).

## Logo

Isotype `public/brand/wazo-mark.svg` (also the app icon, `src/app/icon.svg`) and wordmark
`public/brand/wazo-logo.svg` (white) in the header, followed by "Anatomy" in italic. Never recolour the
isotype; never set the wordmark in a typeface. The empty label state shows the isotype at 72 px.

## Type

The platform face is **BR Sonoma**, weights 400 and 500, no italic. It is licensed and its files are
not in the repository, so the atlas ships **Albert Sans** (open, closest in proportions) through
`src/fonts/ui.ts`, with the `localFont` block ready for the licensed files (`src/fonts/README.md`).

- **Tracking is -0.05em at every size**, set on every element (`*` in `globals.css`) so the ratio holds
  from 12 to 70 px, as on the platform. Tabular data (`.tabular`) is looser, -0.02em, so numbers stay
  legible.
- Closed scale: 12, 14, 16, 22, 28, 32 (the platform also has 10, 36, 58, 70, not used here). Body 14 px /
  1.4, captions 12 px, the specimen Latin name 32 px, "Anatomy" in the header 22 px.
- Weight: 400 for text, 500 for names, numbers and buttons. Never bold.
- Hierarchy is size plus one weight step plus alpha. Section labels are an eyebrow (14 px, muted),
  sentence case, no uppercase and no letter-spaced capitals.
- Latin nomenclature: italic 500 (`.font-latin`), by scientific convention, even though BR Sonoma has no
  italic (the platform never sets Latin). Data (TA2 codes, millimetres, counts) uses `.tabular`.

## Space, radius, motion

- Steps 8, 16, 24 and 48, with 4 and 12 inside dense lists. Panel padding 16; rows 8 x 8.
- Radius by role: 4 buttons, links, rows; 8 fields and cards; 12 floating bars and the search
  dropdown; 16 large surfaces; 999 chips and dots.
- Shadows: none on surfaces. The primary button glows on hover (`0 6px 16px -6px rgba(0,125,255,.55)`).
  The search dropdown keeps a soft drop shadow because it floats over the model.
- One curve, `cubic-bezier(.32,.08,.24,1)`: colour changes 150 ms, buttons 180 ms (lift 1 px), the label
  settles in over 220 ms and the caliper draws in 500 ms, staggered 60 ms. `prefers-reduced-motion`
  turns the label, caliper and button lift off.

## Components

- **Buttons** (`.btn`): 40 px high (32 with `.btn-sm`), 14 px / 500, 4 px radius, padding 0 16.
  `.btn-primary` is the gradient (one per view: Enfocar). `.btn-outline` is transparent with a 1 px
  border at white .3; hover raises 1 px, border .6 and fill .08. `aria-pressed="true"` is the accent wash
  with a light-blue border. `.btn-ghost` is the variant inside bars and sheets (no border, fill .08
  on hover, same pressed state); `.btn-icon` makes any of them a 40 x 40 square with the label in
  `aria-label`. A control that can be momentarily empty uses `aria-disabled` (styled as disabled,
  still focusable) so it keeps focus when it empties itself.
- **Fields**: 40 px, radius 8, fill `#141414`, border white .2, padding 12; focus turns the border
  `#4A90E2` and the fill `#242424`, with the global ring.
- **Focus ring**: `outline: 2px solid #6FB1FC; outline-offset: 2px`, on everything focusable.
- **Bars** (`.bar-surface`): translucent, blurred, over the scene. The header is 64 px; the toolbar is a
  floating 12 px rounded container of 40 px ghost buttons, each an icon plus a label. Fixed slots in
  two rows (camera views; Corte, Atenuar resto, Mostrar todo with its count, Reiniciar last): a state
  changes colour or a number, never the layout. One Tab stop, arrows inside; below `sm` each row
  scrolls sideways in the same order instead of wrapping.
- **Sheets** (help): native modal `<dialog>`, 16 px radius, panel fill, backdrop black .6.
- **First-run hint**: a bar-surface card at the canvas's top left, three lines with accent icons
  and a close button; once per browser, never in embed mode.
- **Specimen label** (`InfoPanel`): breadcrumb, Latin italic with the selection dot, Spanish name,
  English name, data grid, caliper (three proportional bars with end ticks, numbers tabular), four
  actions in a 2 x 2 grid (Enfocar primary; Aislar and Translúcido are toggles; Ocultar).
- **Layer rows**: checkbox with `accent-color`, name 14 px, caption 12 px muted; hover `--raised`;
  disabled layers in faint ink with "modelo pendiente".
- **Search**: combobox with listbox, keyboard navigation, `/` shortcut, Latin shown in italic after the
  Spanish name.

## Layout

Header 64 px (isotype, wordmark, Anatomy, search, live layer summary). Left rail 280 px: Capas then
Jerarquía. Centre: the viewer edge to edge, toolbar floating at the bottom. Right rail 340 px: the
specimen label. Footer 28 px of credits. Below `lg` the grid stacks: viewer 60vh first, then the rails.
The platform's breakpoints are 639 and 1200 px; the atlas keeps its own single stacking point until the
interaction redesign. Embedded (`?embed=1`) the layout pins to the frame.

## States

Hover rows `--raised`; disabled at .45 opacity; loading as skeleton bars in the label and a text line in
the tree; errors in `--danger` naming the problem and the recovery; the empty label state shows the
isotype and teaches the interface.

## Voice

Spanish, sentence case, short. Buttons are a verb or a short noun phrase naming what they do to the
model ("Enfocar", "Aislar", "Ocultar", "Mostrar todo"), as in the platform ("Pide una demo", "Acceder").
Nomenclature is never translated by the UI.

## Browser surfaces

Selection `#2E5BBA` on white, caret `#6FB1FC`, thin scrollbars in `--hairline-strong`, the cutting plane
slider restyled with an accent thumb, `color-scheme: dark`.

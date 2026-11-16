# WAZO platform design, captured

Source: https://new.wazotechnologies.com/ (WordPress, dark only), captured on 2026-11-16 from the
live pages: computed styles, the site's own CSS custom properties (`--wazo-*`) and screenshots.
Three analysts covered the home page and components, the rest of the site (simulator and course
pages, plans, about, contact, catalogs) and the simulator interface as the marketing site shows
it. This file is the reference the atlas follows; `apps/web/DESIGN.md` says how the atlas applies
it.

Caveats that matter. The browser window could not be resized, so the 1440 px and 390 px values come
from same-origin iframes of the page at those widths (media queries fire on the iframe width). The
simulator UI values are estimates from one marketing photo of a tablet, not measurements of the
product. Hover, active and disabled states were measured only where listed. The site's own tokens
and the rendered CSS disagree in places (noted below); the rendered CSS wins.

## Colour

| Role                      | Value                                   | Notes                                                                  |
| ------------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| Page background           | `#0A0A0A`                               | every page; sections are transparent, no alternating bands             |
| Soft background           | `#141414`                               | form fields                                                            |
| Surface                   | `#1A1A1A`, `#242424`                    | surface-2 is the focus background of a field                           |
| Header bars               | `rgba(22,22,22,.85)`                    | with `backdrop-filter: blur(18px) saturate(1.4)`, no border, no shadow |
| Text                      | `#FFFFFF`                               | secondary text lowers the alpha instead of using greys                 |
| Text ladder (white alpha) | 1, .92, .85, .75, .7, .65, .6, .55      | nav .92, card body .85, lede .6, captions .55                          |
| Muted, dim                | `#B8B8B8`, `#8A8A8A`                    | lists and roles                                                        |
| Primary, primary light    | `#2E5BBA`, `#4A90E2`                    | primary light is the field focus border                                |
| Accent                    | `#6FB1FC`                               | ticks, links, first stat, focus ring                                   |
| Bright blue               | `#00A1FF`                               | open nav item text, plan row border                                    |
| Border, strong            | `rgba(255,255,255,.096)`, `.192`        | field borders use `.2`, outline buttons `.3` to `.6`                   |
| Invalid                   | `#FF6B6B`                               | border and label                                                       |
| Success tag               | `rgba(56,210,123,.12)` with `.5` border | the only green on the site (payment pill)                              |
| Light surface             | `#F1EFEF`                               | only the mega menu left column; `#F4F4F4` is defined and unused        |

Gradients, as rendered:

- Primary button: `linear-gradient(180deg, #0000FF, #043CDF, #1587F7 69.19%, #9DE2EE 104.84%)`,
  a vertical blue to cyan. The token `--wazo-gradient-primary` (135deg, `#1F3A93` to `#6FB1FC`) is
  defined but is not what the buttons use.
- Card border: 1 px gradient frame, `linear-gradient(90deg, #0118D6 25%, #0072F7 70%, #0088FF 87%)`.
- Banner: `radial-gradient(166% 100% at 0% 50%, #0000FF, #043CDF, #1587F7 66%, #9DE2EE)`.
- Mega menu right column: radial, `#9DE2EE` at the bottom edge through `#1587F7`, `#043CDF` to `#0000FF`.

Colour is almost absent from surfaces: near-black plus blue only in gradients, borders and the one
accent. White is the emphasis: 1 px white borders, white chips, white pill buttons.

## Type

Typeface: **BR Sonoma**, weights 400 and 500 only, no italic, loaded as web fonts. The system
stack follows (`system-ui`).

- **Letter-spacing is -0.05em at every size**, body included: 70 gives -3.5, 36 gives -1.8, 32
  gives -1.6, 28 gives -1.4, 16 gives -0.8, 14 gives -0.7, 12 gives -0.6, 10 gives -0.5 px.
- Closed size scale: 10, 12, 14, 16, 22, 28, 32, 36, 58, 70 px.
- Display: `clamp(32px, 5.6vw, 70px)`; large `clamp(30px, 4vw, 44px)`; medium
  `clamp(24px, 3.4vw, 36px)`; small `clamp(22px, 2.4vw, 28px)`.
- Line height: 1.1 for headings (70/77, 36/39.6, 32/35.2, 28/30.8); 1.4 for body (16/22.4, 14/19.6);
  1.0 for 12 px and 14 px labels.
- Weight: 500 for headings, numbers and buttons; 400 for body. Never bold. Hierarchy is size plus
  one weight step plus alpha.
- Eyebrow above a title: 14 px, 400, sentence case, white. Small tag: 10 px, 500, uppercase
  (`NUEVO`). Breadcrumb 12 px at .55. Stat: number 36/36 weight 500, caption 14 px capitalised.

## Space, radius, shadow

- Spacing tokens (rem): .25, .5, .75, 1, 1.5, 2, 3, 4, 6, 8. In practice: 8, 16, 24, 48, 80
  (plus 6 and 12 inside menus). Card padding 24, gaps 8 / 16 / 24, section padding 48 top and
  bottom (`clamp(40px, 5vw, 48px)`), heading to content 80.
- Radius by role: **4** buttons, nav links, hero cards, carousel; 6 menu items and thumbnails; 8
  catalog cards, form fields; 12 icon tiles, contact cards, footer boxes; 16 plan rows and the
  banner; 999 chips and dots; 50% arrow buttons. The tokens 6 / 12 / 20 / 28 exist but the pages
  do not follow them.
- Shadow tokens exist (`0 2px 8px /.1`, `0 8px 24px /.16`, `0 20px 48px /.24`) and are not used. The
  only shadow seen is the primary button hover glow: `rgba(0,125,255,.55) 0 6px 16px -6px`.

## Layout

- 12 columns, 24 px gutter, no max width, no outer padding on `main`; content sits in columns 2 to
  11 (columns 1 and 12 are margins): 1584 px of content at 1920, 1184 at 1440.
- Editorial split: heading in columns 2 to 6 (or 2 to 8), a small lede in columns 8 or 9 to 11 aligned
  to the heading baseline.
- Breakpoints: max-width 639, min-width 640, max-width 1200, min-width 1201. Below 1201 the grid is
  one column and the header hamburger (44 px) appears; below 640 it is 6 columns with 8 px gutters
  and 16 px padding; 3-column card grids become 2 then 1.
- Header: sticky, 119 px at desktop (43 px language bar plus 76 px main bar), 100 px at 390. Logo
  60 x 52, nav links 16 px with padding 10 x 15 and radius 4, open item gets `#00A1FF` text and a
  `rgba(255,255,255,.06)` background.

## Components

- **Primary button**: 44 px high (39 in the header), padding 0 16 (0 18 in the header), radius 4,
  text 14 px / 500 (16 in the header), white, gradient above, followed by an arrow. Hover: raise 1 px
  and the blue glow. Transition `.18s cubic-bezier(.32,.08,.24,1)`.
- **Secondary button**: same size, transparent, 1 px border `rgba(255,255,255,.3)` (header: `.6`,
  hover `.85` and a `rgba(255,255,255,.08)` fill, raise 1 px).
- **White button**: `#FFF` fill, `#0A0A0A` text, radius 4; used on the gradient banner.
- **Chip, outline**: 32 high, padding 0 14, radius 100, fill `rgba(255,255,255,.03)`, border
  `rgba(255,255,255,.094)`, 14 px. **Chip, solid**: 20 high, padding 3 x 8, white fill, dark 10 px text.
- **Field**: 55 high, radius 8, `#141414`, border `rgba(255,255,255,.2)`, padding 16, 16 px text.
  Label 14 px above the field; required marked with an asterisk. Focus: border `#4A90E2` and fill
  `#242424`, no outline. Invalid: `#FF6B6B` border and label.
- **Global focus-visible**: `outline: 2px solid #6FB1FC; outline-offset: 2px; border-radius: 2px`.
- **Catalog card**: 24 padding, `#0A0A0A`, 1 px white border, radius 8, 16 gap; index 10 px, title
  32 px, white arrow badge 32 px round; on hover the border turns into the blue gradient frame and
  the arrow glyph slides through three layers.
- **Plan row**: 1 px `#00A1FF` border, radius 16, padding 24, two columns; **banner**: radius 16,
  padding 48, radial gradient, 70 px title, white button.
- **Image card**: no scrim, the darkening is baked into the photo; text sits on the image at the
  bottom, padding 24; 1 px gradient frame; hover scales the image to 1.04 over `.6s`.
- **Mega menu**: two columns edge to edge under the header, light left column `#F1EFEF` with
  black text, saturated radial right column, opened by a top-down `clip-path` reveal (open `.48s`,
  close `.36s`), behind a fixed backdrop `rgba(0,0,0,.2)` with `blur(28px) saturate(1.4)`.
- **Footer**: `#0A0A0A`, 14 px, links at .7 alpha turning white on hover, outlined boxes with
  radius 12 and 1 px `rgba(255,255,255,.09)` for legal text.
- Icons: thin white line SVG, 16 to 20 px.

## Motion

One curve everywhere: `cubic-bezier(.32, .08, .24, 1)`. Durations: .15 s hover colour, .18 s buttons,
.22 s cards and footer links, .3 s backdrop, .32 s mobile menu, .36 s menu close, .48 s menu open,
.5 s cross fade and arrows, .6 s image zoom. Movement on hover is limited to a 1 px lift on buttons
and a 1.04 scale on images. Carousel slides cross-fade (.5 s) every 8 s with a filling dot.

## Voice (Spanish)

Sentence case, short, benefit-led; hero claims are full sentences ending in a period, catalog titles
are bare nouns. A one or two word eyebrow above titles. Questions use the inverted mark ("Que
incluye?" with its marks). Buttons are a verb or a short noun phrase: "Pide una demo", "Comprar
curso", "Descargar ficha tecnica", "Mas informacion", "Enviar", "Acceder"; primary calls to action
end with an arrow. Numbers appear as proof (stats, prices with a decimal comma). The brand is always
written with its registered mark.

## The simulator interface (from marketing imagery only)

Landscape tablet, three zones: the scanned image on the left, an information panel docked right and
overlapping it, one full-width bottom toolbar. Estimates from the photo, not measurements:

- Toolbar: about 12% of the screen height, rounded dark container, about 14 controls, every one an
  icon over a small text label, none icon-only. Order: setup (Body Areas, Prep), imaging mode (2D, M,
  Depth, Doppler), tools (Caliper, Export, Zoom, Measure), dual views, acquisition (Gain, Freeze at the
  far end). Active control is filled blue (about `#2F7BFF`) with a white icon; unavailable controls are dimmed.
- Round navigation buttons stacked at the right edge: back, home, information.
- Information panel: dark navy (about `#1B2536`), slightly transparent, 1 px light border, radius
  about 8, caps title, then a definition, "Examination technique" and "Common pathologies".
- The selected structure is a flat translucent colour fill on the scene; a case chip (status dot,
  title) sits top left; counters like "Atlas (1/2)" and "Pathologies (1/3)" show progress.
- Learning model on the product pages: Aprende, Practica, Compara, Explora, Repite, Evalua; progress
  by anatomical region; levels Iniciacion and Avanzado; expert-reviewed verified cases.
- Not found: a named study / assessment / free mode, a progress dashboard, any 3D anatomy atlas
  view. The only 3D shown is a skin-coloured torso used to place the probe.

## Not measured

Real 1440 px and 390 px windows (iframes used), hover of the Nosotros menu item, the mega menu
animation frames, divider colours, icon stroke widths, the team photo radius, success and invalid
form renderings, touch gestures and target sizes of the real simulator, and anything behind the
login.

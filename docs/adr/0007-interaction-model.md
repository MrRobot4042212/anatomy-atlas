# ADR 0007: Interaction model for the 3D body

Date: 2026-11-16
Status: accepted; implemented 2026-11-17 (see Result)

## Context

A timed evaluation of the atlas on ten student tasks found a blocker (showing only the right forearm
muscles is impossible), no reset anywhere, opaque layers hiding what the student looks for, a hierarchy
tree with about 50 tab stops, 14 px hit targets and developer data (megabytes) in the layer list. A study
of the best-known 3D anatomy products shows which patterns hold across all of them and which fail.
Details and numbers are in `docs/design/interaction-model.md`.

## Decision

Adopt the model in `docs/design/interaction-model.md`:

- Layers become a three-state control per system (visible, translucent, hidden), and a second, independent
  filter chooses the region and the side. Region and side come from catalog data that already exists, so
  asset bundles carry a region index per mesh.
- Selecting a structure dims the others by default; one toggle turns it off. Isolate stays as the strong
  form.
- Reset is a fixed control and a key; the viewer state is serializable so it can live in the URL and be
  set by guided views and by the embed protocol.
- Guided views are data, not code.
- The panel is tabbed and says what is not available yet instead of inventing it.

## Consequences

- The asset bundle manifest, the API and the shared `AssetBundle` type gain a `regions` index (a
  migration); bundles themselves do not change, so no GLB is rebuilt.
- The viewer store gains region and side filters, a translucent-systems set, a dim-others flag and a
  `reset` action; the paint function stays the single place that decides how a structure looks.
- The default look changes: selecting no longer leaves the rest at full opacity. This is the one
  behaviour change a returning user would notice, and it has a switch.
- Descriptions, relations and quizzes remain pending on content. The tabs make the gap visible and do not
  hide it.
- Cost: about two weeks of work in four independent pieces (data and region filter, toolbar and keyboard,
  layer panel, tree and search, selection and panel), each shippable alone.

## Result (2026-11-17)

Built as four independent pieces and merged: the zone index and the region filter, the toolbar with
keyboard, reset and URL state, the layer panel with the tree and the search ranking, and the selection
with the tabbed panel. 203 web tests and 34 API tests cover it.

Measured against the acceptance table of `docs/design/interaction-model.md`:

| Task                                   | Before                    | After                                                  |
| -------------------------------------- | ------------------------- | ------------------------------------------------------ |
| Right forearm muscles only             | blocker                   | 4 clicks (Muscular, hide skeleton, Antebrazo, Derecho) |
| Back to the initial state              | no way                    | 1 action (button or R); the view is in the URL         |
| Select the malleus                     | a 5 px dot                | fills 65 % of the canvas height after Enfocar          |
| Tab stops from the page to the toolbar | 60                        | 5                                                      |
| Layout shift in the toolbar            | yes                       | none (fixed slots, measured)                           |
| Search "sciatic", "kidney", "femur"    | bursae and branches first | the structure first, on all six queries                |
| Systems with a depth state             | on or off                 | visible, translucent, hidden                           |

Found on the way and fixed: structures nested inside other structures in the GLB (616 of 676
cardiovascular, 190 nervous) were never registered, so a coronary branch selected its root; and hidden
structures could still take a click.

Open: descriptions, innervation and blood supply (no data), guided views (the data format is specified in
the interaction model but no views are authored yet), the occluded-structure cue is unit tested only, and
the zone rules have accepted edge cases (mylohyoid and suboccipital muscles in the head, brachial plexus
trunks and supraclavicular nodes in the thorax).

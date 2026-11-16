# Anatomist review package

What a human anatomist must validate before Wazo Anatomy ships to students. Nothing here is
medical sign-off until a named reviewer has gone through it.

## 1. Spanish names (1,959 terms)

File: `names-es-review.csv` (UTF-8 with BOM, opens in Excel and Google Sheets).

The names were drafted from the Latin and English of Terminologia Anatomica 2 and cross-checked in a second pass. They are all `draft`: no human anatomist has reviewed them yet. The sheet is sorted by
priority: the 267 terms the drafters were unsure about come first (confidence low, then medium,
each with a note explaining the alternatives), then the rest.

For each row fill the last three columns:

| Column          | What to enter                                                        |
| --------------- | -------------------------------------------------------------------- |
| `decision`      | `ok` to approve the draft as written, `change` to replace it         |
| `spanish_final` | required when the decision is `change`: the Spanish name you approve |
| `comment`       | optional; reasons, a source, or a doubt                              |

Leave `decision` empty for rows you did not review. Editorial rules the drafts follow are in
`tools/asset-pipeline/editorial/STYLE.md`; if you disagree with a rule, say so in `comment` and
the whole family of names can be changed at once.

Do not copy from an existing Spanish term list: the names are meant to be independent work.

Import the returned sheet (from `tools/asset-pipeline`):

```bash
python scripts/import_review.py ../../docs/review/names-es-review.csv --reviewer "Full Name" --dry-run
python scripts/import_review.py ../../docs/review/names-es-review.csv --reviewer "Full Name"
python scripts/build_mapping.py --es-min-status reviewed   # ships only approved names
```

The importer rejects unknown terms, a `change` without `spanish_final`, and any other decision,
and writes nothing unless the whole sheet is valid.

## 2. Authored 3D models

See `authored-models-checklist.md`: cochlea, vestibule with semicircular canals, renal pelvis.

## 3. Source-data corrections

`tools/asset-pipeline/editorial/corrections.json` fixes 137 typos and misplaced parents inherited
from the Z-Anatomy source. They are not yet checked against the official TA2 text; a terminologist
should confirm the rest before commercial release (the Latin is CC BY-ND, so it must stay faithful
to the published list). Already checked against the official TA2 text:
`tools/asset-pipeline/editorial/ta2-verification.json` (73 confirmed, 69 with no TA2 entry, 3
deliberate deviations).

## 4. Still open

- Two objects of the source model have no name and carry descriptive placeholders
  (`za:unnamed`, `za:x`). A geometric analysis of their curves gives hypotheses, to be confirmed
  on the mesh before any name is applied:
  - `za:unnamed` ("????????", cardiac veins): probably the small cardiac vein (Vena cardiaca
    parva), medium confidence. It starts at the coronary sinus ostium, runs along the right
    atrioventricular groove and ends anteriorly; the great, middle and posterior veins and the
    coronary sinus are already in the model, the small cardiac vein is not.
  - `za:x` ("?x", paired, under the common carotid): cannot be decided, low confidence. The path
    matches an upper nasal septal vessel, perhaps a posterior septal branch of the
    sphenopalatine artery, but it is filed under the carotid and no name should be forced.
- The auditory ossicles are authored models now (their 3D source was probably non-commercial);
  they are in the checklist.

# UI typeface

The WAZO platform face is **BR Sonoma** (licensed): the live site loads two weights, 400 and 500, and no
italic. Its files are not in this repository, so the atlas ships the closest open face instead,
**Albert Sans** (Google Fonts, self-hosted by next/font), configured in `ui.ts`.

To use the real face, add the two licensed files here as `BRSonoma-Regular.woff2` and
`BRSonoma-Medium.woff2` (they must come from WAZO's brand assets or be released by whoever holds the
licence), then swap to the commented `localFont` block in `ui.ts`. Nothing else depends on it, except
two things to check: Latin names are set in italic, and BR Sonoma has none (the browser would slant it
synthetically; consider setting Latin in Albert Sans italic only), and the platform's -0.05em tracking
was tuned for BR Sonoma.

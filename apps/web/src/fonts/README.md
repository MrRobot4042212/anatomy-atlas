# UI typeface

WAZO's brand face is **BR Sonoma** (licensed). The owner chose to ship the closest open face
instead: **Albert Sans** (Google Fonts, self-hosted by next/font), configured in `ui.ts`.

If the BR Sonoma files are ever added here (`BRSonoma-Regular/Medium/SemiBold/Bold.woff2`),
swap to the commented `localFont` block in `ui.ts`; nothing else in the design depends on it.

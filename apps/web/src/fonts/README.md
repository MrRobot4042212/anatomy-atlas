# Brand fonts

WAZO's typeface is **BR Sonoma** (licensed, not on Google Fonts). Drop the files here:

```
src/fonts/BRSonoma-Regular.woff2
src/fonts/BRSonoma-Medium.woff2
src/fonts/BRSonoma-SemiBold.woff2
src/fonts/BRSonoma-Bold.woff2
```

then switch `src/fonts/ui.ts` to the `localFont` block (already written there, commented).
Until then the UI falls back to Atkinson Hyperlegible, chosen for legibility; nothing else in
the design depends on the swap.

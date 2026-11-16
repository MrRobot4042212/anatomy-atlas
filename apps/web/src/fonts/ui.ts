/**
 * The UI typeface. The brand face is BR Sonoma (licensed, not available here); Albert Sans is
 * the closest open face to it (geometric grotesk, open apertures, similar proportions) and is
 * the one we ship. The localFont block below is ready if the licensed files ever land in
 * this folder (see README.md).
 */
import { Albert_Sans } from 'next/font/google';
// import localFont from 'next/font/local';

// The only typeface on the surface: UI, Latin nomenclature (italic) and data (tabular figures).
export const ui = Albert_Sans({
  variable: '--font-ui',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
});

// export const ui = localFont({
//   variable: '--font-ui',
//   display: 'swap',
//   src: [
//     { path: './BRSonoma-Regular.woff2', weight: '400', style: 'normal' },
//     { path: './BRSonoma-Medium.woff2', weight: '500', style: 'normal' },
//   ],
// });

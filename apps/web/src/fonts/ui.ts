/**
 * The UI typeface. The brand face is BR Sonoma (licensed, not available here); Albert Sans is
 * the closest open face to it (geometric grotesk, open apertures, similar proportions) and is
 * the one we ship. The localFont block below is ready if the licensed files ever land in
 * this folder (see README.md).
 */
import { Albert_Sans } from 'next/font/google';
// import localFont from 'next/font/local';

export const ui = Albert_Sans({
  variable: '--font-ui',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

// export const ui = localFont({
//   variable: '--font-ui',
//   display: 'swap',
//   src: [
//     { path: './BRSonoma-Regular.woff2', weight: '400', style: 'normal' },
//     { path: './BRSonoma-Medium.woff2', weight: '500', style: 'normal' },
//     { path: './BRSonoma-SemiBold.woff2', weight: '600', style: 'normal' },
//     { path: './BRSonoma-Bold.woff2', weight: '700', style: 'normal' },
//   ],
// });

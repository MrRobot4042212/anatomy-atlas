/**
 * The UI typeface. Brand: BR Sonoma (see README.md in this folder). The local block is
 * enabled once the licensed files are in place; until then a legibility-first fallback.
 */
import { Atkinson_Hyperlegible } from 'next/font/google';
// import localFont from 'next/font/local';

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

export const ui = Atkinson_Hyperlegible({
  variable: '--font-ui',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
});

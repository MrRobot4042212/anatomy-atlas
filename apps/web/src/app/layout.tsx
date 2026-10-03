import type { Metadata } from 'next';
import { Atkinson_Hyperlegible, EB_Garamond, Geist_Mono } from 'next/font/google';
import './globals.css';

// UI face: designed for legibility over long reading sessions, which is what studying is.
const ui = Atkinson_Hyperlegible({
  variable: '--font-ui',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
});

// Latin nomenclature: an italic from the typographic era of the first printed anatomies.
const latin = EB_Garamond({
  variable: '--font-latin',
  subsets: ['latin', 'latin-ext'],
  style: ['italic', 'normal'],
  weight: ['400', '500'],
});

// Codes and measurements only.
const data = Geist_Mono({
  variable: '--font-data',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Wazo Anatomy',
  description: 'Atlas 3D interactivo de anatomía humana con nomenclatura Terminologia Anatomica.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${ui.variable} ${latin.variable} ${data.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

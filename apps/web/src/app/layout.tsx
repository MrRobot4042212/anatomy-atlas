import type { Metadata } from 'next';
import { ui } from '@/fonts/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wazo Anatomy',
  description: 'Atlas 3D interactivo de anatomía humana con nomenclatura Terminologia Anatomica.',
  applicationName: 'Wazo Anatomy',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${ui.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

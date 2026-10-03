import Link from 'next/link';
import type { AssetBundle } from '@atlas/shared';
import { SearchBox } from '@/features/viewer/SearchBox';
import { LayerSummary } from '@/features/viewer/LayerSummary';

export function Header({ bundles }: { bundles: AssetBundle[] }) {
  return (
    <header className="grid h-12 grid-cols-[280px_1fr_340px] items-center border-b border-hairline bg-panel px-4 max-lg:grid-cols-[auto_1fr]">
      <Link
        href="/"
        className="flex items-baseline gap-1.5 rounded-xs"
        aria-label="Wazo Anatomy, inicio"
      >
        <span className="text-[13px] font-bold tracking-[0.2em] text-ink">WAZO</span>
        <span className="font-latin text-[19px] leading-none text-ink">Anatomy</span>
      </Link>
      <div className="flex justify-center px-4">
        <SearchBox />
      </div>
      <div className="flex justify-end max-lg:hidden">
        <LayerSummary bundles={bundles} />
      </div>
    </header>
  );
}

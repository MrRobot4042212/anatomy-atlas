import Image from 'next/image';
import Link from 'next/link';
import type { AssetBundle } from '@atlas/shared';
import { SearchBox } from '@/features/viewer/SearchBox';
import { LayerSummary } from '@/features/viewer/LayerSummary';

function Brand() {
  return (
    <>
      <Image src="/brand/wazo-mark.svg" alt="" width={22} height={22} priority />
      <Image src="/brand/wazo-logo.svg" alt="WAZO" width={68} height={18} priority />
      <span className="font-latin mt-px text-[19px] leading-none text-ink">Anatomy</span>
    </>
  );
}

/**
 * `embedded`: inside a host's iframe the brand is not a link, because navigating to `/` would
 * leave embed mode (and drop the bridge) inside the host's frame.
 */
export function Header({
  bundles,
  embedded = false,
}: {
  bundles: AssetBundle[];
  embedded?: boolean;
}) {
  return (
    <header className="grid h-12 grid-cols-[280px_1fr_340px] items-center border-b border-hairline bg-panel px-4 max-lg:grid-cols-[auto_1fr]">
      {embedded ? (
        <div className="flex items-center gap-2.5">
          <Brand />
        </div>
      ) : (
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xs"
          aria-label="Wazo Anatomy, inicio"
        >
          <Brand />
        </Link>
      )}
      <div className="flex justify-center px-4">
        <SearchBox />
      </div>
      <div className="flex justify-end max-lg:hidden">
        <LayerSummary bundles={bundles} />
      </div>
    </header>
  );
}

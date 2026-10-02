import { Credits } from '@/components/Credits';
import { AnatomyViewer } from '@/features/viewer/AnatomyViewer';
import { InfoPanel } from '@/features/viewer/InfoPanel';
import { LayerPanel } from '@/features/viewer/LayerPanel';
import { api } from '@/lib/api';

export default async function Home() {
  const bundles = await api.bundles();

  return (
    <div className="grid h-screen grid-rows-[1fr_auto] bg-neutral-950">
      <div className="grid min-h-0 grid-cols-[240px_1fr_320px]">
        <LayerPanel bundles={bundles} />
        <main className="relative min-h-0">
          <AnatomyViewer bundles={bundles} />
        </main>
        <InfoPanel />
      </div>
      <Credits />
    </div>
  );
}

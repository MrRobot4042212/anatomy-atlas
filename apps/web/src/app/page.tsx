import { Credits } from '@/components/Credits';
import { Header } from '@/components/Header';
import { AnatomyViewer } from '@/features/viewer/AnatomyViewer';
import { HierarchyTree } from '@/features/viewer/HierarchyTree';
import { InfoPanel } from '@/features/viewer/InfoPanel';
import { LayerPanel } from '@/features/viewer/LayerPanel';
import { ViewerToolbar } from '@/features/viewer/ViewerToolbar';
import { api } from '@/lib/api';

export default async function Home() {
  const bundles = await api.bundles();

  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] bg-ground">
      <Header bundles={bundles} />
      <div className="grid min-h-0 grid-cols-[280px_1fr_340px] max-lg:grid-cols-1 max-lg:grid-rows-[60vh_auto_auto] max-lg:overflow-y-auto">
        <aside className="flex min-h-0 flex-col overflow-y-auto border-r border-hairline bg-panel max-lg:order-2 max-lg:border-r-0 max-lg:border-t">
          <LayerPanel bundles={bundles} />
          <HierarchyTree />
        </aside>
        <main className="relative min-h-0 max-lg:order-1">
          <AnatomyViewer bundles={bundles} />
          <ViewerToolbar />
        </main>
        <aside className="min-h-0 overflow-y-auto border-l border-hairline bg-panel max-lg:order-3 max-lg:border-l-0 max-lg:border-t">
          <InfoPanel />
        </aside>
      </div>
      <Credits />
    </div>
  );
}

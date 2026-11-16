import { Credits } from '@/components/Credits';
import { Header } from '@/components/Header';
import { indexMeshes } from '@/features/embed/commands';
import { DeepLinkSelection } from '@/features/embed/DeepLinkSelection';
import { firstParam, isEmbedFlag, resolveDeepLink } from '@/features/embed/deepLink';
import { EmbedBridge } from '@/features/embed/EmbedBridge';
import { parseAllowedOrigins } from '@/features/embed/origins';
import { AnatomyViewer } from '@/features/viewer/AnatomyViewer';
import { InfoPanel } from '@/features/viewer/InfoPanel';
import { LeftRail } from '@/features/viewer/LeftRail';
import { ViewerToolbar } from '@/features/viewer/ViewerToolbar';
import { api } from '@/lib/api';

// The bundle list comes from the catalog API and changes with every asset-pipeline run, so the
// page renders at request time. Prerendering it would bake a stale list into the build and make
// `next build` depend on a live API. Rendering at request time is also what lets the embed
// allowlist (`EMBED_ALLOWED_ORIGINS`) be read at runtime instead of frozen at build.
export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: PageProps<'/'>) {
  const [bundles, params] = await Promise.all([api.bundles(), searchParams]);
  const embedded = isEmbedFlag(firstParam(params.embed));
  const deepLink = resolveDeepLink(firstParam(params.mesh), indexMeshes(bundles));
  const allowedOrigins = embedded
    ? parseAllowedOrigins(process.env.EMBED_ALLOWED_ORIGINS).origins
    : [];

  return (
    <div
      className={
        // Embedded: pinned to the frame, so the host never gets an inner page scrollbar; rails
        // still scroll on their own and the credits row stays on screen.
        embedded
          ? 'fixed inset-0 grid grid-rows-[auto_1fr_auto] overflow-hidden overscroll-none bg-ground'
          : 'grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-ground'
      }
    >
      <Header bundles={bundles} embedded={embedded} />
      <div className="grid min-h-0 min-w-0 grid-cols-[280px_minmax(0,1fr)_340px] max-lg:grid-cols-1 max-lg:grid-rows-[60vh_auto_auto] max-lg:overflow-y-auto">
        <aside className="flex min-h-0 flex-col overflow-y-auto border-r border-hairline bg-panel max-lg:order-2 max-lg:border-r-0 max-lg:border-t">
          <LeftRail bundles={bundles} />
        </aside>
        <main className="relative min-h-0 min-w-0 overflow-hidden max-lg:order-1">
          <AnatomyViewer bundles={bundles} />
          <ViewerToolbar />
        </main>
        <aside className="min-h-0 overflow-y-auto border-l border-hairline bg-panel max-lg:order-3 max-lg:border-l-0 max-lg:border-t">
          <InfoPanel />
        </aside>
      </div>
      <Credits embedded={embedded} />
      {/* The bridge mounts before the deep link so the host also hears about that selection. */}
      {embedded ? <EmbedBridge allowedOrigins={allowedOrigins} bundles={bundles} /> : null}
      {deepLink ? <DeepLinkSelection meshId={deepLink} bundles={bundles} /> : null}
    </div>
  );
}

'use client';

import type { AssetBundle } from '@atlas/shared';
import { useViewerStore } from './store';

/** Live count of what is on screen: layers and structures. */
export function LayerSummary({ bundles }: { bundles: AssetBundle[] }) {
  const visible = useViewerStore((s) => s.visibleSystems);
  const active = bundles.filter((b) => visible.has(b.system));
  const structures = active.reduce((n, b) => n + b.meshCount, 0);
  return (
    <p className="tabular text-xs text-ink-faint">
      <span className="text-ink-muted">{active.length}</span> de {bundles.length} capas ·{' '}
      <span className="text-ink-muted">{structures.toLocaleString('es-ES')}</span> estructuras
    </p>
  );
}

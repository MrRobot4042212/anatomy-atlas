'use client';

import { BODY_SYSTEMS, type AssetBundle, type BodySystem } from '@atlas/shared';
import { useViewerStore } from './store';

const LABELS: Record<BodySystem, string> = {
  skeletal: 'Esquelético',
  muscular: 'Muscular',
  cardiovascular: 'Cardiovascular',
  nervous: 'Nervioso',
  lymphatic: 'Linfático',
  digestive: 'Digestivo',
  respiratory: 'Respiratorio',
  urinary: 'Urinario',
  reproductive: 'Reproductor',
  endocrine: 'Endocrino',
  integumentary: 'Tegumentario',
};

function formatBytes(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

export function LayerPanel({ bundles }: { bundles: AssetBundle[] }) {
  const visible = useViewerStore((s) => s.visibleSystems);
  const toggle = useViewerStore((s) => s.toggleSystem);
  const hiddenCount = useViewerStore((s) => s.hidden.size);
  const unhideAll = useViewerStore((s) => s.unhideAll);
  const available = new Map(bundles.map((b) => [b.system, b]));

  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto border-r border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-200">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Sistemas</h2>
      <ul className="flex flex-col gap-1">
        {BODY_SYSTEMS.map((system) => {
          const bundle = available.get(system);
          const checked = visible.has(system);
          return (
            <li key={system}>
              <label
                className={`flex items-center gap-3 rounded-md px-2 py-1.5 ${bundle ? 'cursor-pointer hover:bg-neutral-900' : 'cursor-not-allowed text-neutral-600'}`}
              >
                <input
                  type="checkbox"
                  className="accent-orange-500"
                  checked={checked}
                  disabled={!bundle}
                  onChange={() => toggle(system)}
                />
                <span className="flex-1">{LABELS[system]}</span>
                <span className="text-xs text-neutral-500">
                  {bundle ? `${bundle.meshCount} · ${formatBytes(bundle.sizeBytes)}` : 'pendiente'}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={unhideAll}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-left text-xs hover:bg-neutral-900"
        >
          Mostrar {hiddenCount} estructura{hiddenCount === 1 ? '' : 's'} oculta
          {hiddenCount === 1 ? '' : 's'}
        </button>
      ) : null}
    </aside>
  );
}

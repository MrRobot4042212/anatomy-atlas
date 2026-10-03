'use client';

import { useState } from 'react';
import { BODY_SYSTEMS, type AssetBundle, type BodySystem } from '@atlas/shared';
import { subsystemKey, useViewerStore } from './store';

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

const SUBSYSTEM_LABELS: Record<string, string> = {
  heart: 'Corazón',
  arteries: 'Arterias',
  veins: 'Venas',
  pulmonary: 'Vasos pulmonares',
  joints: 'Articulaciones',
  central: 'Sistema nervioso central',
  peripheral: 'Sistema nervioso periférico',
  'sense-organs': 'Órganos de los sentidos',
  other: 'Otros',
};

/** Subsystem lists longer than this start collapsed (the skeletal system has 12). */
const AUTO_EXPAND_MAX = 4;

function subsystemLabel(key: string): string {
  return SUBSYSTEM_LABELS[key] ?? key.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

export function LayerPanel({ bundles }: { bundles: AssetBundle[] }) {
  const visible = useViewerStore((s) => s.visibleSystems);
  const hiddenSubsystems = useViewerStore((s) => s.hiddenSubsystems);
  const toggle = useViewerStore((s) => s.toggleSystem);
  const toggleSubsystem = useViewerStore((s) => s.toggleSubsystem);
  const hiddenCount = useViewerStore((s) => s.hidden.size);
  const unhideAll = useViewerStore((s) => s.unhideAll);
  const available = new Map(bundles.map((b) => [b.system, b]));
  const [expanded, setExpanded] = useState<Set<BodySystem>>(
    () =>
      new Set(
        bundles
          .filter((b) => Object.keys(b.subsystems).length <= AUTO_EXPAND_MAX)
          .map((b) => b.system),
      ),
  );
  const toggleExpanded = (system: BodySystem) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(system)) next.delete(system);
      else next.add(system);
      return next;
    });

  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto border-r border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-200">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Sistemas</h2>
      <ul className="flex flex-col gap-1">
        {BODY_SYSTEMS.map((system) => {
          const bundle = available.get(system);
          const checked = visible.has(system);
          const subsystems = bundle ? Object.entries(bundle.subsystems) : [];
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
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate">{LABELS[system]}</span>
                  <span className="text-[11px] text-neutral-500">
                    {bundle
                      ? `${bundle.meshCount} estructuras · ${formatBytes(bundle.sizeBytes)}`
                      : 'pendiente'}
                  </span>
                </span>
                {checked && subsystems.length > 1 ? (
                  <button
                    type="button"
                    aria-label={
                      expanded.has(system) ? 'Contraer subsistemas' : 'Expandir subsistemas'
                    }
                    aria-expanded={expanded.has(system)}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleExpanded(system);
                    }}
                    className="w-4 shrink-0 text-center text-[10px] text-neutral-500 hover:text-neutral-200"
                  >
                    {expanded.has(system) ? '▾' : '▸'}
                  </button>
                ) : null}
              </label>
              {checked && subsystems.length > 1 && expanded.has(system) ? (
                <ul className="mb-1 ml-7 flex flex-col">
                  {subsystems.map(([subsystem, meshIds]) => {
                    const key = subsystemKey(system, subsystem);
                    return (
                      <li key={key}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-neutral-900">
                          <input
                            type="checkbox"
                            className="accent-orange-400"
                            checked={!hiddenSubsystems.has(key)}
                            onChange={() => toggleSubsystem(key)}
                          />
                          <span className="flex-1 truncate">{subsystemLabel(subsystem)}</span>
                          <span className="text-[10px] text-neutral-600">{meshIds.length}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
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

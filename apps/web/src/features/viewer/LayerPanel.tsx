'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BODY_SYSTEMS, type AssetBundle, type BodySystem } from '@atlas/shared';
import { subsystemKey, useViewerStore } from './store';

export const SYSTEM_LABELS: Record<BodySystem, string> = {
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

export function subsystemLabel(key: string): string {
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
    <section aria-labelledby="layers-heading" className="flex flex-col">
      <h2
        id="layers-heading"
        className="px-4 pt-4 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint"
      >
        Capas
      </h2>
      <ul className="flex flex-col px-2">
        {BODY_SYSTEMS.map((system) => {
          const bundle = available.get(system);
          const checked = visible.has(system);
          const subsystems = bundle ? Object.entries(bundle.subsystems) : [];
          const isExpanded = expanded.has(system);
          return (
            <li key={system}>
              <div
                className={`flex items-center gap-2.5 rounded-xs px-2 py-1.5 ${bundle ? 'hover:bg-raised' : ''}`}
              >
                <input
                  id={`layer-${system}`}
                  type="checkbox"
                  className="size-3.5 accent-accent"
                  checked={checked}
                  disabled={!bundle}
                  onChange={() => toggle(system)}
                />
                <label
                  htmlFor={`layer-${system}`}
                  className={`flex min-w-0 flex-1 flex-col leading-tight ${bundle ? 'cursor-pointer' : 'text-ink-faint'}`}
                >
                  <span className="truncate text-[13px]">{SYSTEM_LABELS[system]}</span>
                  <span className="tabular text-[11px] text-ink-faint">
                    {bundle
                      ? `${bundle.meshCount} estructuras · ${formatBytes(bundle.sizeBytes)}`
                      : 'modelo pendiente'}
                  </span>
                </label>
                {checked && subsystems.length > 1 ? (
                  <button
                    type="button"
                    aria-label={isExpanded ? 'Contraer subsistemas' : 'Expandir subsistemas'}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(system)}
                    className="rounded-xs p-0.5 text-ink-faint hover:text-ink"
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : null}
              </div>
              {checked && subsystems.length > 1 && isExpanded ? (
                <ul className="mb-1 ml-5 flex flex-col border-l border-hairline pl-1">
                  {subsystems.map(([subsystem, meshIds]) => {
                    const key = subsystemKey(system, subsystem);
                    const id = `sub-${system}-${subsystem}`;
                    return (
                      <li key={key}>
                        <div className="flex items-center gap-2 rounded-xs px-2 py-1 hover:bg-raised">
                          <input
                            id={id}
                            type="checkbox"
                            className="size-3 accent-accent"
                            checked={!hiddenSubsystems.has(key)}
                            onChange={() => toggleSubsystem(key)}
                          />
                          <label
                            htmlFor={id}
                            className="flex min-w-0 flex-1 cursor-pointer items-baseline gap-2 text-xs"
                          >
                            <span className="truncate">{subsystemLabel(subsystem)}</span>
                            <span className="tabular ml-auto text-[10px] text-ink-faint">
                              {meshIds.length}
                            </span>
                          </label>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

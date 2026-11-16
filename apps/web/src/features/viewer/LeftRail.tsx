'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { AssetBundle } from '@atlas/shared';
import { HierarchyTree } from './HierarchyTree';
import { LayerPanel } from './LayerPanel';

const TABS = [
  { id: 'layers', label: 'Capas' },
  { id: 'tree', label: 'Jerarquía' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/**
 * The left rail: "Capas" (systems, then the region and side filter) and "Jerarquía" (the tree), as
 * WAI-ARIA tabs with automatic activation. The tablist is one tab stop (arrows, Home, End). The
 * rail fills its column and scrolls inside the active panel, so the tabs stay in place.
 * The tree mounts the first time its tab opens (it fetches per visible system) and then stays
 * mounted, hidden, so its expansion and focus survive switching tabs.
 */
export function LeftRail({ bundles }: { bundles: AssetBundle[] }) {
  const [active, setActive] = useState<TabId>('layers');
  const [treeMounted, setTreeMounted] = useState(false);
  const tabs = useRef(new Map<TabId, HTMLButtonElement>());
  const baseId = useId();
  const tabId = (id: TabId) => `${baseId}-tab-${id}`;
  const panelId = (id: TabId) => `${baseId}-panel-${id}`;

  const activate = (id: TabId) => {
    setActive(id);
    if (id === 'tree') setTreeMounted(true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((t) => t.id === active);
    const next =
      e.key === 'ArrowRight'
        ? (index + 1) % TABS.length
        : e.key === 'ArrowLeft'
          ? (index - 1 + TABS.length) % TABS.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? TABS.length - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    const id = TABS[next].id;
    activate(id);
    tabs.current.get(id)?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="tablist"
        aria-label="Panel izquierdo"
        onKeyDown={onKeyDown}
        className="flex shrink-0 gap-1 border-b border-hairline px-2"
      >
        {TABS.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                if (el) tabs.current.set(t.id, el);
                else tabs.current.delete(t.id);
              }}
              type="button"
              role="tab"
              id={tabId(t.id)}
              aria-selected={selected}
              aria-controls={panelId(t.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => activate(t.id)}
              className={`relative h-11 px-3 text-sm font-medium transition-colors ${
                selected ? 'text-ink' : 'text-ink-faint hover:text-ink'
              }`}
            >
              {t.label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full ${selected ? 'bg-accent-text' : 'bg-transparent'}`}
              />
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={panelId('layers')}
        aria-labelledby={tabId('layers')}
        hidden={active !== 'layers'}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <LayerPanel bundles={bundles} />
        {/*
          Region and side filter slot. The owner mounts RegionFilter here (another agent's
          component, "Región" and "Lado" below the systems, docs/design/interaction-model.md).
          Intentionally empty until then: nothing is rendered in its place.
        */}
      </div>

      <div
        role="tabpanel"
        id={panelId('tree')}
        aria-labelledby={tabId('tree')}
        hidden={active !== 'tree'}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        data-scroll-container
      >
        {treeMounted ? <HierarchyTree /> : null}
      </div>
    </div>
  );
}

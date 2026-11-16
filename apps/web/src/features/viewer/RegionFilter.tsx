'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { BODY_ZONES, type AssetBundle, type BodyZone } from '@atlas/shared';
import { entryBounds, registry } from './registry';
import {
  BACK_CONTEXT,
  BACK_VIEWBOX,
  FRONT_VIEWBOX,
  SIDE_OPTIONS,
  SILHOUETTE,
  ZONE_GROUPS,
  ZONE_LABELS,
  rovingIndex,
  shownMeshIds,
  soleZoneAfterToggle,
  structuresLabel,
  unionBounds,
  zoneIndex,
} from './regionFilter';
import { useViewerStore, type Bounds, type SideFilter } from './store';

/** Chips in the order the toolbar's arrow keys walk them (the groups, flattened). */
const CHIP_ORDER: BodyZone[] = ZONE_GROUPS.flatMap((g) => g.zones);

const chip =
  'h-10 rounded-full border px-3 text-sm whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45';
const chipOff = 'border-hairline-strong text-ink-strong hover:bg-raised hover:border-ink/60';
const chipOn = 'border-accent-text bg-accent-soft text-accent-text font-medium';

/**
 * "Which part of the body?": a zone filter (silhouette and chips) and a side filter. Zones come
 * from the bundles' `zones` index (asset pipeline, build_zones.py); side comes from the meshId.
 * Picking a zone so that it is the only one selected frames the camera on what that zone shows.
 */
export function RegionFilter({ bundles }: { bundles: AssetBundle[] }) {
  const zones = useViewerStore((s) => s.zones);
  const side = useViewerStore((s) => s.side);
  const visibleSystems = useViewerStore((s) => s.visibleSystems);
  const hiddenSubsystems = useViewerStore((s) => s.hiddenSubsystems);
  const hidden = useViewerStore((s) => s.hidden);
  const toggleZone = useViewerStore((s) => s.toggleZone);
  const setSide = useViewerStore((s) => s.setSide);
  const clearFilters = useViewerStore((s) => s.clearFilters);
  const focus = useViewerStore((s) => s.focus);

  const zoneOf = useMemo(() => zoneIndex(bundles), [bundles]);
  const hasZones = zoneOf.size > 0;
  const { shown, total } = useMemo(() => {
    const base = { visibleSystems, hiddenSubsystems, hidden };
    return {
      shown: shownMeshIds(bundles, zoneOf, { ...base, zones, side }).length,
      total: shownMeshIds(bundles, zoneOf, { ...base, zones: new Set(), side: 'both' }).length,
    };
  }, [bundles, zoneOf, visibleSystems, hiddenSubsystems, hidden, zones, side]);
  const active = zones.size > 0 || side !== 'both';

  /** Fit the camera to the loaded structures of one zone that the filters let through. */
  const frame = (zone: BodyZone, sideFilter: SideFilter) => {
    const s = useViewerStore.getState();
    const ids = shownMeshIds(bundles, zoneOf, {
      visibleSystems: s.visibleSystems,
      hiddenSubsystems: s.hiddenSubsystems,
      hidden: s.hidden,
      zones: new Set([zone]),
      side: sideFilter,
    });
    const boxes: Bounds[] = [];
    for (const id of ids) {
      const entry = registry.get(id);
      const b = entry ? entryBounds(entry) : null;
      if (b) boxes.push(b);
    }
    const bounds = unionBounds(boxes);
    if (bounds) focus(bounds);
  };

  const onZone = (zone: BodyZone) => {
    const sole = soleZoneAfterToggle(zones, zone);
    toggleZone(zone);
    if (sole) frame(sole, side);
  };

  const onSide = (next: SideFilter) => {
    setSide(next);
    if (zones.size === 1) frame([...zones][0], next);
  };

  // Roving focus: the chip list and the side control are one tab stop each.
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const onChipKey = (e: KeyboardEvent, index: number) => {
    const next = rovingIndex(e.key, index, CHIP_ORDER.length);
    if (next === null) return;
    e.preventDefault();
    setFocusIndex(next);
    chipRefs.current[next]?.focus();
  };
  const sideRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onSideKey = (e: KeyboardEvent, index: number) => {
    const next = rovingIndex(e.key, index, SIDE_OPTIONS.length);
    if (next === null) return;
    e.preventDefault();
    onSide(SIDE_OPTIONS[next].value);
    sideRefs.current[next]?.focus();
  };

  const zonePath = (zone: BodyZone) => {
    const on = zones.has(zone);
    return (
      <path
        key={zone}
        d={SILHOUETTE[zone].d}
        onClick={hasZones ? () => onZone(zone) : undefined}
        className={`stroke-panel transition-colors ${
          hasZones
            ? on
              ? 'cursor-pointer fill-accent-text/75 hover:fill-accent-text/90'
              : 'cursor-pointer fill-ink/16 hover:fill-ink/30'
            : 'fill-ink/8'
        }`}
        strokeWidth={2}
        strokeLinejoin="round"
      >
        <title>{ZONE_LABELS[zone]}</title>
      </path>
    );
  };
  const frontZones = BODY_ZONES.filter((z) => SILHOUETTE[z].view === 'front');
  const dimmedHalf = side === 'right' ? 'left' : side === 'left' ? 'right' : null;

  return (
    <section aria-labelledby="region-heading" className="flex flex-col gap-3 px-4 pt-2 pb-4">
      <div className="flex h-10 items-center justify-between gap-2">
        <h2 id="region-heading" className="text-sm text-ink-muted">
          Región
        </h2>
        {/* Fixed slot: the action is laid out always and only shown when it has work to do. */}
        <button
          type="button"
          onClick={clearFilters}
          className={`h-10 rounded-xs px-2 text-sm font-medium text-accent-text transition-colors hover:bg-raised ${active ? '' : 'invisible'}`}
        >
          Quitar filtros
        </button>
      </div>

      <p aria-live="polite" className="-mt-2 text-xs text-ink-faint">
        {active ? (
          <>
            <span className="tabular text-ink-strong">{shown}</span> de {structuresLabel(total)}{' '}
            visibles
          </>
        ) : (
          <>
            <span className="tabular text-ink-strong">{total.toLocaleString('es')}</span>{' '}
            {total === 1 ? 'estructura visible' : 'estructuras visibles'}, sin filtro
          </>
        )}
      </p>

      <div className="flex items-end justify-center gap-6" aria-hidden="true">
        <figure className="flex flex-col items-center gap-1">
          <svg
            viewBox={`0 0 ${FRONT_VIEWBOX.width} ${FRONT_VIEWBOX.height}`}
            className="h-[232px] w-auto"
          >
            {frontZones.map(zonePath)}
            {dimmedHalf ? (
              <rect
                x={dimmedHalf === 'left' ? FRONT_VIEWBOX.width / 2 : 0}
                y={0}
                width={FRONT_VIEWBOX.width / 2}
                height={FRONT_VIEWBOX.height}
                className="pointer-events-none fill-panel/70"
              />
            ) : null}
          </svg>
          {/* Anterior view: the subject's right is on the viewer's left. */}
          <figcaption className="flex w-full justify-between text-xs text-ink-faint">
            <span>Der.</span>
            <span>Izq.</span>
          </figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-1">
          <svg
            viewBox={`0 0 ${BACK_VIEWBOX.width} ${BACK_VIEWBOX.height}`}
            className="h-[116px] w-auto"
          >
            <ellipse {...BACK_CONTEXT.head} className="fill-ink/6" />
            <path d={BACK_CONTEXT.neck} className="fill-ink/6" />
            <path d={BACK_CONTEXT.pelvis} className="fill-ink/6" />
            {zonePath('back')}
          </svg>
          <figcaption className="text-xs text-ink-faint">Posterior</figcaption>
        </figure>
      </div>

      {hasZones ? null : (
        <p className="text-xs text-ink-muted">
          Zonas pendientes: el catálogo aún no trae la zona de cada estructura. El lado ya filtra.
        </p>
      )}

      <div role="toolbar" aria-label="Zonas del cuerpo" className="flex flex-col gap-3">
        {ZONE_GROUPS.map((group) => (
          <div
            key={group.label}
            role="group"
            aria-label={group.label}
            className="flex flex-col gap-2"
          >
            <span className="text-xs text-ink-faint" aria-hidden="true">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-2">
              {group.zones.map((zone) => {
                const index = CHIP_ORDER.indexOf(zone);
                const on = zones.has(zone);
                return (
                  <button
                    key={zone}
                    ref={(el) => {
                      chipRefs.current[index] = el;
                    }}
                    type="button"
                    aria-pressed={on}
                    disabled={!hasZones}
                    tabIndex={index === focusIndex ? 0 : -1}
                    onFocus={() => setFocusIndex(index)}
                    onKeyDown={(e) => onChipKey(e, index)}
                    onClick={() => onZone(zone)}
                    className={`${chip} ${on ? chipOn : chipOff}`}
                  >
                    {ZONE_LABELS[zone]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <span id="side-label" className="text-xs text-ink-faint">
          Lado
        </span>
        <div
          role="radiogroup"
          aria-labelledby="side-label"
          className="grid grid-cols-3 gap-1 rounded-sm border border-hairline p-1"
        >
          {SIDE_OPTIONS.map((option, index) => {
            const checked = side === option.value;
            return (
              <button
                key={option.value}
                ref={(el) => {
                  sideRefs.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onKeyDown={(e) => onSideKey(e, index)}
                onClick={() => onSide(option.value)}
                className={`h-10 rounded-xs text-sm transition-colors ${
                  checked
                    ? 'bg-accent-soft font-medium text-accent-text'
                    : 'text-ink-muted hover:bg-raised hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronRight, Contrast, Eye, EyeOff } from 'lucide-react';
import { BODY_SYSTEMS, type AssetBundle, type BodySystem } from '@atlas/shared';
import { gridKeyMove, keyAt, positionOf, type GridMatrix, type GridPosition } from './gridNav';
import { subsystemKey, useViewerStore, type SystemDepth } from './store';

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
  'vertebral-column': 'Columna vertebral',
  'axial-skeleton': 'Esqueleto axial',
  'appendicular-skeleton': 'Esqueleto apendicular',
  'thoracic-skeleton': 'Esqueleto torácico',
  'bones-of-upper-limb': 'Huesos del miembro superior',
  'bones-of-lower-limb': 'Huesos del miembro inferior',
  cranium: 'Cráneo',
  'extracranial-bones-of-head': 'Huesos extracraneales de la cabeza',
  'auditory-ossicles': 'Huesecillos del oído',
  teeth: 'Dientes',
  muscles: 'Músculos',
  fascia: 'Fascias',
  bursae: 'Bolsas sinoviales',
  'tendon-sheaths': 'Vainas tendinosas',
  'cranial-part-of-muscular-system': 'Músculos de la cabeza',
  'cervical-part-of-muscular-system': 'Músculos del cuello',
  'dorsal-part-of-muscular-system': 'Músculos del dorso',
  'thoracic-part-of-muscular-system': 'Músculos del tórax',
  'abdominal-part-of-muscular-system': 'Músculos del abdomen',
  'muscular-system-of-upper-limb': 'Músculos del miembro superior',
  'muscular-system-of-lower-limb': 'Músculos del miembro inferior',
  integument: 'Tegumento',
  other: 'Otros',
};

export function subsystemLabel(key: string): string {
  return SUBSYSTEM_LABELS[key] ?? key.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

const DEPTHS: { depth: SystemDepth; label: string; icon: ReactNode }[] = [
  { depth: 'visible', label: 'Visible', icon: <Eye size={16} aria-hidden="true" /> },
  { depth: 'translucent', label: 'Translúcido', icon: <Contrast size={16} aria-hidden="true" /> },
  { depth: 'hidden', label: 'Oculto', icon: <EyeOff size={16} aria-hidden="true" /> },
];

/** Cell keys of the grid; one per focusable control. */
const cellKey = {
  disclosure: (system: BodySystem) => `${system}:subsystems`,
  depth: (system: BodySystem, depth: SystemDepth) => `${system}:${depth}`,
  showAll: (system: BodySystem) => `${system}:show-all`,
  subsystem: (key: string) => `sub:${key}`,
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The systems as a layout grid: one tab stop for the whole list, arrows between controls (see
 * `gridNav.ts`). Each system has a depth (visible, translucent, hidden) and, when its bundle has
 * several subsystems, a disclosure with one toggle per subsystem.
 */
export function LayerPanel({ bundles }: { bundles: AssetBundle[] }) {
  const visible = useViewerStore((s) => s.visibleSystems);
  const translucent = useViewerStore((s) => s.translucentSystems);
  const hiddenSubsystems = useViewerStore((s) => s.hiddenSubsystems);
  const setDepth = useViewerStore((s) => s.setSystemDepth);
  const toggleSubsystem = useViewerStore((s) => s.toggleSubsystem);
  const available = new Map(bundles.map((b) => [b.system, b]));

  // Collapsed by default: eleven systems with their subsystems open is the clutter the evaluation
  // measured (69 controls on the default screen).
  const [expanded, setExpanded] = useState<ReadonlySet<BodySystem>>(() => new Set());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const position = useRef<GridPosition | null>(null);
  const cells = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    cells.current.get(key)?.focus();
  });

  const depthOf = (system: BodySystem): SystemDepth =>
    !visible.has(system) ? 'hidden' : translucent.has(system) ? 'translucent' : 'visible';

  const rows = BODY_SYSTEMS.map((system) => {
    const bundle = available.get(system);
    const subsystems = bundle ? Object.entries(bundle.subsystems) : [];
    const hidden = subsystems
      .map(([sub]) => subsystemKey(system, sub))
      .filter((key) => hiddenSubsystems.has(key));
    return {
      system,
      bundle,
      subsystems,
      hidden,
      expandable: subsystems.length > 1,
      isExpanded: subsystems.length > 1 && expanded.has(system),
    };
  });

  const matrix: string[][] = [];
  for (const row of rows) {
    if (!row.bundle) continue;
    matrix.push([
      ...(row.expandable ? [cellKey.disclosure(row.system)] : []),
      ...DEPTHS.map((d) => cellKey.depth(row.system, d.depth)),
    ]);
    if (!row.isExpanded) continue;
    if (row.hidden.length > 0) matrix.push([cellKey.showAll(row.system)]);
    for (const [sub] of row.subsystems) {
      matrix.push([cellKey.subsystem(subsystemKey(row.system, sub))]);
    }
  }
  const tabStop = activeKey && positionOf(matrix, activeKey) ? activeKey : (matrix[0]?.[0] ?? null);

  const cellProps = (key: string) => ({
    'data-cell': key,
    tabIndex: key === tabStop ? 0 : -1,
    ref: (el: HTMLElement | null) => {
      if (el) cells.current.set(key, el);
      else cells.current.delete(key);
    },
  });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const key = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]')?.dataset.cell;
    if (!key) return;
    const here = positionOf(matrix as GridMatrix, key);
    if (!here) return;
    // Keep the column the reader wanted while crossing narrower rows.
    const from =
      position.current && keyAt(matrix, position.current) === key ? position.current : here;
    const next = gridKeyMove(matrix, from, e.key, e.ctrlKey || e.metaKey);
    if (!next) return;
    e.preventDefault();
    position.current = next;
    const target = keyAt(matrix, next);
    if (target) {
      setActiveKey(target);
      cells.current.get(target)?.focus();
    }
  };

  const toggleExpanded = (system: BodySystem) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(system)) next.delete(system);
      else next.add(system);
      return next;
    });

  return (
    <section aria-labelledby="layers-heading" className="flex flex-col pb-2">
      <h2 id="layers-heading" className="px-4 pt-4 pb-2 text-sm text-ink-muted">
        Sistemas
      </h2>
      <div
        role="grid"
        aria-labelledby="layers-heading"
        aria-describedby="layers-hint"
        onKeyDown={onKeyDown}
        onFocus={(e) => {
          const key = (e.target as HTMLElement).dataset.cell;
          if (key && key !== activeKey) setActiveKey(key);
        }}
        className="flex flex-col px-2"
      >
        {rows.map((row) => {
          const { system, bundle } = row;
          const label = SYSTEM_LABELS[system];
          const depth = depthOf(system);
          if (!bundle) {
            return (
              <div key={system} role="row" className="flex h-11 items-center px-2">
                <div role="rowheader" className="flex min-w-0 flex-col leading-tight opacity-45">
                  <span className="truncate text-sm">{label}</span>
                  <span className="text-xs text-ink-faint">modelo pendiente</span>
                </div>
              </div>
            );
          }
          // One caption line at every state, so the mark never changes the row height. With hidden
          // subsystems the count drops its unit to make room (the rail leaves ~110 px for text).
          const caption =
            row.hidden.length > 0 ? (
              <span className="tabular flex items-center gap-1.5 whitespace-nowrap text-xs text-ink-faint">
                <span className="sr-only">
                  {plural(bundle.meshCount, 'estructura', 'estructuras')},
                </span>
                <span aria-hidden="true">{bundle.meshCount}</span>
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-accent-text"
                />
                <span className="text-accent-text" title="Subsistemas ocultos">
                  {plural(row.hidden.length, 'oculto', 'ocultos')}
                  <span className="sr-only">
                    {row.hidden.length === 1 ? ' (subsistema)' : ' (subsistemas)'}
                  </span>
                </span>
              </span>
            ) : (
              <span className="tabular whitespace-nowrap text-xs text-ink-faint">
                {plural(bundle.meshCount, 'estructura', 'estructuras')}
              </span>
            );
          const name = (
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span
                className={`truncate text-sm ${depth === 'hidden' ? 'text-ink-muted' : 'text-ink'}`}
              >
                {label}
              </span>
              {caption}
            </span>
          );
          return (
            <div key={system} role="rowgroup" className="flex flex-col">
              <div role="row" className="flex h-11 items-center gap-2 rounded-xs">
                <div role="rowheader" className="flex h-full min-w-0 flex-1">
                  {row.expandable ? (
                    <button
                      type="button"
                      {...cellProps(cellKey.disclosure(system))}
                      aria-expanded={row.isExpanded}
                      aria-label={`${label}: subsistemas`}
                      onClick={() => toggleExpanded(system)}
                      className="flex h-full min-w-0 flex-1 items-center gap-1 rounded-xs pr-1 text-left hover:bg-raised"
                    >
                      <ChevronRight
                        size={16}
                        aria-hidden="true"
                        className={`shrink-0 text-ink-faint transition-transform ${row.isExpanded ? 'rotate-90' : ''}`}
                      />
                      {name}
                    </button>
                  ) : (
                    <span className="flex min-w-0 flex-1 items-center pl-5">{name}</span>
                  )}
                </div>
                <div
                  role="presentation"
                  className="flex shrink-0 overflow-hidden rounded-xs border border-hairline-strong"
                >
                  {DEPTHS.map((d) => (
                    <div key={d.depth} role="gridcell">
                      <button
                        type="button"
                        {...cellProps(cellKey.depth(system, d.depth))}
                        aria-pressed={depth === d.depth}
                        aria-label={`${label}: ${d.label.toLowerCase()}`}
                        title={d.label}
                        onClick={() => setDepth(system, d.depth)}
                        className={`flex size-10 items-center justify-center transition-colors ${
                          depth === d.depth
                            ? 'bg-accent-soft text-accent-text'
                            : 'text-ink-faint hover:bg-raised hover:text-ink'
                        }`}
                      >
                        {d.icon}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {row.isExpanded ? (
                <div className="mb-1 ml-[11px] flex flex-col border-l border-hairline pl-2">
                  {row.hidden.length > 0 ? (
                    <div role="row">
                      <div role="gridcell">
                        <button
                          type="button"
                          {...cellProps(cellKey.showAll(system))}
                          onClick={() => {
                            // This button disappears with the last hidden subsystem; hand the
                            // focus to the system's disclosure instead of dropping it to the page.
                            pendingFocus.current = cellKey.disclosure(system);
                            row.hidden.forEach((key) => toggleSubsystem(key));
                          }}
                          className="flex h-10 w-full items-center rounded-xs px-2 text-left text-sm text-accent-text hover:bg-raised"
                        >
                          Mostrar todo {label.toLowerCase()}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {row.subsystems.map(([sub, meshIds]) => {
                    const key = subsystemKey(system, sub);
                    return (
                      <div key={key} role="row">
                        <div role="gridcell">
                          <label className="flex h-10 cursor-pointer items-center gap-3 rounded-xs px-2 hover:bg-raised">
                            <input
                              type="checkbox"
                              {...cellProps(cellKey.subsystem(key))}
                              className="size-5 shrink-0 cursor-pointer accent-accent"
                              checked={!hiddenSubsystems.has(key)}
                              onChange={() => toggleSubsystem(key)}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm">
                              {subsystemLabel(sub)}
                            </span>
                            <span className="tabular shrink-0 text-xs text-ink-faint">
                              {meshIds.length}
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p id="layers-hint" className="sr-only">
        Flechas para moverse entre sistemas y estados; Intro o Espacio para elegir.
      </p>
    </section>
  );
}

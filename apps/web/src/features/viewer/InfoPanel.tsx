'use client';

import {
  Component,
  Suspense,
  use,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import Image from 'next/image';
import { ArrowRight, ChevronRight, EyeOff } from 'lucide-react';
import type { Laterality, Structure, StructureDetail } from '@atlas/shared';
import { focusStructure, selectAndFocus } from './focusStructure';
import { familyOf, treeFor } from './hierarchy';
import { SYSTEM_LABELS, subsystemLabel } from './LayerPanel';
import { useViewerStore } from './store';
import { detailFor } from './structureDetail';

const LATERALITY: Record<Laterality, string> = {
  left: 'Izquierda',
  right: 'Derecha',
  midline: 'Línea media',
};
const SIDE_SHORT: Partial<Record<Laterality, string>> = { left: 'izq.', right: 'der.' };
const REGION: Record<string, string> = {
  head: 'Cabeza',
  neck: 'Cuello',
  thorax: 'Tórax',
  abdomen: 'Abdomen',
  pelvis: 'Pelvis',
  back: 'Espalda',
  'upper-limb': 'Miembro superior',
  'lower-limb': 'Miembro inferior',
};

type TabId = 'names' | 'content' | 'description';
const TABS: { id: TabId; label: string }[] = [
  { id: 'names', label: 'Nombres' },
  { id: 'content', label: 'Contenido' },
  { id: 'description', label: 'Descripción' },
];

/**
 * The specimen label, docked beside the canvas: the structure's identity, three tabs (names
 * and data, its place in the hierarchy, the description) and the four actions on the model.
 * The chosen tab survives a change of selection, so walking the hierarchy stays in Contenido.
 */
export function InfoPanel() {
  const selected = useViewerStore((s) => s.selected);
  const [tab, setTab] = useState<TabId>('names');
  // The chosen tab survives a change of selection, except the pending description: landing on an
  // empty placeholder instead of the names reads as a fault. Adjusted while rendering, the way
  // React recommends for state that follows a prop.
  const [seen, setSeen] = useState(selected);
  if (seen !== selected) {
    setSeen(selected);
    if (tab === 'description') setTab('names');
  }

  return (
    <section aria-label="Ficha de la estructura" className="flex h-full min-h-0 flex-col">
      {selected ? (
        <DetailBoundary key={selected}>
          <Suspense fallback={<LabelSkeleton />}>
            <Detail meshId={selected} tab={tab} onTab={setTab} />
          </Suspense>
        </DetailBoundary>
      ) : (
        <EmptyLabel />
      )}
    </section>
  );
}

/** Nothing selected: the hover readout and how to start. */
function EmptyLabel() {
  return (
    <>
      <div className="flex h-10 shrink-0 items-center border-b border-hairline px-4 text-sm text-ink-faint">
        <HoverName />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Image src="/brand/wazo-mark.svg" alt="" width={72} height={72} className="opacity-80" />
        <p className="font-latin text-[28px] text-ink-muted">Nomina anatomica</p>
        <p className="max-w-[30ch] text-sm text-ink-faint">
          Haz clic en una estructura, o búscala arriba, para ver su nombre en latín, español e
          inglés, su lugar en la jerarquía y sus medidas. Doble clic la enfoca.
        </p>
      </div>
    </>
  );
}

/**
 * The name of the structure under the pointer. The catalog is asked only once the pointer
 * rests on a structure for 200 ms, and each structure is fetched once per session.
 */
function HoverName() {
  const hovered = useViewerStore((s) => s.hovered);
  const [name, setName] = useState<{ meshId: string; label: string } | null>(null);

  useEffect(() => {
    if (!hovered) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      detailFor(hovered)
        .then((d) => {
          if (cancelled) return;
          const s = d.structure;
          const side = SIDE_SHORT[s.laterality];
          setName({
            meshId: hovered,
            label: `${s.names.es || s.names.en}${side ? ` ${side}` : ''}`,
          });
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hovered]);

  if (hovered && name?.meshId === hovered)
    return <span className="truncate text-ink">{name.label}</span>;
  if (hovered) return <span aria-hidden="true">…</span>;
  return <span>Pasa el cursor sobre el modelo para identificar</span>;
}

function LabelSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-5" aria-busy="true">
      <div className="h-8 w-3/4 rounded-xs bg-raised" />
      <div className="h-4 w-1/2 rounded-xs bg-raised" />
      <div className="mt-2 h-10 w-full rounded-xs bg-raised" />
      <div className="h-3 w-2/3 rounded-xs bg-raised" />
      <div className="h-3 w-1/2 rounded-xs bg-raised" />
    </div>
  );
}

class DetailBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <p className="px-4 pt-5 text-sm text-danger">
          La ficha no se pudo cargar: {this.state.error.message}. Vuelve a seleccionar la estructura
          para reintentar.
        </p>
      );
    }
    return this.props.children;
  }
}

function Detail({
  meshId,
  tab,
  onTab,
}: {
  meshId: string;
  tab: TabId;
  onTab: (tab: TabId) => void;
}) {
  const detail = use(detailFor(meshId));
  const { structure } = detail;
  const base = useId();
  const tabId = (id: TabId) => `${base}-tab-${id}`;
  const panelId = `${base}-panel`;

  return (
    <div className="label-settle flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-col gap-1 px-4 pt-4 pb-3">
        <h2 className="font-latin flex items-baseline gap-2 text-[32px] leading-[1.05] text-ink">
          <span
            aria-hidden="true"
            className="mb-1 inline-block size-2 shrink-0 rounded-full bg-scene-selected"
            title="Color de la estructura seleccionada en el modelo"
          />
          {structure.names.la || structure.names.en}
        </h2>
        <p className="text-base font-medium text-ink">
          {structure.names.es || structure.names.en}
          {SIDE_SHORT[structure.laterality] ? (
            <span className="text-ink-muted"> · {LATERALITY[structure.laterality]}</span>
          ) : null}
        </p>
      </header>

      <TabList tab={tab} onTab={onTab} tabId={tabId} panelId={panelId} />

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(tab)}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        {tab === 'names' ? <NamesTab detail={detail} /> : null}
        {tab === 'content' ? <ContentTab detail={detail} /> : null}
        {tab === 'description' ? <DescriptionTab structure={structure} /> : null}
      </div>

      <Actions meshId={meshId} />
    </div>
  );
}

/** WAI-ARIA tabs, automatic activation: arrows move and select, Home and End jump. */
function TabList({
  tab,
  onTab,
  tabId,
  panelId,
}: {
  tab: TabId;
  onTab: (tab: TabId) => void;
  tabId: (id: TabId) => string;
  panelId: string;
}) {
  const refs = useRef(new Map<TabId, HTMLButtonElement>());

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === 'ArrowRight'
        ? (i + 1) % TABS.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + TABS.length) % TABS.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? TABS.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    const id = TABS[next].id;
    onTab(id);
    refs.current.get(id)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Secciones de la ficha"
      onKeyDown={onKeyDown}
      className="flex shrink-0 gap-4 border-b border-hairline px-4"
    >
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            ref={(el) => {
              if (el) refs.current.set(t.id, el);
              else refs.current.delete(t.id);
            }}
            type="button"
            role="tab"
            id={tabId(t.id)}
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onTab(t.id)}
            className={`relative h-10 text-sm font-medium transition-colors ${active ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
          >
            {t.label}
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-colors ${active ? 'bg-accent-text' : 'bg-transparent'}`}
            />
          </button>
        );
      })}
    </div>
  );
}

const mm = (v: number) => Math.round(v * 1000);
const nameOf = (s: { names: { es: string; en: string } }) => s.names.es || s.names.en;

function NamesTab({ detail }: { detail: StructureDetail }) {
  const { structure, ancestors } = detail;
  const b = structure.bounds;
  const extents = b
    ? {
        width: mm(b.max[0] - b.min[0]),
        height: mm(b.max[1] - b.min[1]),
        depth: mm(b.max[2] - b.min[2]),
      }
    : null;
  const longest = extents ? Math.max(extents.width, extents.height, extents.depth) : 0;

  return (
    <div className="flex flex-col gap-5">
      {ancestors.length > 0 ? (
        <nav
          aria-label="Ubicación en la jerarquía"
          className="text-sm leading-relaxed text-ink-faint"
        >
          {ancestors.map((a, i) => (
            <span key={a.id}>
              {i > 0 ? <span aria-hidden="true"> › </span> : null}
              {nameOf(a)}
            </span>
          ))}
        </nav>
      ) : null}

      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-ink-faint">Latín</dt>
        <dd className="font-latin text-ink">{structure.names.la || '—'}</dd>
        <dt className="text-ink-faint">Español</dt>
        <dd className="text-ink">{structure.names.es || '—'}</dd>
        <dt className="text-ink-faint">Inglés</dt>
        <dd className="text-ink">{structure.names.en}</dd>
      </dl>

      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 border-t border-hairline pt-4 text-sm">
        <dt className="text-ink-faint">Código TA2</dt>
        <dd className="tabular text-ink">{structure.ta2Id ?? 'sin código oficial'}</dd>
        <dt className="text-ink-faint">Sistema</dt>
        <dd>
          {SYSTEM_LABELS[structure.system]}
          {structure.subsystem ? (
            <span className="text-ink-muted"> · {subsystemLabel(structure.subsystem)}</span>
          ) : null}
        </dd>
        <dt className="text-ink-faint">Región</dt>
        <dd>
          {structure.region ? (
            REGION[structure.region]
          ) : (
            <span className="text-ink-faint">sin asignar</span>
          )}
        </dd>
        <dt className="text-ink-faint">Lado</dt>
        <dd>{LATERALITY[structure.laterality]}</dd>
      </dl>

      {extents ? (
        <section aria-label="Medidas" className="flex flex-col gap-2 border-t border-hairline pt-4">
          <Caliper extents={extents} longest={longest} />
          <p className="text-xs text-ink-faint">
            Extensión de la geometría del modelo, no una medida clínica.
          </p>
        </section>
      ) : null}
    </div>
  );
}

/** A node of the hierarchy as a chip: structures select and frame, groups open in place. */
interface ChipItem {
  id: string;
  meshId: string | null;
  label: string;
  laterality: Laterality;
  /** A group with children that can be opened in the tab. */
  group: boolean;
}

const fromStructure = (s: Structure, group = false): ChipItem => ({
  id: s.id,
  meshId: s.meshId,
  label: nameOf(s),
  laterality: s.laterality,
  group,
});

/**
 * The structure's place in the hierarchy, from catalog data only: the breadcrumb to climb, the
 * parent, the siblings and the children. Climbing to a group shows its content here without
 * changing the selection, because groups have no geometry to select.
 */
function ContentTab({ detail }: { detail: StructureDetail }) {
  const { structure, ancestors, children } = detail;
  // The group shown instead of the selection's own family; null shows the selection.
  const [browsed, setBrowsed] = useState<{ id: string; label: string } | null>(null);
  const browse = browsed?.id ?? null;
  const setBrowse = (id: string | null) =>
    setBrowsed(id ? { id, label: nameOf(ancestors.find((a) => a.id === id) ?? structure) } : null);
  const parent = ancestors.at(-1);
  // A group below the selection (opened from a chip) is appended to the trail.
  const below = browsed && !ancestors.some((a) => a.id === browsed.id) ? browsed : null;

  const open = (item: ChipItem) => {
    if (item.meshId) selectAndFocus(item.meshId);
    else if (item.group) setBrowsed({ id: item.id, label: item.label });
  };

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Subir por la jerarquía">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
          {ancestors.map((a) => (
            <li key={a.id} className="flex items-center gap-1">
              <button
                type="button"
                aria-current={browse === a.id ? 'location' : undefined}
                onClick={() => setBrowse(a.id)}
                className={`min-h-8 rounded-xs px-1 text-left transition-colors hover:text-accent-text ${browse === a.id ? 'text-ink' : 'text-ink-muted'}`}
              >
                {nameOf(a)}
              </button>
              <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-ink-faint" />
            </li>
          ))}
          <li>
            <button
              type="button"
              aria-current={browse === null ? 'location' : undefined}
              onClick={() => setBrowse(null)}
              className={`min-h-8 rounded-xs px-1 text-left transition-colors hover:text-accent-text ${browse === null ? 'text-ink' : 'text-ink-muted'}`}
            >
              {nameOf(structure)}
            </button>
          </li>
          {below ? (
            <li className="flex items-center gap-1">
              <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-ink-faint" />
              <span aria-current="location" className="px-1 text-ink">
                {below.label}
              </span>
            </li>
          ) : null}
        </ol>
      </nav>

      {browsed ? (
        <>
          <Suspense fallback={<ChipsLoading />}>
            <BrowsedGroup
              system={structure.system}
              id={browsed.id}
              label={browsed.label}
              onOpen={open}
            />
          </Suspense>
          <button
            type="button"
            onClick={() => setBrowse(null)}
            className="btn btn-sm btn-outline self-start"
          >
            Volver a {nameOf(structure)}
          </button>
        </>
      ) : (
        <>
          <ChipSection title="Pertenece a">
            {parent ? (
              <ChipList items={[fromStructure(parent, true)]} onOpen={open} />
            ) : (
              <p className="text-sm text-ink-faint">Sin estructura superior en el catálogo.</p>
            )}
          </ChipSection>
          {parent ? (
            <Suspense
              fallback={
                <ChipSection title="Al mismo nivel">
                  <ChipsLoading />
                </ChipSection>
              }
            >
              <Siblings system={structure.system} id={structure.id} onOpen={open} />
            </Suspense>
          ) : null}
          <ChipSection title="Contiene" count={children.length}>
            {children.length > 0 ? (
              <ChipList items={children.map((c) => fromStructure(c, !c.meshId))} onOpen={open} />
            ) : (
              <p className="text-sm text-ink-faint">No tiene partes en el catálogo.</p>
            )}
          </ChipSection>
        </>
      )}
    </div>
  );
}

function Siblings({
  system,
  id,
  onOpen,
}: {
  system: Structure['system'];
  id: string;
  onOpen: (item: ChipItem) => void;
}) {
  const family = familyOf(use(treeFor(system)), id);
  const siblings = family?.siblings ?? [];
  return (
    <ChipSection title="Al mismo nivel" count={siblings.length}>
      {siblings.length > 0 ? (
        <ChipList
          items={siblings.map((n) => ({
            id: n.id,
            meshId: n.meshId,
            label: n.nameEs || n.name,
            laterality: n.laterality,
            group: n.children.length > 0,
          }))}
          onOpen={onOpen}
        />
      ) : (
        <p className="text-sm text-ink-faint">Es la única estructura de su grupo.</p>
      )}
    </ChipSection>
  );
}

function BrowsedGroup({
  system,
  id,
  label,
  onOpen,
}: {
  system: Structure['system'];
  id: string;
  label: string;
  onOpen: (item: ChipItem) => void;
}) {
  const family = familyOf(use(treeFor(system)), id);
  const children = family?.children ?? [];
  return (
    <ChipSection title={`Contenido de ${label}`} count={children.length}>
      {family ? (
        <ChipList
          items={children.map((n) => ({
            id: n.id,
            meshId: n.meshId,
            label: n.nameEs || n.name,
            laterality: n.laterality,
            group: n.children.length > 0,
          }))}
          onOpen={onOpen}
        />
      ) : (
        <p className="text-sm text-ink-faint">Este grupo no está en la jerarquía de su sistema.</p>
      )}
    </ChipSection>
  );
}

function ChipSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm text-ink-muted">
        {title}
        {count ? <span className="tabular text-ink-faint"> · {count}</span> : null}
      </h3>
      {children}
    </section>
  );
}

function ChipsLoading() {
  return (
    <div className="flex gap-2" aria-busy="true">
      <div className="h-8 w-24 rounded-full bg-raised" />
      <div className="h-8 w-16 rounded-full bg-raised" />
      <div className="h-8 w-20 rounded-full bg-raised" />
    </div>
  );
}

/** Long groups (the bones of the foot) show the first 24 and the rest on demand. */
const CHIP_LIMIT = 24;

function ChipList({ items, onOpen }: { items: ChipItem[]; onOpen: (item: ChipItem) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, CHIP_LIMIT);
  return (
    <ul className="flex flex-wrap gap-2">
      {shown.map((item) => (
        <li key={item.id}>
          <Chip item={item} onOpen={onOpen} />
        </li>
      ))}
      {items.length > shown.length ? (
        <li>
          <button
            type="button"
            onClick={() => setAll(true)}
            className="inline-flex min-h-8 items-center rounded-full px-3 text-sm text-accent-text hover:underline"
          >
            Mostrar {items.length - shown.length} más
          </button>
        </li>
      ) : null}
    </ul>
  );
}

function Chip({ item, onOpen }: { item: ChipItem; onOpen: (item: ChipItem) => void }) {
  const side = SIDE_SHORT[item.laterality];
  const inert = !item.meshId && !item.group;
  const body = (
    <>
      {item.meshId ? (
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-ink-faint" />
      ) : null}
      <span className="truncate">{item.label}</span>
      {side ? <span className="shrink-0 text-xs text-ink-faint">{side}</span> : null}
      {!item.meshId && item.group ? (
        <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-ink-faint" />
      ) : null}
    </>
  );
  const shape =
    'inline-flex max-w-full min-h-8 items-center gap-1.5 rounded-full border px-3 text-sm';
  if (inert) {
    return (
      <span
        className={`${shape} border-hairline text-ink-faint`}
        title="Sin geometría en el modelo"
      >
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      title={item.meshId ? 'Seleccionar y enfocar' : 'Ver su contenido'}
      className={`${shape} border-hairline-strong text-ink transition-colors hover:border-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.08)]`}
    >
      {body}
    </button>
  );
}

/** Real text when the catalog has it; otherwise the gap is stated, never filled. */
function DescriptionTab({ structure }: { structure: Structure }) {
  if (structure.description) {
    return <p className="text-sm leading-relaxed text-ink">{structure.description}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base font-medium text-ink">Descripción pendiente</p>
      <p className="text-sm text-ink-muted">
        Esta estructura todavía no tiene una descripción revisada. Aparecerá aquí cuando el
        contenido esté listo; hasta entonces la ficha muestra solo los datos del catálogo: nombres,
        código, jerarquía, región, lado y medidas.
      </p>
    </div>
  );
}

/** The four actions on the model: Enfocar (primary), two toggles and Ocultar. */
function Actions({ meshId }: { meshId: string }) {
  const hide = useViewerStore((s) => s.hide);
  const isolate = useViewerStore((s) => s.isolate);
  const clearIsolation = useViewerStore((s) => s.clearIsolation);
  const isIsolated = useViewerStore((s) => s.isolated === meshId);
  const toggleTransparent = useViewerStore((s) => s.toggleTransparent);
  const isTranslucent = useViewerStore((s) => s.transparent.has(meshId));

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-hairline p-4">
      <button
        type="button"
        onClick={() => focusStructure(meshId)}
        className="btn btn-primary w-full"
      >
        Enfocar
        <ArrowRight size={16} aria-hidden="true" />
      </button>
      <Toggle
        pressed={isIsolated}
        onClick={() => (isIsolated ? clearIsolation() : isolate(meshId))}
      >
        Aislar
      </Toggle>
      <Toggle pressed={isTranslucent} onClick={() => toggleTransparent(meshId)}>
        Translúcido
      </Toggle>
      <button type="button" onClick={() => hide(meshId)} className="btn btn-outline w-full">
        <EyeOff size={16} aria-hidden="true" />
        Ocultar
      </button>
    </div>
  );
}

/** A toggle button: the label never changes, `aria-pressed` and a small switch say the state. */
function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="btn btn-outline w-full"
    >
      {children}
      <span
        aria-hidden="true"
        className={`relative h-3.5 w-6 shrink-0 rounded-full border transition-colors ${pressed ? 'border-accent-text bg-accent' : 'border-hairline-strong bg-transparent'}`}
      >
        <span
          className={`absolute top-1/2 size-2 -translate-y-1/2 rounded-full transition-[left,background-color] ${pressed ? 'left-[13px] bg-ink' : 'left-0.5 bg-ink-faint'}`}
        />
      </span>
    </button>
  );
}

/**
 * The signature: a drawn caliper for the structure's three extents. Bars are proportional to
 * the longest extent; the numbers are the data, the bars are the comparison.
 */
function Caliper({
  extents,
  longest,
}: {
  extents: { width: number; height: number; depth: number };
  longest: number;
}) {
  const rows: { label: string; value: number }[] = [
    { label: 'Alto', value: extents.height },
    { label: 'Ancho', value: extents.width },
    { label: 'Fondo', value: extents.depth },
  ];
  return (
    <dl className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={r.label} className="grid grid-cols-[56px_1fr_72px] items-center gap-2 text-sm">
          <dt className="text-ink-faint">{r.label}</dt>
          <dd className="relative h-3">
            <svg
              viewBox="0 0 100 12"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <g
                className="caliper-draw"
                style={{ animationDelay: `${i * 60}ms` }}
                transform={`scale(${longest ? r.value / longest : 0} 1)`}
              >
                <line
                  x1="0"
                  y1="6"
                  x2="100"
                  y2="6"
                  stroke="var(--ink-muted)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="0"
                  y1="1"
                  x2="0"
                  y2="11"
                  stroke="var(--ink)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="100"
                  y1="1"
                  x2="100"
                  y2="11"
                  stroke="var(--ink)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            </svg>
          </dd>
          <dd className="tabular text-right text-ink">
            {r.value} <span className="text-ink-faint">mm</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

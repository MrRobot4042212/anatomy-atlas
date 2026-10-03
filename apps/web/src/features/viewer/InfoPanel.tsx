'use client';

import { Component, Suspense, use, type ReactNode } from 'react';
import Image from 'next/image';
import { Crosshair, EyeOff, Focus, Layers2 } from 'lucide-react';
import type { StructureDetail } from '@atlas/shared';
import { api } from '@/lib/api';
import { SYSTEM_LABELS, subsystemLabel } from './LayerPanel';
import { useViewerStore } from './store';

const LATERALITY: Record<string, string> = {
  left: 'Izquierda',
  right: 'Derecha',
  midline: 'Línea media',
};
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

// One promise per meshId, reused by React's `use()`; details never change during a session.
const detailPromises = new Map<string, Promise<StructureDetail>>();
function detailFor(meshId: string): Promise<StructureDetail> {
  let p = detailPromises.get(meshId);
  if (!p) {
    p = api.structure(meshId).catch((err: unknown) => {
      detailPromises.delete(meshId); // allow a retry on the next selection
      throw err;
    });
    detailPromises.set(meshId, p);
  }
  return p;
}

/** The specimen label: nomenclature, place in the hierarchy, measured size, actions. */
export function InfoPanel() {
  const selected = useViewerStore((s) => s.selected);
  const hovered = useViewerStore((s) => s.hovered);

  return (
    <section aria-label="Ficha de la estructura" className="flex h-full flex-col">
      <div className="flex h-8 items-center border-b border-hairline px-4 text-[11px] text-ink-faint">
        {hovered ? (
          <span className="font-mono">{hovered}</span>
        ) : (
          <span>Pasa el cursor sobre el modelo para identificar</span>
        )}
      </div>
      {selected ? (
        <DetailBoundary key={selected}>
          <Suspense fallback={<LabelSkeleton />}>
            <Detail meshId={selected} />
          </Suspense>
        </DetailBoundary>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <Image src="/brand/wazo-mark.svg" alt="" width={72} height={72} className="opacity-80" />
          <p className="font-latin text-2xl text-ink-muted">Nomina anatomica</p>
          <p className="max-w-[28ch] text-xs text-ink-faint">
            Haz clic en una estructura, o búscala arriba, para ver su nombre en latín, español e
            inglés, su posición en la jerarquía y sus medidas.
          </p>
        </div>
      )}
    </section>
  );
}

function LabelSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-5" aria-busy="true">
      <div className="h-3 w-1/2 rounded-xs bg-raised" />
      <div className="h-7 w-3/4 rounded-xs bg-raised" />
      <div className="h-4 w-1/3 rounded-xs bg-raised" />
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
        <p className="px-4 pt-5 text-xs text-danger">
          La ficha no se pudo cargar: {this.state.error.message}. Vuelve a seleccionar la estructura
          para reintentar.
        </p>
      );
    }
    return this.props.children;
  }
}

const mm = (v: number) => Math.round(v * 1000);

function Detail({ meshId }: { meshId: string }) {
  const { structure, ancestors, children } = use(detailFor(meshId));
  const select = useViewerStore((s) => s.select);
  const hide = useViewerStore((s) => s.hide);
  const focus = useViewerStore((s) => s.focus);
  const isolate = useViewerStore((s) => s.isolate);
  const clearIsolation = useViewerStore((s) => s.clearIsolation);
  const isolated = useViewerStore((s) => s.isolated);
  const toggleTransparent = useViewerStore((s) => s.toggleTransparent);
  const isTranslucent = useViewerStore((s) => s.transparent.has(meshId));
  const isIsolated = isolated === meshId;

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
    <div className="label-settle flex flex-col gap-5 overflow-y-auto px-4 pt-4 pb-6">
      <nav aria-label="Jerarquía" className="text-[11px] leading-relaxed text-ink-faint">
        {ancestors.map((a, i) => (
          <span key={a.id}>
            {i > 0 ? <span aria-hidden="true"> › </span> : null}
            {a.names.es || a.names.en}
          </span>
        ))}
      </nav>

      <header className="flex flex-col gap-1">
        <h2 className="font-latin flex items-baseline gap-2 text-[30px] leading-[1.05] text-ink">
          <span
            aria-hidden="true"
            className="mb-1 inline-block size-2 shrink-0 rounded-full bg-scene-selected"
            title="Color de la estructura seleccionada en el modelo"
          />
          {structure.names.la || structure.names.en}
        </h2>
        <p className="text-base font-bold text-ink">{structure.names.es || structure.names.en}</p>
        <p className="text-xs text-ink-muted">{structure.names.en}</p>
      </header>

      <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5 border-t border-hairline pt-3 text-xs">
        <dt className="text-ink-faint">Código TA2</dt>
        <dd className="font-mono text-ink">{structure.ta2Id ?? 'sin código oficial'}</dd>
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
        <section aria-label="Medidas" className="flex flex-col gap-2 border-t border-hairline pt-3">
          <Caliper extents={extents} longest={longest} />
          <p className="text-[11px] text-ink-faint">
            Extensión de la geometría del modelo, no una medida clínica.
          </p>
        </section>
      ) : null}

      {structure.description ? (
        <p className="text-[13px] leading-relaxed text-ink">{structure.description}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-1.5">
        <Action
          icon={<Focus size={14} aria-hidden="true" />}
          primary
          onClick={() => focus(structure.bounds)}
        >
          Enfocar
        </Action>
        <Action
          icon={<Crosshair size={14} aria-hidden="true" />}
          pressed={isIsolated}
          onClick={() => (isIsolated ? clearIsolation() : isolate(meshId))}
        >
          {isIsolated ? 'Salir de aislar' : 'Aislar'}
        </Action>
        <Action
          icon={<Layers2 size={14} aria-hidden="true" />}
          pressed={isTranslucent}
          onClick={() => toggleTransparent(meshId)}
        >
          Translúcido
        </Action>
        <Action icon={<EyeOff size={14} aria-hidden="true" />} onClick={() => hide(meshId)}>
          Ocultar
        </Action>
      </div>

      {children.length > 0 ? (
        <section aria-label="Contiene" className="border-t border-hairline pt-3">
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Contiene
          </h3>
          <ul className="flex flex-col gap-0.5 text-xs">
            {children.map((c) => (
              <li key={c.id} className="flex items-baseline gap-1.5">
                {c.meshId ? (
                  <button
                    type="button"
                    onClick={() => {
                      select(c.meshId);
                      focus(c.bounds);
                    }}
                    className="truncate text-left hover:text-accent-text"
                  >
                    {c.names.es || c.names.en}
                  </button>
                ) : (
                  <span className="truncate text-ink-muted">{c.names.es || c.names.en}</span>
                )}
                {c.laterality !== 'midline' ? (
                  <span className="text-[10px] text-ink-faint">
                    {c.laterality === 'left' ? 'izq.' : 'der.'}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Action({
  icon,
  children,
  onClick,
  primary,
  pressed,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  pressed?: boolean;
}) {
  const tone = primary
    ? 'bg-brand-gradient text-accent-ink hover:brightness-110'
    : pressed
      ? 'border border-accent-text/60 bg-accent-soft text-ink'
      : 'border border-hairline text-ink hover:bg-raised';
  return (
    <button
      type="button"
      aria-pressed={primary ? undefined : pressed}
      onClick={onClick}
      className={`flex h-8 items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-bold transition-colors duration-150 ${tone}`}
    >
      {icon}
      {children}
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
    <dl className="flex flex-col gap-1.5">
      {rows.map((r, i) => (
        <div key={r.label} className="grid grid-cols-[48px_1fr_64px] items-center gap-2 text-xs">
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
          <dd className="tabular text-right font-mono text-ink">
            {r.value} <span className="text-ink-faint">mm</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

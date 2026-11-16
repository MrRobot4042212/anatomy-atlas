'use client';

import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ArrowDownToDot,
  Ear,
  Eye,
  FlipHorizontal2,
  Rotate3d,
  RotateCcw,
  ScanFace,
  Scissors,
  SunDim,
  type LucideIcon,
} from 'lucide-react';
import { nextToolbarIndex } from '@/features/interaction/roving';
import { toggleCut, updateCut } from './cut';
import { useViewerStore, type CameraPreset, type ClippingAxis } from './store';

const PRESETS: { name: CameraPreset; label: string; icon: LucideIcon; mirror?: boolean }[] = [
  { name: 'anterior', label: 'Anterior', icon: ScanFace },
  { name: 'posterior', label: 'Posterior', icon: Rotate3d },
  { name: 'left', label: 'Lateral izq.', icon: Ear, mirror: true },
  { name: 'right', label: 'Lateral der.', icon: Ear },
  { name: 'superior', label: 'Superior', icon: ArrowDownToDot },
];

const AXES: { axis: ClippingAxis; label: string; title: string }[] = [
  { axis: 'x', label: 'Sagital', title: 'Plano sagital (izquierda / derecha)' },
  { axis: 'y', label: 'Axial', title: 'Plano axial (superior / inferior)' },
  { axis: 'z', label: 'Coronal', title: 'Plano coronal (anterior / posterior)' },
];

/** Toolbar buttons: the system's 40 px button, ghost variant. */
const tool = 'btn btn-ghost shrink-0 whitespace-nowrap';
/**
 * One row of the toolbar: wraps from `sm` up and scrolls sideways below it (no scrollbar, the cut
 * label shows there is more; focus scrolls the active button into view). Order never changes.
 */
const row =
  'flex min-w-0 items-center gap-1 max-sm:overflow-x-auto max-sm:p-1 max-sm:[scrollbar-width:none]! sm:flex-wrap sm:justify-center';

/**
 * A toolbar button that takes part in roving focus: only the active one is a Tab stop. Disabled
 * states use `aria-disabled`, so a button that just emptied its own count keeps focus.
 */
function Tool({
  index,
  active,
  icon: Icon,
  mirror,
  children,
  ...props
}: {
  index: number;
  active: number;
  icon: LucideIcon;
  mirror?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'className' | 'tabIndex'>) {
  return (
    <button
      type="button"
      data-tool={index}
      tabIndex={index === active ? 0 : -1}
      className={tool}
      {...props}
    >
      <Icon size={16} aria-hidden="true" className={mirror ? '-scale-x-100' : undefined} />
      {children}
    </button>
  );
}

function CutPanel() {
  const clipping = useViewerStore((s) => s.clipping);
  const setClipping = useViewerStore((s) => s.setClipping);

  return (
    <div
      role="group"
      aria-label="Plano de corte"
      className="pointer-events-auto flex w-full max-w-xl flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-hairline bar-surface p-1"
    >
      <div className="flex items-center gap-1">
        {AXES.map((a) => (
          <button
            key={a.axis}
            type="button"
            title={a.title}
            aria-pressed={clipping.axis === a.axis}
            onClick={() => updateCut({ axis: a.axis })}
            className={tool}
          >
            {a.label}
          </button>
        ))}
      </div>
      <label className="flex h-10 min-w-40 flex-1 items-center gap-2 px-1">
        <span className="sr-only">Posición del corte</span>
        <input
          type="range"
          className="plane w-full"
          min={0}
          max={1}
          step={0.005}
          value={clipping.offset}
          onChange={(e) => setClipping({ offset: Number(e.target.value) })}
        />
        <span className="tabular w-11 shrink-0 text-right text-sm text-ink-muted">
          {Math.round(clipping.offset * 100)}%
        </span>
      </label>
      <button
        type="button"
        title="Invertir el lado que se retira"
        aria-pressed={clipping.flip}
        onClick={() => updateCut({ flip: !clipping.flip })}
        className={tool}
      >
        <FlipHorizontal2 size={16} aria-hidden="true" />
        Invertir
      </button>
    </div>
  );
}

/**
 * The floating toolbar over the bottom of the canvas (`docs/design/interaction-model.md`).
 * Fixed slots: every control is always rendered in the same place, and states change only
 * colour, pressed state or the count inside "Mostrar todo", so nothing moves when a state
 * appears. Two rows, camera views first and model tools second (Reiniciar always last).
 * One Tab stop; the arrows move inside.
 */
export function ViewerToolbar() {
  const preset = useViewerStore((s) => s.preset);
  const cutEnabled = useViewerStore((s) => s.clipping.enabled);
  const dimOthers = useViewerStore((s) => s.dimOthers);
  const toggleDimOthers = useViewerStore((s) => s.toggleDimOthers);
  const reset = useViewerStore((s) => s.reset);
  const hiddenCount = useViewerStore((s) => s.hidden.size);
  const isolated = useViewerStore((s) => s.isolated);
  const transparentCount = useViewerStore((s) => s.transparent.size);
  const unhideAll = useViewerStore((s) => s.unhideAll);
  const alterations = hiddenCount + (isolated ? 1 : 0) + transparentCount;

  const [active, setActive] = useState(0);
  const bar = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(bar.current?.querySelectorAll<HTMLButtonElement>('[data-tool]') ?? [])];
    const next = nextToolbarIndex(
      items.indexOf(e.target as HTMLButtonElement),
      e.key,
      items.length,
    );
    if (next === null) return;
    e.preventDefault();
    items[next]?.focus();
  };

  const views = PRESETS.length;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3">
      {cutEnabled ? <CutPanel /> : null}

      <div
        ref={bar}
        role="toolbar"
        aria-label="Herramientas del visor"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        onFocus={(e) => {
          const index = Number((e.target as HTMLElement).dataset.tool);
          if (Number.isInteger(index)) setActive(index);
        }}
        className="pointer-events-auto flex max-w-full flex-col gap-1 rounded-md border border-hairline bar-surface p-1"
      >
        <div role="group" aria-label="Vistas de cámara" className={row}>
          {PRESETS.map((p, i) => (
            <Tool
              key={p.name}
              index={i}
              active={active}
              icon={p.icon}
              mirror={p.mirror}
              aria-keyshortcuts={String(i + 1)}
              title={`Vista ${p.label.toLowerCase()} (${i + 1})`}
              onClick={() => preset(p.name)}
            >
              {p.label}
            </Tool>
          ))}
        </div>

        <div role="group" aria-label="Modelo" className={row}>
          <Tool
            index={views}
            active={active}
            icon={Scissors}
            aria-pressed={cutEnabled}
            aria-keyshortcuts="C"
            title="Plano de corte (C)"
            onClick={toggleCut}
          >
            Corte
          </Tool>
          <Tool
            index={views + 1}
            active={active}
            icon={SunDim}
            aria-pressed={dimOthers}
            aria-keyshortcuts="A"
            title="Atenuar el resto al seleccionar (A)"
            onClick={toggleDimOthers}
          >
            Atenuar resto
          </Tool>
          <Tool
            index={views + 2}
            active={active}
            icon={Eye}
            aria-disabled={alterations === 0}
            title={
              alterations === 0
                ? 'No hay estructuras ocultas, aisladas ni translúcidas'
                : 'Mostrar las estructuras ocultas, aisladas o translúcidas'
            }
            onClick={() => {
              if (alterations > 0) unhideAll();
            }}
          >
            Mostrar todo
            <span className="tabular min-w-8 rounded-xs bg-raised px-1 text-center text-sm text-ink-muted">
              {alterations}
            </span>
          </Tool>
          <Tool
            index={views + 3}
            active={active}
            icon={RotateCcw}
            aria-keyshortcuts="R"
            title="Volver a la vista inicial (R)"
            onClick={reset}
          >
            Reiniciar
          </Tool>
        </div>
      </div>
    </div>
  );
}

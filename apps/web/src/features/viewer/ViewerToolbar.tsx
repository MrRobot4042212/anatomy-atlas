'use client';

import { Eye, FlipHorizontal2, Scissors } from 'lucide-react';
import { useViewerStore, type CameraPreset, type ClippingAxis } from './store';

const PRESETS: { name: CameraPreset; label: string }[] = [
  { name: 'anterior', label: 'Anterior' },
  { name: 'posterior', label: 'Posterior' },
  { name: 'left', label: 'Lateral izq.' },
  { name: 'right', label: 'Lateral der.' },
  { name: 'superior', label: 'Superior' },
];

const AXES: { axis: ClippingAxis; label: string; title: string }[] = [
  { axis: 'x', label: 'Sagital', title: 'Plano sagital (izquierda / derecha)' },
  { axis: 'y', label: 'Axial', title: 'Plano axial (superior / inferior)' },
  { axis: 'z', label: 'Coronal', title: 'Plano coronal (anterior / posterior)' },
];

const segment =
  'h-7 px-2.5 text-xs leading-7 whitespace-nowrap rounded-xs transition-colors duration-150 hover:bg-raised hover:text-ink focus-visible:relative';

/** Camera presets and the cutting plane, overlaid on the bottom edge of the viewer. */
export function ViewerToolbar() {
  const preset = useViewerStore((s) => s.preset);
  const clipping = useViewerStore((s) => s.clipping);
  const setClipping = useViewerStore((s) => s.setClipping);
  const hiddenCount = useViewerStore((s) => s.hidden.size);
  const isolated = useViewerStore((s) => s.isolated);
  const transparentCount = useViewerStore((s) => s.transparent.size);
  const unhideAll = useViewerStore((s) => s.unhideAll);
  const alterations = hiddenCount + (isolated ? 1 : 0) + transparentCount;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3">
      {clipping.enabled ? (
        <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-sm border border-hairline bg-panel/95 px-3 py-2 backdrop-blur-sm">
          <div role="group" aria-label="Plano de corte" className="flex items-center gap-0.5">
            {AXES.map((a) => (
              <button
                key={a.axis}
                type="button"
                title={a.title}
                aria-pressed={clipping.axis === a.axis}
                onClick={() => setClipping({ axis: a.axis })}
                className={`${segment} ${clipping.axis === a.axis ? 'bg-raised text-ink' : 'text-ink-muted'}`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <label className="flex min-w-0 flex-1 items-center gap-2">
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
            <span className="tabular w-10 shrink-0 text-right font-mono text-[11px] text-ink-muted">
              {Math.round(clipping.offset * 100)}%
            </span>
          </label>
          <button
            type="button"
            title="Invertir el lado que se retira"
            aria-pressed={clipping.flip}
            onClick={() => setClipping({ flip: !clipping.flip })}
            className={`${segment} flex items-center gap-1.5 ${clipping.flip ? 'bg-raised text-ink' : 'text-ink-muted'}`}
          >
            <FlipHorizontal2 size={14} aria-hidden="true" />
            Invertir
          </button>
        </div>
      ) : null}

      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-sm border border-hairline bg-panel/95 p-1 backdrop-blur-sm">
        <div role="group" aria-label="Vistas de cámara" className="flex items-center gap-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => preset(p.name)}
              className={`${segment} text-ink-muted`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="mx-1 h-5 w-px bg-hairline" aria-hidden="true" />
        <button
          type="button"
          aria-pressed={clipping.enabled}
          onClick={() => setClipping({ enabled: !clipping.enabled })}
          className={`${segment} flex items-center gap-1.5 ${clipping.enabled ? 'bg-accent-soft text-accent' : 'text-ink-muted'}`}
        >
          <Scissors size={14} aria-hidden="true" />
          Corte
        </button>
        {alterations > 0 ? (
          <>
            <span className="mx-1 h-5 w-px bg-hairline" aria-hidden="true" />
            <button
              type="button"
              onClick={unhideAll}
              className={`${segment} flex items-center gap-1.5 text-ink-muted`}
            >
              <Eye size={14} aria-hidden="true" />
              Mostrar todo
              <span className="tabular rounded-xs bg-raised px-1 font-mono text-[10px] text-ink-faint">
                {alterations}
              </span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

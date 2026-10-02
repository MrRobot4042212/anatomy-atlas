'use client';

import { Component, Suspense, use, type ReactNode } from 'react';
import type { StructureDetail } from '@atlas/shared';
import { api } from '@/lib/api';
import { useViewerStore } from './store';

const LATERALITY: Record<string, string> = {
  left: 'izquierda',
  right: 'derecha',
  midline: 'línea media',
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

export function InfoPanel() {
  const selected = useViewerStore((s) => s.selected);
  const hovered = useViewerStore((s) => s.hovered);

  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-200">
      <div className="min-h-5 text-xs text-neutral-500">
        {hovered ? (
          <span className="font-mono">{hovered}</span>
        ) : (
          'Pasa el cursor por una estructura'
        )}
      </div>
      {selected ? (
        <DetailBoundary key={selected}>
          <Suspense fallback={<p className="text-neutral-500">Cargando…</p>}>
            <Detail meshId={selected} />
          </Suspense>
        </DetailBoundary>
      ) : (
        <p className="text-neutral-500">Haz clic en una estructura para ver su ficha.</p>
      )}
    </aside>
  );
}

class DetailBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <p className="text-red-400">No se pudo cargar la ficha: {this.state.error.message}</p>;
    }
    return this.props.children;
  }
}

function Detail({ meshId }: { meshId: string }) {
  const { structure, ancestors, children } = use(detailFor(meshId));
  const select = useViewerStore((s) => s.select);
  const hide = useViewerStore((s) => s.hide);
  const focus = useViewerStore((s) => s.focus);

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-1 text-xs text-neutral-500">
        {ancestors.map((a) => (
          <span key={a.id}>{a.names.en} ›</span>
        ))}
      </nav>
      <header>
        <h2 className="text-xl font-semibold text-neutral-50">
          {structure.names.es || structure.names.en}
        </h2>
        <p className="text-neutral-400">{structure.names.la}</p>
        <p className="text-xs text-neutral-500">{structure.names.en}</p>
      </header>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        <dt className="text-neutral-500">Sistema</dt>
        <dd>
          {structure.system}
          {structure.subsystem ? ` · ${structure.subsystem}` : ''}
        </dd>
        <dt className="text-neutral-500">Región</dt>
        <dd>{structure.region ?? '—'}</dd>
        <dt className="text-neutral-500">Lado</dt>
        <dd>{LATERALITY[structure.laterality]}</dd>
        <dt className="text-neutral-500">Término</dt>
        <dd className="font-mono">{structure.termKey}</dd>
      </dl>
      {structure.description ? <p className="text-neutral-300">{structure.description}</p> : null}
      {children.length > 0 ? (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Contiene
          </h3>
          <ul className="flex flex-col gap-0.5 text-xs">
            {children.map((c) => (
              <li key={c.id}>{c.names.es || c.names.en}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => focus(structure.bounds)}
          className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500"
        >
          Enfocar
        </button>
        <button
          type="button"
          onClick={() => hide(meshId)}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-900"
        >
          Ocultar
        </button>
        <button
          type="button"
          onClick={() => select(null)}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-900"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

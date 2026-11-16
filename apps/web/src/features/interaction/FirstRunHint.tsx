'use client';

import { useSyncExternalStore } from 'react';
import { MousePointerClick, Rotate3d, X, ZoomIn } from 'lucide-react';

const STORAGE_KEY = 'wazo-anatomy:first-run-hint';
const listeners = new Set<() => void>();
/** Dismissed in this page even when storage is unavailable (private mode, blocked site data). */
let dismissedHere = false;

function readDismissed(): boolean {
  if (dismissedHere) return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dismissed';
  } catch {
    return false;
  }
}

function dismiss(): void {
  dismissedHere = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, 'dismissed');
  } catch {
    // Storage blocked: the hint stays closed for this page and comes back on the next visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const LINES = [
  { icon: Rotate3d, mouse: 'Arrastra para girar', touch: 'Arrastra para girar' },
  { icon: ZoomIn, mouse: 'Rueda para acercar', touch: 'Pellizca para acercar' },
  { icon: MousePointerClick, mouse: 'Clic para identificar', touch: 'Toca para identificar' },
];

/**
 * Three-line gesture hint over the canvas, shown once per browser until dismissed. Rendered
 * hidden on the server (storage is unknown there), so it appears after hydration and never
 * flashes for returning users. The page mounts it only outside embed mode: the host teaches
 * its own users.
 */
export function FirstRunHint() {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  if (dismissed) return null;

  return (
    <div
      role="note"
      aria-label="Cómo usar el modelo"
      className="label-settle absolute left-4 top-4 z-10 flex items-start gap-2 rounded-md border border-hairline bar-surface py-2 pl-4 pr-1"
    >
      <ul className="flex flex-col gap-1.5 py-1.5">
        {LINES.map(({ icon: Icon, mouse, touch }) => (
          <li key={mouse} className="flex items-center gap-2.5 text-sm text-ink-strong">
            <Icon size={16} className="shrink-0 text-accent-text" aria-hidden="true" />
            <span className="pointer-coarse:hidden">{mouse}</span>
            <span className="hidden pointer-coarse:inline">{touch}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label="Cerrar la ayuda"
        onClick={dismiss}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

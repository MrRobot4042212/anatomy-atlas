'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useHelpStore } from './helpStore';
import { SHORTCUT_HELP } from './shortcuts';

const GESTURES: { gesture: string; label: string }[] = [
  { gesture: 'Arrastrar', label: 'Girar el modelo' },
  { gesture: 'Rueda', label: 'Acercar o alejar' },
  { gesture: 'Clic', label: 'Identificar una estructura' },
  { gesture: 'Doble clic', label: 'Enfocar la estructura' },
  { gesture: 'Clic derecho y arrastrar', label: 'Desplazar la vista' },
];

const kbd =
  'tabular inline-flex h-7 min-w-7 items-center justify-center rounded-xs border border-hairline-strong bg-raised px-1.5 text-sm font-medium text-ink';

/**
 * The shortcut sheet. A native modal `<dialog>`: `showModal` makes the rest of the page inert
 * (the focus trap), Escape closes it, and focus goes back to whatever opened it.
 */
export function HelpSheet() {
  const open = useHelpStore((s) => s.open);
  const setOpen = useHelpStore((s) => s.setOpen);
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const onClose = () => {
    setOpen(false);
    const back = opener.current;
    opener.current = null;
    if (back?.isConnected) back.focus();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="help-sheet-title"
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself; the content is a child.
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      className="m-auto w-[min(560px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-lg border border-hairline bg-panel p-0 text-ink backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="help-sheet-title" className="text-[22px] font-medium leading-tight">
            Atajos y gestos
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-icon -mr-2 -mt-2"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <section aria-labelledby="help-keys" className="flex flex-col gap-3">
          <h3 id="help-keys" className="text-sm text-ink-muted">
            Teclado
          </h3>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 sm:grid-cols-[11rem_1fr]">
            {SHORTCUT_HELP.map((s) => (
              <div key={s.label} className="contents">
                <dt className="flex flex-wrap gap-1">
                  {s.keys.map((k) => (
                    <kbd key={k} className={kbd}>
                      {k}
                    </kbd>
                  ))}
                </dt>
                <dd className="text-sm text-ink-strong">{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="help-mouse" className="flex flex-col gap-3">
          <h3 id="help-mouse" className="text-sm text-ink-muted">
            Ratón
          </h3>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 sm:grid-cols-[11rem_1fr]">
            {GESTURES.map((g) => (
              <div key={g.gesture} className="contents">
                <dt className="text-sm font-medium text-ink">{g.gesture}</dt>
                <dd className="text-sm text-ink-strong">{g.label}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </dialog>
  );
}

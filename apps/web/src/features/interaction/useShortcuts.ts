'use client';

import { useEffect } from 'react';
import { toggleCut } from '@/features/viewer/cut';
import { useViewerStore } from '@/features/viewer/store';
import { useHelpStore } from './helpStore';
import { resolveShortcut, type KeyTarget, type ShortcutAction } from './shortcuts';

/** Widgets whose own keyboard model owns printable keys (type-ahead, arrow navigation). */
const COMPOSITE = '[role="tree"], [role="listbox"], [role="menu"], [role="menubar"], [role="grid"]';
/** Any open modal surface, ours or another feature's. */
const MODAL = 'dialog[open], [aria-modal="true"]';

function describeTarget(target: EventTarget | null): KeyTarget | null {
  if (!(target instanceof HTMLElement)) return null;
  return {
    tagName: target.tagName,
    inputType: target instanceof HTMLInputElement ? target.type : undefined,
    isContentEditable: target.isContentEditable,
    inCompositeWidget: target.closest(COMPOSITE) !== null,
  };
}

function run(action: ShortcutAction): void {
  const viewer = useViewerStore.getState();
  switch (action.type) {
    case 'reset':
      return viewer.reset();
    case 'clear-selection':
      return viewer.select(null);
    case 'close-sheet':
      // Our sheet closes here; any other modal handles its own Escape (native dialogs do).
      return useHelpStore.getState().setOpen(false);
    case 'camera':
      return viewer.preset(action.preset);
    case 'toggle-cut':
      return toggleCut();
    case 'toggle-dim':
      return viewer.toggleDimOthers();
    case 'open-help':
      return useHelpStore.getState().setOpen(true);
  }
}

/**
 * The viewer's global keyboard shortcuts (`docs/design/interaction-model.md`). Mount once.
 * The decision lives in `resolveShortcut`; this only reads the event and the page.
 */
export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = resolveShortcut(e, describeTarget(e.target), {
        sheetOpen: useHelpStore.getState().open || document.querySelector(MODAL) !== null,
        hasSelection: useViewerStore.getState().selected !== null,
      });
      if (!action) return;
      // Escape on a sheet keeps its default: a native dialog closes itself on it.
      if (action.type !== 'close-sheet') e.preventDefault();
      run(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

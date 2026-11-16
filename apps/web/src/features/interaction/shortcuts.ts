import type { CameraPreset } from '@/features/viewer/store';

/** What a key press asks for. The hook maps each one onto the store or the help sheet. */
export type ShortcutAction =
  | { type: 'reset' }
  | { type: 'clear-selection' }
  | { type: 'close-sheet' }
  | { type: 'camera'; preset: CameraPreset }
  | { type: 'toggle-cut' }
  | { type: 'toggle-dim' }
  | { type: 'open-help' };

/** The parts of a `KeyboardEvent` the resolver reads, so it runs without a DOM. */
export interface KeyPress {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  /** 229 while an IME is composing in browsers that do not set `isComposing` on every event. */
  keyCode?: number;
  defaultPrevented: boolean;
}

/** Where the key press happened, reduced to what decides whether a shortcut may fire. */
export interface KeyTarget {
  tagName: string;
  /** `type` of an input element; empty for any other element. */
  inputType?: string;
  isContentEditable: boolean;
  /** Whether the target sits inside a composite widget that owns printable keys (tree, listbox). */
  inCompositeWidget: boolean;
}

export interface ShortcutContext {
  /** A modal sheet or dialog is open: only Escape acts, and it closes the sheet. */
  sheetOpen: boolean;
  /** Something is selected (Escape has nothing to clear otherwise). */
  hasSelection: boolean;
}

export const CAMERA_KEYS: Record<string, CameraPreset> = {
  '1': 'anterior',
  '2': 'posterior',
  '3': 'left',
  '4': 'right',
  '5': 'superior',
};

/** Input types that take printable characters. Buttons, checkboxes and sliders do not. */
const TEXT_INPUT_TYPES = new Set([
  '',
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

/** Whether the user is typing into the target, where every key belongs to the field. */
export function isTypingTarget(target: KeyTarget | null): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return TEXT_INPUT_TYPES.has((target.inputType ?? '').toLowerCase());
  return false;
}

/**
 * Maps a key press to a viewer shortcut, or `null` to leave it alone. Pure: the hook feeds it
 * the event, the target and two facts about the page.
 *
 * Ignored: presses with Ctrl, Meta or Alt (browser and OS shortcuts, AltGr layouts), auto-repeat,
 * IME composition, presses another handler already consumed, and presses while typing in a field.
 * Printable keys are also left to composite widgets (a tree's type-ahead); Escape is not.
 * Shift is accepted only for `?`, which needs it on most layouts; Shift+R is not a reset.
 * `/` is the search box's own shortcut and is never claimed here.
 */
export function resolveShortcut(
  press: KeyPress,
  target: KeyTarget | null,
  ctx: ShortcutContext,
): ShortcutAction | null {
  if (press.defaultPrevented || press.repeat) return null;
  if (press.isComposing || press.keyCode === 229) return null;
  if (press.ctrlKey || press.metaKey || press.altKey) return null;
  if (isTypingTarget(target)) return null;

  if (press.key === 'Escape') {
    if (ctx.sheetOpen) return { type: 'close-sheet' };
    return ctx.hasSelection ? { type: 'clear-selection' } : null;
  }
  if (ctx.sheetOpen) return null;
  if (target?.inCompositeWidget) return null;

  if (press.key === '?') return { type: 'open-help' };
  if (press.shiftKey) return null;

  const camera = CAMERA_KEYS[press.key];
  if (camera) return { type: 'camera', preset: camera };

  switch (press.key.toLowerCase()) {
    case 'r':
      return { type: 'reset' };
    case 'c':
      return { type: 'toggle-cut' };
    case 'a':
      return { type: 'toggle-dim' };
    default:
      return null;
  }
}

/** The shortcut list as the help sheet shows it; one source with the resolver above. */
export const SHORTCUT_HELP: { keys: string[]; label: string }[] = [
  { keys: ['/'], label: 'Buscar una estructura' },
  { keys: ['Esc'], label: 'Quitar la selección (o cerrar esta hoja)' },
  { keys: ['R'], label: 'Reiniciar la vista' },
  {
    keys: ['1', '2', '3', '4', '5'],
    label: 'Vista anterior, posterior, lateral izq., lateral der., superior',
  },
  { keys: ['C'], label: 'Activar o quitar el corte' },
  { keys: ['A'], label: 'Atenuar el resto al seleccionar' },
  { keys: ['?'], label: 'Mostrar esta ayuda' },
];

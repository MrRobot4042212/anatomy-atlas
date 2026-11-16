import { describe, expect, it } from 'vitest';
import {
  isTypingTarget,
  resolveShortcut,
  type KeyPress,
  type KeyTarget,
  type ShortcutContext,
} from './shortcuts';

const press = (key: string, extra: Partial<KeyPress> = {}): KeyPress => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false,
  defaultPrevented: false,
  ...extra,
});

const body: KeyTarget = {
  tagName: 'BODY',
  isContentEditable: false,
  inCompositeWidget: false,
};
const el = (tagName: string, extra: Partial<KeyTarget> = {}): KeyTarget => ({
  ...body,
  tagName,
  ...extra,
});

const idle: ShortcutContext = { sheetOpen: false, hasSelection: false };
const selected: ShortcutContext = { sheetOpen: false, hasSelection: true };
const sheet: ShortcutContext = { sheetOpen: true, hasSelection: true };

describe('resolveShortcut', () => {
  it('maps the documented keys', () => {
    expect(resolveShortcut(press('r'), body, idle)).toEqual({ type: 'reset' });
    expect(resolveShortcut(press('c'), body, idle)).toEqual({ type: 'toggle-cut' });
    expect(resolveShortcut(press('a'), body, idle)).toEqual({ type: 'toggle-dim' });
    expect(resolveShortcut(press('?', { shiftKey: true }), body, idle)).toEqual({
      type: 'open-help',
    });
    expect(resolveShortcut(press('Escape'), body, selected)).toEqual({ type: 'clear-selection' });
  });

  it('maps 1 to 5 to the camera views in toolbar order', () => {
    const presets = ['1', '2', '3', '4', '5'].map(
      (k) => (resolveShortcut(press(k), body, idle) as { preset: string }).preset,
    );
    expect(presets).toEqual(['anterior', 'posterior', 'left', 'right', 'superior']);
    expect(resolveShortcut(press('6'), body, idle)).toBeNull();
    expect(resolveShortcut(press('0'), body, idle)).toBeNull();
  });

  it('accepts Caps Lock letters but not Shift+letter', () => {
    expect(resolveShortcut(press('R'), body, idle)).toEqual({ type: 'reset' });
    expect(resolveShortcut(press('R', { shiftKey: true }), body, idle)).toBeNull();
    expect(resolveShortcut(press('!', { shiftKey: true }), body, idle)).toBeNull();
  });

  it('never claims the search shortcut', () => {
    expect(resolveShortcut(press('/'), body, idle)).toBeNull();
  });

  it('ignores presses with Ctrl, Meta or Alt (AltGr reports Ctrl+Alt)', () => {
    for (const mod of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      expect(resolveShortcut(press('r', { [mod]: true }), body, idle)).toBeNull();
      expect(resolveShortcut(press('Escape', { [mod]: true }), body, selected)).toBeNull();
    }
    expect(resolveShortcut(press('?', { ctrlKey: true, altKey: true }), body, idle)).toBeNull();
  });

  it('ignores auto-repeat, IME composition and consumed events', () => {
    expect(resolveShortcut(press('c', { repeat: true }), body, idle)).toBeNull();
    expect(resolveShortcut(press('r', { isComposing: true }), body, idle)).toBeNull();
    expect(resolveShortcut(press('Process', { keyCode: 229 }), body, idle)).toBeNull();
    expect(resolveShortcut(press('r', { defaultPrevented: true }), body, idle)).toBeNull();
  });

  it('ignores every key while typing in a field, Escape included', () => {
    for (const target of [
      el('INPUT', { inputType: 'text' }),
      el('INPUT', { inputType: 'search' }),
      el('INPUT'),
      el('TEXTAREA'),
      el('SELECT'),
      el('DIV', { isContentEditable: true }),
    ]) {
      expect(resolveShortcut(press('r'), target, idle)).toBeNull();
      expect(resolveShortcut(press('1'), target, idle)).toBeNull();
      expect(resolveShortcut(press('Escape'), target, selected)).toBeNull();
    }
  });

  it('still fires on buttons, checkboxes and the cut slider', () => {
    expect(resolveShortcut(press('r'), el('BUTTON'), idle)).toEqual({ type: 'reset' });
    expect(resolveShortcut(press('r'), el('INPUT', { inputType: 'range' }), idle)).toEqual({
      type: 'reset',
    });
    expect(resolveShortcut(press('a'), el('INPUT', { inputType: 'checkbox' }), idle)).toEqual({
      type: 'toggle-dim',
    });
  });

  it('leaves printable keys to composite widgets but still clears with Escape', () => {
    const tree = el('LI', { inCompositeWidget: true });
    expect(resolveShortcut(press('r'), tree, idle)).toBeNull();
    expect(resolveShortcut(press('1'), tree, idle)).toBeNull();
    expect(resolveShortcut(press('Escape'), tree, selected)).toEqual({ type: 'clear-selection' });
  });

  it('closes an open sheet before clearing the selection, and blocks other keys meanwhile', () => {
    expect(resolveShortcut(press('Escape'), body, sheet)).toEqual({ type: 'close-sheet' });
    expect(resolveShortcut(press('r'), body, sheet)).toBeNull();
    expect(resolveShortcut(press('?', { shiftKey: true }), body, sheet)).toBeNull();
  });

  it('does nothing on Escape when there is nothing to clear', () => {
    expect(resolveShortcut(press('Escape'), body, idle)).toBeNull();
  });

  it('works without a target (events dispatched on window)', () => {
    expect(resolveShortcut(press('r'), null, idle)).toEqual({ type: 'reset' });
  });
});

describe('isTypingTarget', () => {
  it('treats text-like inputs as typing and the rest as not', () => {
    expect(isTypingTarget(el('INPUT', { inputType: 'email' }))).toBe(true);
    expect(isTypingTarget(el('INPUT', { inputType: 'number' }))).toBe(true);
    expect(isTypingTarget(el('INPUT', { inputType: 'radio' }))).toBe(false);
    expect(isTypingTarget(el('A'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

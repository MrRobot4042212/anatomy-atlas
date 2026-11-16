'use client';

import { CircleQuestionMark } from 'lucide-react';
import { useHelpStore } from './helpStore';

/** Header button that opens the shortcut sheet (also `?`). */
export function HelpButton() {
  const setOpen = useHelpStore((s) => s.setOpen);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon shrink-0"
      aria-label="Atajos y gestos"
      aria-haspopup="dialog"
      aria-keyshortcuts="?"
      title="Atajos y gestos (?)"
      onClick={() => setOpen(true)}
    >
      <CircleQuestionMark size={20} aria-hidden="true" />
    </button>
  );
}

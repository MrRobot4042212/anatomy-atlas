import { create } from 'zustand';

/** Whether the shortcut sheet is open. UI chrome, kept out of the viewer store on purpose. */
interface HelpState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useHelpStore = create<HelpState>()((set) => ({
  open: false,
  setOpen: (open) => set((s) => (s.open === open ? s : { open })),
}));

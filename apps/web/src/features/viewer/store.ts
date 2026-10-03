import { create } from 'zustand';
import type { BodySystem } from '@atlas/shared';

export type Bounds = { min: [number, number, number]; max: [number, number, number] };

/** Key of a subsystem toggle: `<system>/<subsystem>`. */
export const subsystemKey = (system: BodySystem, subsystem: string) => `${system}/${subsystem}`;

export interface ViewerState {
  visibleSystems: Set<BodySystem>;
  /** Subsystems switched off (keys from `subsystemKey`); everything else in a visible system shows. */
  hiddenSubsystems: Set<string>;
  hidden: Set<string>;
  isolated: string | null;
  transparent: Set<string>;
  selected: string | null;
  hovered: string | null;
  clipping: { axis: 'x' | 'y' | 'z'; offset: number; enabled: boolean };
  /** Bounds the camera should frame; consumed by the focus controller. */
  cameraTarget: Bounds | null;

  toggleSystem: (system: BodySystem) => void;
  toggleSubsystem: (key: string) => void;
  hover: (meshId: string | null) => void;
  select: (meshId: string | null) => void;
  hide: (meshId: string) => void;
  unhideAll: () => void;
  isolate: (meshId: string) => void;
  clearIsolation: () => void;
  focus: (bounds: Bounds | null) => void;
}

const DEFAULT_SYSTEMS: BodySystem[] = ['skeletal'];

function toggled<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export const useViewerStore = create<ViewerState>()((set) => ({
  visibleSystems: new Set(DEFAULT_SYSTEMS),
  hiddenSubsystems: new Set(),
  hidden: new Set(),
  isolated: null,
  transparent: new Set(),
  selected: null,
  hovered: null,
  clipping: { axis: 'x', offset: 0, enabled: false },
  cameraTarget: null,

  toggleSystem: (system) => set((s) => ({ visibleSystems: toggled(s.visibleSystems, system) })),
  toggleSubsystem: (key) => set((s) => ({ hiddenSubsystems: toggled(s.hiddenSubsystems, key) })),
  hover: (meshId) => set((s) => (s.hovered === meshId ? s : { hovered: meshId })),
  select: (meshId) => set((s) => (s.selected === meshId ? s : { selected: meshId })),
  hide: (meshId) =>
    set((s) => {
      const hidden = new Set(s.hidden);
      hidden.add(meshId);
      return { hidden, selected: s.selected === meshId ? null : s.selected };
    }),
  unhideAll: () => set({ hidden: new Set() }),
  isolate: (meshId) => set({ isolated: meshId }),
  clearIsolation: () => set({ isolated: null }),
  focus: (bounds) => set({ cameraTarget: bounds }),
}));

import { create } from 'zustand';
import type { BodySystem } from '@atlas/shared';

export type Bounds = { min: [number, number, number]; max: [number, number, number] };
export type ClippingAxis = 'x' | 'y' | 'z';
export type CameraPreset = 'anterior' | 'posterior' | 'left' | 'right' | 'superior';

/** Key of a subsystem toggle: `<system>/<subsystem>`. */
export const subsystemKey = (system: BodySystem, subsystem: string) => `${system}/${subsystem}`;

export interface ClippingState {
  enabled: boolean;
  axis: ClippingAxis;
  /** 0..1 along the axis over the body's extent. */
  offset: number;
  /** Cut away the other half. */
  flip: boolean;
}

export interface ViewerState {
  visibleSystems: Set<BodySystem>;
  /** Subsystems switched off (keys from `subsystemKey`); everything else in a visible system shows. */
  hiddenSubsystems: Set<string>;
  hidden: Set<string>;
  isolated: string | null;
  transparent: Set<string>;
  selected: string | null;
  hovered: string | null;
  clipping: ClippingState;
  /** Bounds the camera should frame; consumed by the focus controller. */
  cameraTarget: Bounds | null;
  /** Last requested preset; `nonce` lets the same preset be requested twice. */
  cameraPreset: { name: CameraPreset; nonce: number } | null;

  toggleSystem: (system: BodySystem) => void;
  showSystem: (system: BodySystem) => void;
  /** Replaces the visible systems with exactly these (embed bridge, `set-layers`). */
  setVisibleSystems: (systems: Iterable<BodySystem>) => void;
  toggleSubsystem: (key: string) => void;
  hover: (meshId: string | null) => void;
  select: (meshId: string | null) => void;
  hide: (meshId: string) => void;
  unhideAll: () => void;
  isolate: (meshId: string) => void;
  clearIsolation: () => void;
  toggleTransparent: (meshId: string) => void;
  setClipping: (patch: Partial<ClippingState>) => void;
  focus: (bounds: Bounds | null) => void;
  preset: (name: CameraPreset) => void;
}

const DEFAULT_SYSTEMS: BodySystem[] = ['skeletal'];
// Fascia wraps every muscle; students study the muscles underneath, so it starts switched
// off and is one click away in the muscular layer's subsystems.
const DEFAULT_HIDDEN_SUBSYSTEMS = [subsystemKey('muscular', 'fascia')];

function toggled<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export const useViewerStore = create<ViewerState>()((set) => ({
  visibleSystems: new Set(DEFAULT_SYSTEMS),
  hiddenSubsystems: new Set(DEFAULT_HIDDEN_SUBSYSTEMS),
  hidden: new Set(),
  isolated: null,
  transparent: new Set(),
  selected: null,
  hovered: null,
  clipping: { enabled: false, axis: 'x', offset: 0.5, flip: false },
  cameraTarget: null,
  cameraPreset: null,

  toggleSystem: (system) => set((s) => ({ visibleSystems: toggled(s.visibleSystems, system) })),
  showSystem: (system) =>
    set((s) =>
      s.visibleSystems.has(system) ? s : { visibleSystems: new Set([...s.visibleSystems, system]) },
    ),
  setVisibleSystems: (systems) => set({ visibleSystems: new Set(systems) }),
  toggleSubsystem: (key) => set((s) => ({ hiddenSubsystems: toggled(s.hiddenSubsystems, key) })),
  hover: (meshId) => set((s) => (s.hovered === meshId ? s : { hovered: meshId })),
  select: (meshId) => set((s) => (s.selected === meshId ? s : { selected: meshId })),
  hide: (meshId) =>
    set((s) => {
      const hidden = new Set(s.hidden);
      hidden.add(meshId);
      return { hidden, selected: s.selected === meshId ? null : s.selected };
    }),
  unhideAll: () => set({ hidden: new Set(), isolated: null, transparent: new Set() }),
  isolate: (meshId) => set({ isolated: meshId }),
  clearIsolation: () => set({ isolated: null }),
  toggleTransparent: (meshId) => set((s) => ({ transparent: toggled(s.transparent, meshId) })),
  setClipping: (patch) => set((s) => ({ clipping: { ...s.clipping, ...patch } })),
  focus: (bounds) => set({ cameraTarget: bounds }),
  preset: (name) =>
    set((s) => ({ cameraPreset: { name, nonce: (s.cameraPreset?.nonce ?? 0) + 1 } })),
}));

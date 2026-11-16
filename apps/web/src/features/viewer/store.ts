import { create } from 'zustand';
import type { BodySystem, BodyZone } from '@atlas/shared';

export type Bounds = { min: [number, number, number]; max: [number, number, number] };
export type ClippingAxis = 'x' | 'y' | 'z';
export type CameraPreset = 'anterior' | 'posterior' | 'left' | 'right' | 'superior';
/** Which side of the body shows: both, or only the left or right structures (midline always shows). */
export type SideFilter = 'both' | 'left' | 'right';
/** State of a body system in the layer list. `hidden` is a system that is not in `visibleSystems`. */
export type SystemDepth = 'visible' | 'translucent' | 'hidden';

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
  /** Visible systems drawn translucent (a depth state of the layer, not a per-structure choice). */
  translucentSystems: Set<BodySystem>;
  /** Subsystems switched off (keys from `subsystemKey`); everything else in a visible system shows. */
  hiddenSubsystems: Set<string>;
  /** Zone filter: when not empty only structures of these zones show. Combines with the layers. */
  zones: Set<BodyZone>;
  /** Side filter: left or right structures only. Midline structures always show. */
  side: SideFilter;
  /** While a structure is selected, every other structure is dimmed (the ghost look). */
  dimOthers: boolean;
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
  /** Sets one system to visible, translucent or hidden. */
  setSystemDepth: (system: BodySystem, depth: SystemDepth) => void;
  toggleSubsystem: (key: string) => void;
  toggleZone: (zone: BodyZone) => void;
  setZones: (zones: Iterable<BodyZone>) => void;
  setSide: (side: SideFilter) => void;
  /** Clears the zone and side filters. */
  clearFilters: () => void;
  toggleDimOthers: () => void;
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
  /** Back to the initial state: layers, filters, hidden, isolated, selection, cut and camera. */
  reset: () => void;
}

export const DEFAULT_SYSTEMS: BodySystem[] = ['skeletal'];
// Fascia wraps every muscle; students study the muscles underneath, so it starts switched
// off and is one click away in the muscular layer's subsystems.
export const DEFAULT_HIDDEN_SUBSYSTEMS = [subsystemKey('muscular', 'fascia')];
export const DEFAULT_CLIPPING: ClippingState = {
  enabled: false,
  axis: 'x',
  offset: 0.5,
  flip: false,
};

function toggled<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/** The initial state of everything `reset` restores (the camera and the preset nonce excepted). */
function initialState() {
  return {
    visibleSystems: new Set<BodySystem>(DEFAULT_SYSTEMS),
    translucentSystems: new Set<BodySystem>(),
    hiddenSubsystems: new Set<string>(DEFAULT_HIDDEN_SUBSYSTEMS),
    zones: new Set<BodyZone>(),
    side: 'both' as SideFilter,
    hidden: new Set<string>(),
    isolated: null,
    transparent: new Set<string>(),
    selected: null,
    hovered: null,
    clipping: { ...DEFAULT_CLIPPING },
    cameraTarget: null,
  };
}

export const useViewerStore = create<ViewerState>()((set) => ({
  ...initialState(),
  dimOthers: true,
  cameraPreset: null,

  toggleSystem: (system) =>
    set((s) => {
      const visibleSystems = toggled(s.visibleSystems, system);
      if (visibleSystems.has(system)) return { visibleSystems };
      // A system that is switched off forgets that it was translucent.
      const translucentSystems = new Set(s.translucentSystems);
      translucentSystems.delete(system);
      return { visibleSystems, translucentSystems };
    }),
  showSystem: (system) =>
    set((s) =>
      s.visibleSystems.has(system) ? s : { visibleSystems: new Set([...s.visibleSystems, system]) },
    ),
  setVisibleSystems: (systems) =>
    set((s) => {
      const visibleSystems = new Set(systems);
      return {
        visibleSystems,
        translucentSystems: new Set([...s.translucentSystems].filter((x) => visibleSystems.has(x))),
      };
    }),
  setSystemDepth: (system, depth) =>
    set((s) => {
      const visibleSystems = new Set(s.visibleSystems);
      const translucentSystems = new Set(s.translucentSystems);
      if (depth === 'hidden') {
        visibleSystems.delete(system);
        translucentSystems.delete(system);
      } else {
        visibleSystems.add(system);
        if (depth === 'translucent') translucentSystems.add(system);
        else translucentSystems.delete(system);
      }
      return { visibleSystems, translucentSystems };
    }),
  toggleSubsystem: (key) => set((s) => ({ hiddenSubsystems: toggled(s.hiddenSubsystems, key) })),
  toggleZone: (zone) => set((s) => ({ zones: toggled(s.zones, zone) })),
  setZones: (zones) => set({ zones: new Set(zones) }),
  setSide: (side) => set((s) => (s.side === side ? s : { side })),
  clearFilters: () => set({ zones: new Set(), side: 'both' }),
  toggleDimOthers: () => set((s) => ({ dimOthers: !s.dimOthers })),
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
  // A fresh object per call, so asking to frame the same bounds again (after orbiting away)
  // still reaches the focus controller, which reacts to a new reference.
  focus: (bounds) =>
    set({ cameraTarget: bounds ? { min: [...bounds.min], max: [...bounds.max] } : null }),
  preset: (name) =>
    set((s) => ({ cameraPreset: { name, nonce: (s.cameraPreset?.nonce ?? 0) + 1 } })),
  reset: () =>
    set((s) => ({
      ...initialState(),
      // Frame the whole body again through the same preset path the toolbar uses.
      cameraPreset: { name: 'anterior', nonce: (s.cameraPreset?.nonce ?? 0) + 1 },
    })),
}));

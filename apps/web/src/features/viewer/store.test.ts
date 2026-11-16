import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_HIDDEN_SUBSYSTEMS, DEFAULT_SYSTEMS, useViewerStore, type Bounds } from './store';

const initial = useViewerStore.getState();
beforeEach(() => useViewerStore.setState(initial, true));

describe('layer depth', () => {
  it('sets a system to translucent, visible and hidden', () => {
    const { setSystemDepth } = useViewerStore.getState();
    setSystemDepth('muscular', 'translucent');
    let s = useViewerStore.getState();
    expect(s.visibleSystems.has('muscular')).toBe(true);
    expect(s.translucentSystems.has('muscular')).toBe(true);
    setSystemDepth('muscular', 'visible');
    s = useViewerStore.getState();
    expect(s.visibleSystems.has('muscular')).toBe(true);
    expect(s.translucentSystems.has('muscular')).toBe(false);
    setSystemDepth('muscular', 'hidden');
    s = useViewerStore.getState();
    expect(s.visibleSystems.has('muscular')).toBe(false);
  });

  it('forgets translucency when a system is switched off, so it comes back opaque', () => {
    const { setSystemDepth, toggleSystem } = useViewerStore.getState();
    setSystemDepth('nervous', 'translucent');
    toggleSystem('nervous');
    expect(useViewerStore.getState().translucentSystems.has('nervous')).toBe(false);
    toggleSystem('nervous');
    expect(useViewerStore.getState().translucentSystems.has('nervous')).toBe(false);
  });

  it('keeps translucency only for systems that stay visible when the layers are replaced', () => {
    const { setSystemDepth, setVisibleSystems } = useViewerStore.getState();
    setSystemDepth('muscular', 'translucent');
    setSystemDepth('nervous', 'translucent');
    setVisibleSystems(['muscular', 'skeletal']);
    const s = useViewerStore.getState();
    expect([...s.translucentSystems]).toEqual(['muscular']);
  });
});

describe('zone and side filters', () => {
  it('toggles zones, sets the side and clears both', () => {
    const { toggleZone, setSide, clearFilters } = useViewerStore.getState();
    toggleZone('forearm');
    toggleZone('hand');
    toggleZone('hand');
    setSide('right');
    let s = useViewerStore.getState();
    expect([...s.zones]).toEqual(['forearm']);
    expect(s.side).toBe('right');
    clearFilters();
    s = useViewerStore.getState();
    expect(s.zones.size).toBe(0);
    expect(s.side).toBe('both');
  });
});

describe('reset', () => {
  it('returns every piece of state to the initial one and asks for the front view', () => {
    const st = useViewerStore.getState();
    st.setSystemDepth('muscular', 'translucent');
    st.toggleSubsystem('muscular/fascia');
    st.toggleZone('arm');
    st.setSide('left');
    st.hide('ta2-1');
    st.isolate('ta2-2');
    st.toggleTransparent('ta2-3');
    st.select('ta2-4');
    st.setClipping({ enabled: true, axis: 'y', offset: 0.2, flip: true });
    st.focus({ min: [0, 0, 0], max: [1, 1, 1] });
    const before = useViewerStore.getState().cameraPreset?.nonce ?? 0;

    useViewerStore.getState().reset();
    const s = useViewerStore.getState();
    expect([...s.visibleSystems]).toEqual(DEFAULT_SYSTEMS);
    expect(s.translucentSystems.size).toBe(0);
    expect([...s.hiddenSubsystems]).toEqual(DEFAULT_HIDDEN_SUBSYSTEMS);
    expect(s.zones.size).toBe(0);
    expect(s.side).toBe('both');
    expect(s.hidden.size).toBe(0);
    expect(s.isolated).toBeNull();
    expect(s.transparent.size).toBe(0);
    expect(s.selected).toBeNull();
    expect(s.clipping).toEqual({ enabled: false, axis: 'x', offset: 0.5, flip: false });
    expect(s.cameraTarget).toBeNull();
    expect(s.cameraPreset).toMatchObject({ name: 'anterior' });
    expect(s.cameraPreset?.nonce).toBe(before + 1);
  });

  it('keeps the dim-others choice, which is a preference and not a view', () => {
    const st = useViewerStore.getState();
    st.toggleDimOthers();
    st.reset();
    expect(useViewerStore.getState().dimOthers).toBe(false);
  });

  it('does not share mutable sets between resets', () => {
    useViewerStore.getState().reset();
    useViewerStore.getState().hide('ta2-9');
    useViewerStore.getState().reset();
    expect(useViewerStore.getState().hidden.size).toBe(0);
  });
});

describe('focus', () => {
  it('hands the focus controller a new target each time, even for the same bounds', () => {
    const bounds: Bounds = { min: [0, 0, 0], max: [1, 1, 1] };
    useViewerStore.getState().focus(bounds);
    const first = useViewerStore.getState().cameraTarget;
    useViewerStore.getState().focus(bounds);
    const second = useViewerStore.getState().cameraTarget;
    expect(second).toEqual(bounds);
    expect(second).not.toBe(first);
    useViewerStore.getState().focus(null);
    expect(useViewerStore.getState().cameraTarget).toBeNull();
  });
});

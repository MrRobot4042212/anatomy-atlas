import { beforeEach, describe, expect, it } from 'vitest';
import { presetFacingCut, toggleCut, updateCut } from './cut';
import { useViewerStore } from './store';

const initial = useViewerStore.getState();
beforeEach(() => useViewerStore.setState(initial, true));

describe('presetFacingCut', () => {
  it('looks at the exposed face of each plane', () => {
    expect(presetFacingCut({ axis: 'x', flip: false })).toBe('left');
    expect(presetFacingCut({ axis: 'x', flip: true })).toBe('right');
    expect(presetFacingCut({ axis: 'z', flip: false })).toBe('anterior');
    expect(presetFacingCut({ axis: 'z', flip: true })).toBe('posterior');
    expect(presetFacingCut({ axis: 'y', flip: false })).toBe('superior');
  });
});

describe('updateCut', () => {
  it('turns the camera when the cut goes on, the axis changes or it flips, not on offset', () => {
    toggleCut();
    expect(useViewerStore.getState().cameraPreset).toMatchObject({ name: 'left', nonce: 1 });
    updateCut({ offset: 0.3 });
    expect(useViewerStore.getState().cameraPreset?.nonce).toBe(1);
    updateCut({ axis: 'z' });
    expect(useViewerStore.getState().cameraPreset).toMatchObject({ name: 'anterior', nonce: 2 });
    updateCut({ flip: true });
    expect(useViewerStore.getState().cameraPreset).toMatchObject({ name: 'posterior', nonce: 3 });
  });

  it('leaves the camera alone when the cut goes off or changes while off', () => {
    updateCut({ axis: 'y' });
    expect(useViewerStore.getState().cameraPreset).toBeNull();
    toggleCut();
    toggleCut();
    expect(useViewerStore.getState().clipping.enabled).toBe(false);
    expect(useViewerStore.getState().cameraPreset?.nonce).toBe(1);
  });
});

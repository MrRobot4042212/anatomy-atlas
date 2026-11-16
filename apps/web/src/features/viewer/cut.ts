import { useViewerStore, type CameraPreset, type ClippingState } from './store';

/**
 * The camera preset that looks straight at the cut face. `ClippingDirector` keeps the half-space
 * on the negative side of the axis (`flip` keeps the positive one), so the exposed face points
 * towards +axis without flip and towards -axis with it. The model faces +Z and its left is +X.
 *
 * The axial cut has only one preset (superior): with `flip` the kept upper half shows its cut face
 * from below, which no preset frames, so superior is the closest honest view.
 */
export function presetFacingCut(clipping: Pick<ClippingState, 'axis' | 'flip'>): CameraPreset {
  switch (clipping.axis) {
    case 'x':
      return clipping.flip ? 'right' : 'left';
    case 'y':
      return 'superior';
    case 'z':
      return clipping.flip ? 'posterior' : 'anterior';
  }
}

/**
 * Changes the cutting plane through the store and, when the cut is on and the change alters
 * which face is exposed (switching it on, a new axis, a flip), turns the camera to face it
 * through the same preset path as the toolbar. Moving the offset never moves the camera.
 */
export function updateCut(patch: Partial<ClippingState>): void {
  const { clipping: before, setClipping, preset } = useViewerStore.getState();
  setClipping(patch);
  const after = useViewerStore.getState().clipping;
  if (!after.enabled) return;
  const exposedChanged =
    !before.enabled || before.axis !== after.axis || before.flip !== after.flip;
  if (exposedChanged) preset(presetFacingCut(after));
}

export function toggleCut(): void {
  updateCut({ enabled: !useViewerStore.getState().clipping.enabled });
}

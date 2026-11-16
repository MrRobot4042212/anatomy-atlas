import { detailFor } from './structureDetail';
import { ownBounds, registry } from './registry';
import { useViewerStore, type Bounds } from './store';

/** World bounds of a loaded structure, computed on demand (the scene is attached by then). */
export function worldBoundsOf(meshId: string): Bounds | null {
  const entry = registry.get(meshId);
  if (!entry) return null;
  const box = ownBounds(entry);
  if (box.isEmpty()) return null;
  return { min: box.min.toArray(), max: box.max.toArray() };
}

/**
 * Frame a structure: the loaded geometry when its layer is in the scene, otherwise the catalog
 * bounds (equal to world bounds, the model sits at the origin). A late catalog answer is dropped
 * if the selection moved on meanwhile.
 */
export function focusStructure(meshId: string): void {
  const { focus } = useViewerStore.getState();
  const bounds = worldBoundsOf(meshId);
  if (bounds) {
    focus(bounds);
    return;
  }
  void detailFor(meshId)
    .then((d) => {
      if (useViewerStore.getState().selected === meshId) focus(d.structure.bounds);
    })
    .catch(() => undefined);
}

/** Select a structure and frame it: the double click, "Enfocar" and the hierarchy chips. */
export function selectAndFocus(meshId: string): void {
  useViewerStore.getState().select(meshId);
  focusStructure(meshId);
}

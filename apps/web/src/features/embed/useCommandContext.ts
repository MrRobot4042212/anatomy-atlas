'use client';

import { useMemo } from 'react';
import type { AssetBundle } from '@atlas/shared';
import { useViewerStore } from '@/features/viewer/store';
import { detailFor } from '@/features/viewer/structureDetail';
import { availableSystems, indexMeshes, type CommandContext } from './commands';

/**
 * Wires `applyCommand` to the real store and catalog. Actions are read once from the store
 * (they are stable); state is read on demand through `getState`, never subscribed here.
 */
export function useCommandContext(bundles: readonly AssetBundle[]): CommandContext {
  return useMemo(() => {
    const index = indexMeshes(bundles);
    const s = useViewerStore.getState();
    return {
      actions: {
        showSystem: s.showSystem,
        setVisibleSystems: s.setVisibleSystems,
        select: s.select,
        focus: s.focus,
        isolate: s.isolate,
        unhideAll: s.unhideAll,
        preset: s.preset,
      },
      getSelected: () => useViewerStore.getState().selected,
      systemOf: (meshId) => index.get(meshId),
      availableSystems: new Set(availableSystems(bundles)),
      boundsOf: async (meshId) => (await detailFor(meshId)).structure.bounds,
    };
  }, [bundles]);
}

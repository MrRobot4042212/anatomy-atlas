'use client';

import { useLayoutEffect, useMemo } from 'react';
import type { AssetBundle } from '@atlas/shared';
import { indexMeshes } from '@/features/embed/commands';
import { presetFacingCut } from '@/features/viewer/cut';
import { subsystemKey, useViewerStore } from '@/features/viewer/store';
import {
  parseView,
  serializeView,
  viewChanged,
  withViewHash,
  type ViewCatalog,
  type ViewSnapshot,
} from './urlState';

const WRITE_DELAY_MS = 300;

function defaults(): ViewSnapshot {
  return useViewerStore.getInitialState();
}

function catalogOf(bundles: readonly AssetBundle[]): ViewCatalog {
  const meshes = indexMeshes(bundles);
  const subsystems = new Set(
    bundles.flatMap((b) => Object.keys(b.subsystems).map((name) => subsystemKey(b.system, name))),
  );
  return { hasMesh: (id) => meshes.has(id), hasSubsystem: (key) => subsystems.has(key) };
}

/** Puts a parsed view into the store; with a cut on, the camera turns to face it. */
function applyView(view: ViewSnapshot): void {
  useViewerStore.setState({
    visibleSystems: view.visibleSystems,
    translucentSystems: view.translucentSystems,
    hiddenSubsystems: view.hiddenSubsystems,
    zones: view.zones,
    side: view.side,
    selected: view.selected,
    clipping: view.clipping,
    dimOthers: view.dimOthers,
  });
  if (view.clipping.enabled) useViewerStore.getState().preset(presetFacingCut(view.clipping));
}

/**
 * Keeps the view in the URL hash (`urlState.ts` has the format). On mount it restores the hash
 * before the first paint and before `?mesh=` is applied (a layout effect runs ahead of every
 * passive effect), so an explicit deep link still wins over a stale hash. Afterwards every
 * change is written with `history.replaceState`, debounced, so typing a cut offset does not
 * flood the history API and the back button never steps through view changes.
 */
export function useUrlState(bundles: readonly AssetBundle[]): void {
  const catalog = useMemo(() => catalogOf(bundles), [bundles]);

  useLayoutEffect(() => {
    const restore = () => {
      const view = parseView(window.location.hash, defaults(), catalog);
      if (view) applyView(view);
    };
    restore();

    let timer: ReturnType<typeof setTimeout> | undefined;
    // The address is compared, not the last written view: the URL is the source of truth, and a
    // remount (StrictMode, a new bundle list) must not believe a change is already written.
    const flush = () => {
      clearTimeout(timer);
      timer = undefined;
      const href = withViewHash(
        window.location.href,
        serializeView(useViewerStore.getState(), defaults()),
      );
      if (href !== window.location.href) window.history.replaceState(null, '', href);
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(flush, WRITE_DELAY_MS);
    };
    // One write after the first effects settle: it takes in the `?mesh=` selection (applied by
    // a passive effect after this one) and normalises a hash that was corrupt or partly invalid.
    schedule();
    const unsubscribe = useViewerStore.subscribe((state, prev) => {
      if (viewChanged(state, prev)) schedule();
    });
    // A hand-edited hash applies at once; our own replaceState never fires this event.
    window.addEventListener('hashchange', restore);
    // Reloading inside the debounce window would lose the last change.
    const onPageHide = () => {
      if (timer !== undefined) flush();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('hashchange', restore);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [catalog]);
}

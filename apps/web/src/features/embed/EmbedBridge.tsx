'use client';

import { useEffect, useMemo } from 'react';
import type { AssetBundle } from '@atlas/shared';
import { useViewerStore } from '@/features/viewer/store';
import { detailFor } from '@/features/viewer/structureDetail';
import { applyCommand, availableSystems } from './commands';
import { layersChangedEvent, readyEvent, selectedEvent } from './events';
import { acceptMessage } from './gate';
import { resolveHostOrigin } from './origins';
import { useCommandContext } from './useCommandContext';

/**
 * The postMessage bridge to the page that frames the atlas (ADR 0006, `docs/embedding.md`).
 * Renders nothing. Inbound: commands from `window.parent`, allowlisted origins only, validated
 * by `acceptMessage`. Outbound: `ready`, `selected`, `layers-changed`, always posted to one
 * explicit origin. Until that origin is known (no `ancestorOrigins`, no referrer) nothing is
 * sent; the host's first valid message pins it and is answered with `ready`.
 */
export function EmbedBridge({
  allowedOrigins,
  bundles,
}: {
  allowedOrigins: string[];
  bundles: AssetBundle[];
}) {
  const ctx = useCommandContext(bundles);
  const systems = useMemo(() => availableSystems(bundles), [bundles]);

  useEffect(() => {
    if (window.parent === window || allowedOrigins.length === 0) return;
    const parent = window.parent;
    let hostOrigin = resolveHostOrigin(
      // Firefox has no `ancestorOrigins`; the DOM typings claim it always exists.
      { ancestorOrigin: window.location.ancestorOrigins?.[0], referrer: document.referrer },
      allowedOrigins,
    );

    const post = (message: object) => {
      if (hostOrigin) parent.postMessage(message, hostOrigin);
    };
    const sendReady = () => post(readyEvent(systems, useViewerStore.getState().visibleSystems));

    // Names arrive asynchronously; a newer selection invalidates an older pending one.
    let selection = 0;
    const emitSelected = (meshId: string | null) => {
      const seq = ++selection;
      if (meshId === null) {
        post(selectedEvent(null, null));
        return;
      }
      void detailFor(meshId)
        .then(
          (detail) => detail.structure.names,
          () => null,
        )
        .then((names) => {
          if (seq === selection) post(selectedEvent(meshId, names));
        });
    };

    const unsubscribe = useViewerStore.subscribe((state, prev) => {
      if (state.visibleSystems !== prev.visibleSystems) {
        post(layersChangedEvent(state.visibleSystems));
      }
      if (state.selected !== prev.selected) emitSelected(state.selected);
    });

    const onMessage = (event: MessageEvent) => {
      const command = acceptMessage(event, parent, allowedOrigins);
      if (!command) return;
      const firstContact = hostOrigin === null;
      hostOrigin = event.origin;
      if (command.type === 'ping' || firstContact) sendReady();
      if (command.type !== 'ping') void applyCommand(command, ctx);
    };

    window.addEventListener('message', onMessage);
    sendReady();
    return () => {
      selection += 1; // drop names still in flight
      unsubscribe();
      window.removeEventListener('message', onMessage);
    };
  }, [allowedOrigins, systems, ctx]);

  return null;
}

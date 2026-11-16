'use client';

import { useEffect } from 'react';
import type { AssetBundle } from '@atlas/shared';
import { applyCommand } from './commands';
import { useCommandContext } from './useCommandContext';

/**
 * `?mesh=<meshId>`: selects and frames that structure once on load, in embed and standalone
 * mode alike. The page has already validated the id against the catalog (`resolveDeepLink`);
 * this goes through the same command path as the bridge's `select`.
 */
export function DeepLinkSelection({ meshId, bundles }: { meshId: string; bundles: AssetBundle[] }) {
  const ctx = useCommandContext(bundles);

  useEffect(() => {
    void applyCommand({ type: 'select', meshId, focus: true }, ctx);
  }, [meshId, ctx]);

  return null;
}

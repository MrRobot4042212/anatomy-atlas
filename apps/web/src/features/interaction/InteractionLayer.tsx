'use client';

import type { AssetBundle } from '@atlas/shared';
import { HelpSheet } from './HelpSheet';
import { useShortcuts } from './useShortcuts';
import { useUrlState } from './useUrlState';

/**
 * The page-wide interaction layer: keyboard shortcuts, the view in the URL hash and the
 * shortcut sheet. Mounted once by the page; renders only the (closed) sheet.
 */
export function InteractionLayer({ bundles }: { bundles: AssetBundle[] }) {
  useShortcuts();
  useUrlState(bundles);
  return <HelpSheet />;
}

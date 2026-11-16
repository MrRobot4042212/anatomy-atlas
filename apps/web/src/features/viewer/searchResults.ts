import type { Structure } from '@atlas/shared';

/** One structure in the results: its sides (left, right) or its single midline row. */
export interface ResultGroup {
  termKey: string;
  items: Structure[];
}

const SIDE_ORDER = { left: 0, right: 1, midline: 2 } as const;

/**
 * Groups ranked search results by structure so the two sides of one structure sit together, in the
 * order the API ranked them (a group takes the place of its best item). Only what the viewer can
 * show is kept: structures with geometry, and group nodes the API framed with their descendants'
 * bounds. A bilateral parent ("Sciatic nerve", the node above its left and right meshes) is dropped
 * when its sides are in the results: it would be a third row with the same name.
 */
export function groupResults(items: readonly Structure[]): ResultGroup[] {
  const groups = new Map<string, Structure[]>();
  for (const s of items) {
    if (!s.meshId && !s.bounds) continue;
    const list = groups.get(s.termKey);
    if (list) list.push(s);
    else groups.set(s.termKey, [s]);
  }
  return [...groups].map(([termKey, list]) => {
    const withGeometry = list.filter((s) => s.meshId);
    const kept = withGeometry.length > 0 ? withGeometry : list.slice(0, 1);
    return {
      termKey,
      items: [...kept].sort((a, b) => SIDE_ORDER[a.laterality] - SIDE_ORDER[b.laterality]),
    };
  });
}

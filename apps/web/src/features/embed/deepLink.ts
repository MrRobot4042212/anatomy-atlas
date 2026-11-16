import { isMeshId } from './protocol';

/** First value of a search param that may repeat (`?mesh=a&mesh=b` keeps `a`). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Validates `?mesh=` against the catalog: the id must have the pipeline's meshId shape and be a
 * mesh of a served bundle. Anything else is dropped and the page loads as if it were absent.
 */
export function resolveDeepLink(
  value: string | undefined,
  meshIndex: ReadonlyMap<string, unknown>,
): string | null {
  if (!isMeshId(value)) return null;
  return meshIndex.has(value) ? value : null;
}

/** `?embed=1` (also `true`) switches to the embedded layout and starts the bridge. */
export function isEmbedFlag(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

import type { BodySystem, BodyZone } from '@atlas/shared';
import type { Variant } from './materials';
import type { ViewerState } from './store';

export type PaintState = Pick<
  ViewerState,
  | 'hovered'
  | 'selected'
  | 'hidden'
  | 'hiddenSubsystems'
  | 'isolated'
  | 'transparent'
  | 'translucentSystems'
  | 'zones'
  | 'side'
  | 'dimOthers'
>;

/** Side of a structure from its meshId (`ta2-1360-r`): left, right, or null for the midline. */
export function sideOf(meshId: string): 'left' | 'right' | null {
  if (meshId.endsWith('-l')) return 'left';
  if (meshId.endsWith('-r')) return 'right';
  return null;
}

/** Whether the zone and side filters let this mesh through. No active filter lets everything in. */
export function passesFilters(
  meshId: string,
  zoneOf: Map<string, BodyZone>,
  zones: ReadonlySet<BodyZone>,
  side: ViewerState['side'],
): boolean {
  if (zones.size > 0) {
    const zone = zoneOf.get(meshId);
    if (!zone || !zones.has(zone)) return false;
  }
  if (side !== 'both') {
    const own = sideOf(meshId);
    if (own !== null && own !== side) return false;
  }
  return true;
}

/**
 * How one structure looks. Order matters: the selection and the hover always win; then the
 * strong isolate; then the automatic dimming around a selection; then the translucency chosen
 * for the structure or for its whole system.
 */
export function variantFor(meshId: string, system: BodySystem, state: PaintState): Variant {
  if (meshId === state.selected) return 'selected';
  if (meshId === state.hovered) return 'hover';
  if (state.isolated && meshId !== state.isolated) return 'ghost';
  if (state.selected && state.dimOthers) return 'ghost';
  if (state.transparent.has(meshId)) return 'translucent';
  if (state.translucentSystems.has(system)) return 'translucent';
  return 'base';
}

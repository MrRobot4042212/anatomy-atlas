import type { AssetBundle, BodySystem, BodyZone } from '@atlas/shared';
import { subsystemKey, type Bounds, type ClippingState, type ViewerState } from './store';
import { passesFilters } from './visibility';

/**
 * Why the selected structure cannot be seen, in the order the cue reports it. The first four
 * are decided from viewer state and catalog data alone (exact); `clipped` from the bounds and
 * the cutting plane (exact for the bounds); `out-of-view` and `occluded` from the camera
 * (frustum test and a few rays, measured by the sight probe in the canvas).
 */
export type CueKind =
  | 'layer-hidden'
  | 'subsystem-hidden'
  | 'zone-filtered'
  | 'side-filtered'
  | 'clipped'
  | 'out-of-view'
  | 'occluded';

/** What the canvas measured for the selection; `unknown` while nothing is measured yet. */
export type Sight = 'visible' | 'clipped' | 'out-of-view' | 'occluded' | 'unknown';

/** Catalog facts about a mesh needed to explain why it does not show. */
export interface MeshFacts {
  system: BodySystem;
  subsystem?: string; // `subsystemKey` form
  zone?: BodyZone;
}

/** meshId -> system, subsystem key and zone, from the bundles the catalog serves. */
export function indexMeshFacts(bundles: readonly AssetBundle[]): Map<string, MeshFacts> {
  const index = new Map<string, MeshFacts>();
  for (const bundle of bundles) {
    for (const meshId of bundle.meshes) index.set(meshId, { system: bundle.system });
    for (const [subsystem, ids] of Object.entries(bundle.subsystems)) {
      const key = subsystemKey(bundle.system, subsystem);
      for (const id of ids) {
        const facts = index.get(id);
        if (facts) facts.subsystem = key;
      }
    }
    for (const [zone, ids] of Object.entries(bundle.zones ?? {})) {
      for (const id of ids ?? []) {
        const facts = index.get(id);
        if (facts) facts.zone = zone as BodyZone;
      }
    }
  }
  return index;
}

export type CueState = Pick<ViewerState, 'visibleSystems' | 'hiddenSubsystems' | 'zones' | 'side'>;

/**
 * The one reason to report for the selection, or null when it shows (or nothing is selected).
 * State reasons come first because they are certain and their remedy is one click; the camera
 * reasons only count when they were measured for this same selection.
 */
export function cueFor(
  meshId: string | null,
  facts: MeshFacts | undefined,
  state: CueState,
  sight: { meshId: string | null; sight: Sight },
): CueKind | null {
  if (!meshId || !facts) return null;
  if (!state.visibleSystems.has(facts.system)) return 'layer-hidden';
  if (facts.subsystem && state.hiddenSubsystems.has(facts.subsystem)) return 'subsystem-hidden';
  const zoneOf = new Map<string, BodyZone>(facts.zone ? [[meshId, facts.zone]] : []);
  if (!passesFilters(meshId, zoneOf, state.zones, 'both')) return 'zone-filtered';
  if (!passesFilters(meshId, zoneOf, new Set(), state.side)) return 'side-filtered';
  if (sight.meshId !== meshId) return null;
  if (sight.sight === 'clipped' || sight.sight === 'out-of-view' || sight.sight === 'occluded') {
    return sight.sight;
  }
  return null;
}

/** Copy of the cue: what happened, and the one-click remedy (a verb, DESIGN.md voice). */
export const CUE_COPY: Record<CueKind, { message: string; action: string }> = {
  'layer-hidden': { message: 'La selección está en una capa oculta.', action: 'Mostrar capa' },
  'subsystem-hidden': {
    message: 'La selección está en un grupo oculto de su capa.',
    action: 'Mostrar grupo',
  },
  'zone-filtered': {
    message: 'La selección queda fuera del filtro de región.',
    action: 'Quitar filtro',
  },
  'side-filtered': { message: 'La selección es del otro lado.', action: 'Ver ambos lados' },
  clipped: { message: 'El plano de corte oculta la selección.', action: 'Quitar corte' },
  'out-of-view': { message: 'La selección está fuera de la vista.', action: 'Enfocar' },
  occluded: { message: 'Otras estructuras tapan la selección.', action: 'Atenuar resto' },
};

/**
 * Whether the cutting plane removes the whole box. Mirrors the plane the clipping director
 * builds: `offset` runs over the body's extent on the axis, and without `flip` the half above
 * the cut is removed.
 */
export function clippedAway(bounds: Bounds, clipping: ClippingState, body: Bounds): boolean {
  if (!clipping.enabled) return false;
  const i = { x: 0, y: 1, z: 2 }[clipping.axis];
  const at = body.min[i] + clipping.offset * (body.max[i] - body.min[i]);
  return clipping.flip ? bounds.max[i] < at : bounds.min[i] > at;
}

/**
 * Occlusion verdict from the first opaque hit of each sample ray (null when the ray hit
 * nothing). Visible as soon as one ray reaches the selection first; occluded only when every
 * ray that hit something hit another structure first; unknown when no ray hit anything.
 */
export function occlusionVerdict(firstHits: readonly (string | null)[], meshId: string): Sight {
  let blocked = 0;
  for (const hit of firstHits) {
    if (hit === meshId) return 'visible';
    if (hit !== null) blocked += 1;
  }
  return blocked > 0 ? 'occluded' : 'unknown';
}

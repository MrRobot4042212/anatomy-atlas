import type { AssetBundle, BodySystem, BodyZone } from '@atlas/shared';
import { subsystemKey, type Bounds, type SideFilter } from './store';
import { passesFilters } from './visibility';

/** Pure parts of the region filter: labels, silhouette geometry, counts and framing. */

export const ZONE_LABELS: Record<BodyZone, string> = {
  head: 'Cabeza',
  neck: 'Cuello',
  thorax: 'Tórax',
  abdomen: 'Abdomen',
  pelvis: 'Pelvis',
  back: 'Espalda',
  shoulder: 'Hombro',
  arm: 'Brazo',
  forearm: 'Antebrazo',
  hand: 'Mano',
  thigh: 'Muslo',
  leg: 'Pierna',
  foot: 'Pie',
};

/** Chip groups, in reading order; together they hold every zone once. */
export const ZONE_GROUPS: { label: string; zones: BodyZone[] }[] = [
  { label: 'Cabeza y tronco', zones: ['head', 'neck', 'thorax', 'abdomen', 'pelvis', 'back'] },
  { label: 'Miembro superior', zones: ['shoulder', 'arm', 'forearm', 'hand'] },
  { label: 'Miembro inferior', zones: ['thigh', 'leg', 'foot'] },
];

export const SIDE_OPTIONS: { value: SideFilter; label: string }[] = [
  { value: 'both', label: 'Ambos' },
  { value: 'left', label: 'Izquierdo' },
  { value: 'right', label: 'Derecho' },
];

// Silhouette, anterior view, in a 140 x 300 box (the body is 1.79 m: one unit is about 6 mm).
// The subject faces the viewer, so the subject's right side is on the left of the drawing. Each
// limb zone is one path with both sides: the side control, not the drawing, picks the side.
type Point = readonly [number, number];
export const FRONT_VIEWBOX = { width: 140, height: 300 };
export const BACK_VIEWBOX = { width: 64, height: 132 };
const MID = FRONT_VIEWBOX.width / 2;

/** The subject's right half; the left half is its mirror image. */
const RIGHT_HALF: Partial<Record<BodyZone, Point[]>> = {
  shoulder: [
    [57, 63],
    [46, 72],
    [45, 90],
    [32, 90],
    [32, 75],
    [41, 65],
  ],
  arm: [
    [45, 90],
    [32, 90],
    [27, 129],
    [40, 131],
  ],
  forearm: [
    [40, 131],
    [27, 129],
    [19, 171],
    [30, 173],
  ],
  hand: [
    [30, 173],
    [19, 171],
    [14, 188],
    [16, 199],
    [23, 202],
    [30, 191],
  ],
  thigh: [
    [43, 166],
    [48, 178],
    [68, 183],
    [66, 236],
    [48, 236],
    [42, 198],
  ],
  leg: [
    [48, 236],
    [66, 236],
    [64, 284],
    [53, 284],
    [49, 258],
  ],
  foot: [
    [53, 284],
    [64, 284],
    [66, 292],
    [64, 297],
    [45, 297],
    [46, 291],
  ],
};

/** Midline zones, drawn whole. */
const MIDLINE: Partial<Record<BodyZone, Point[]>> = {
  neck: [
    [62, 46],
    [78, 46],
    [80, 62],
    [60, 62],
  ],
  thorax: [
    [57, 63],
    [83, 63],
    [94, 72],
    [95, 108],
    [45, 108],
    [46, 72],
  ],
  abdomen: [
    [45, 108],
    [95, 108],
    [93, 148],
    [47, 148],
  ],
  pelvis: [
    [47, 148],
    [93, 148],
    [97, 166],
    [92, 178],
    [72, 183],
    [68, 183],
    [48, 178],
    [43, 166],
  ],
};

/** The posterior trunk in the small dorsal view (BACK_VIEWBOX), from the neck to the pelvis. */
const BACK_TRUNK: Point[] = [
  [24, 30],
  [40, 30],
  [49, 36],
  [49, 74],
  [46, 96],
  [18, 96],
  [15, 74],
  [15, 36],
];
/** Context drawn around the dorsal view, not clickable: head, neck, buttocks. */
export const BACK_CONTEXT = {
  head: { cx: 32, cy: 15, rx: 8.5, ry: 10.5 },
  neck: polygonPath([
    [28, 25],
    [36, 25],
    [37, 30],
    [27, 30],
  ]),
  pelvis: polygonPath([
    [18, 98],
    [46, 98],
    [48, 112],
    [33, 116],
    [31, 116],
    [16, 112],
  ]),
};

export function polygonPath(points: readonly Point[]): string {
  return `M${points.map(([x, y]) => `${x} ${y}`).join(' L')} Z`;
}

export function mirror(points: readonly Point[], width = FRONT_VIEWBOX.width): Point[] {
  return points.map(([x, y]) => [width - x, y] as const).reverse();
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`;
}

/** SVG path data per zone and the view it is drawn in. */
export const SILHOUETTE: Record<BodyZone, { view: 'front' | 'back'; d: string }> = (() => {
  const out = {} as Record<BodyZone, { view: 'front' | 'back'; d: string }>;
  out.head = { view: 'front', d: ellipsePath(MID, 26, 15, 19) };
  for (const [zone, points] of Object.entries(MIDLINE) as [BodyZone, Point[]][]) {
    out[zone] = { view: 'front', d: polygonPath(points) };
  }
  for (const [zone, points] of Object.entries(RIGHT_HALF) as [BodyZone, Point[]][]) {
    out[zone] = { view: 'front', d: `${polygonPath(points)} ${polygonPath(mirror(points))}` };
  }
  out.back = { view: 'back', d: polygonPath(BACK_TRUNK) };
  return out;
})();

/** meshId -> zone over all bundles; empty when no bundle carries a zones index yet. */
export function zoneIndex(bundles: readonly AssetBundle[]): Map<string, BodyZone> {
  const zoneOf = new Map<string, BodyZone>();
  for (const bundle of bundles) {
    for (const [zone, ids] of Object.entries(bundle.zones ?? {}) as [BodyZone, string[]][]) {
      for (const id of ids) zoneOf.set(id, zone);
    }
  }
  return zoneOf;
}

/** The slices of the viewer state that decide whether a structure is on screen. */
export interface ShownState {
  visibleSystems: ReadonlySet<BodySystem>;
  hiddenSubsystems: ReadonlySet<string>;
  hidden: ReadonlySet<string>;
  zones: ReadonlySet<BodyZone>;
  side: SideFilter;
}

/**
 * meshIds the viewer shows: visible systems, minus switched-off subsystems and hidden
 * structures, through the zone and side filters. Mirrors the paint pass of SystemLayer.
 */
export function shownMeshIds(
  bundles: readonly AssetBundle[],
  zoneOf: Map<string, BodyZone>,
  state: ShownState,
): string[] {
  const out: string[] = [];
  for (const bundle of bundles) {
    if (!state.visibleSystems.has(bundle.system)) continue;
    const subsystemOf = new Map<string, string>();
    for (const [subsystem, ids] of Object.entries(bundle.subsystems)) {
      const key = subsystemKey(bundle.system, subsystem);
      for (const id of ids) subsystemOf.set(id, key);
    }
    for (const meshId of bundle.meshes) {
      const sub = subsystemOf.get(meshId);
      if (sub && state.hiddenSubsystems.has(sub)) continue;
      if (state.hidden.has(meshId)) continue;
      if (passesFilters(meshId, zoneOf, state.zones, state.side)) out.push(meshId);
    }
  }
  return out;
}

/** The zone left as the only selected one after toggling `zone`, or null. */
export function soleZoneAfterToggle(zones: ReadonlySet<BodyZone>, zone: BodyZone): BodyZone | null {
  const next = new Set(zones);
  if (next.has(zone)) next.delete(zone);
  else next.add(zone);
  return next.size === 1 ? [...next][0] : null;
}

/** Union of axis-aligned boxes; null for none. */
export function unionBounds(boxes: Iterable<Bounds>): Bounds | null {
  let out: Bounds | null = null;
  for (const b of boxes) {
    out = out
      ? {
          min: [
            Math.min(out.min[0], b.min[0]),
            Math.min(out.min[1], b.min[1]),
            Math.min(out.min[2], b.min[2]),
          ],
          max: [
            Math.max(out.max[0], b.max[0]),
            Math.max(out.max[1], b.max[1]),
            Math.max(out.max[2], b.max[2]),
          ],
        }
      : { min: [b.min[0], b.min[1], b.min[2]], max: [b.max[0], b.max[1], b.max[2]] };
  }
  return out;
}

/** Roving focus in a list of `count` items: the index a navigation key moves to, or null. */
export function rovingIndex(key: string, index: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (index + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** "1 estructura", "56 estructuras". */
export function structuresLabel(count: number): string {
  return `${count.toLocaleString('es')} ${count === 1 ? 'estructura' : 'estructuras'}`;
}

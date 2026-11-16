import { describe, expect, it } from 'vitest';
import { BODY_ZONES, type AssetBundle, type BodySystem, type BodyZone } from '@atlas/shared';
import {
  FRONT_VIEWBOX,
  SIDE_OPTIONS,
  SILHOUETTE,
  ZONE_GROUPS,
  ZONE_LABELS,
  mirror,
  polygonPath,
  rovingIndex,
  shownMeshIds,
  soleZoneAfterToggle,
  structuresLabel,
  unionBounds,
  zoneIndex,
  type ShownState,
} from './regionFilter';

const bundle = (system: BodySystem, patch: Partial<AssetBundle>): AssetBundle => ({
  id: `${system}-v1`,
  system,
  url: `/models/${system}-v1.glb`,
  sizeBytes: 1,
  meshCount: patch.meshes?.length ?? 0,
  meshes: [],
  subsystems: {},
  hash: 'h',
  ...patch,
});

const muscular = bundle('muscular', {
  meshes: ['m-forearm-r', 'm-forearm-l', 'm-hand-r', 'f-forearm-r', 'm-thorax'],
  subsystems: {
    muscles: ['m-forearm-r', 'm-forearm-l', 'm-hand-r', 'm-thorax'],
    fascia: ['f-forearm-r'],
  },
  zones: {
    forearm: ['m-forearm-r', 'm-forearm-l', 'f-forearm-r'],
    hand: ['m-hand-r'],
    thorax: ['m-thorax'],
  },
});
const skeletal = bundle('skeletal', {
  meshes: ['b-forearm-r', 'b-arm-r'],
  subsystems: { bones: ['b-forearm-r', 'b-arm-r'] },
  zones: { forearm: ['b-forearm-r'], arm: ['b-arm-r'] },
});
const bundles = [muscular, skeletal];
const zoneOf = zoneIndex(bundles);

const state = (patch: Partial<ShownState> = {}): ShownState => ({
  visibleSystems: new Set<BodySystem>(['muscular', 'skeletal']),
  hiddenSubsystems: new Set(),
  hidden: new Set(),
  zones: new Set(),
  side: 'both',
  ...patch,
});

describe('labels and groups', () => {
  it('names every zone in Spanish', () => {
    expect(BODY_ZONES.map((z) => ZONE_LABELS[z])).toEqual([
      'Cabeza',
      'Cuello',
      'Tórax',
      'Abdomen',
      'Pelvis',
      'Espalda',
      'Hombro',
      'Brazo',
      'Antebrazo',
      'Mano',
      'Muslo',
      'Pierna',
      'Pie',
    ]);
  });
  it('puts every zone in exactly one chip group', () => {
    const grouped = ZONE_GROUPS.flatMap((g) => g.zones);
    expect([...grouped].sort()).toEqual([...BODY_ZONES].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
  it('offers both, left and right as the side options', () => {
    expect(SIDE_OPTIONS.map((o) => [o.value, o.label])).toEqual([
      ['both', 'Ambos'],
      ['left', 'Izquierdo'],
      ['right', 'Derecho'],
    ]);
  });
  it('counts structures with singular and plural', () => {
    expect(structuresLabel(1)).toBe('1 estructura');
    expect(structuresLabel(56)).toBe('56 estructuras');
  });
});

describe('silhouette', () => {
  it('has one path per zone; back is the only one in the posterior view', () => {
    for (const zone of BODY_ZONES) expect(SILHOUETTE[zone].d).toMatch(/^M.*Z$/);
    expect(BODY_ZONES.filter((z) => SILHOUETTE[z].view === 'back')).toEqual(['back']);
  });
  it('draws both sides of a limb in its single path, mirrored about the midline', () => {
    for (const zone of ['shoulder', 'arm', 'forearm', 'hand', 'thigh', 'leg', 'foot'] as const) {
      expect(SILHOUETTE[zone].d.match(/M/g)).toHaveLength(2);
    }
    expect(SILHOUETTE.thorax.d.match(/M/g)).toHaveLength(1);
    const half = [
      [10, 5],
      [20, 30],
    ] as const;
    expect(mirror(half)).toEqual([
      [FRONT_VIEWBOX.width - 20, 30],
      [FRONT_VIEWBOX.width - 10, 5],
    ]);
    expect(polygonPath(half)).toBe('M10 5 L20 30 Z');
  });
  it('keeps every point inside the drawing', () => {
    for (const zone of BODY_ZONES) {
      const nums = SILHOUETTE[zone].d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
      expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...nums)).toBeLessThanOrEqual(FRONT_VIEWBOX.height);
    }
  });
});

describe('zoneIndex', () => {
  it('joins the zones of every bundle', () => {
    expect(zoneOf.get('m-forearm-r')).toBe('forearm');
    expect(zoneOf.get('b-arm-r')).toBe('arm');
    expect(zoneOf.size).toBe(7);
  });
  it('is empty while no bundle carries zones', () => {
    expect(zoneIndex([bundle('skeletal', { meshes: ['x'] })]).size).toBe(0);
  });
});

describe('shownMeshIds', () => {
  it('shows every mesh of the visible systems when no filter is active', () => {
    expect(shownMeshIds(bundles, zoneOf, state())).toHaveLength(7);
    expect(shownMeshIds(bundles, zoneOf, state({ visibleSystems: new Set(['skeletal']) }))).toEqual(
      ['b-forearm-r', 'b-arm-r'],
    );
  });
  it('drops switched-off subsystems and hidden structures', () => {
    const s = state({
      hiddenSubsystems: new Set(['muscular/fascia']),
      hidden: new Set(['m-thorax']),
    });
    expect(shownMeshIds(bundles, zoneOf, s)).not.toContain('f-forearm-r');
    expect(shownMeshIds(bundles, zoneOf, s)).not.toContain('m-thorax');
  });
  it('muscles of the right forearm only: muscular, forearm, right', () => {
    const s = state({
      visibleSystems: new Set(['muscular']),
      hiddenSubsystems: new Set(['muscular/fascia']),
      zones: new Set<BodyZone>(['forearm']),
      side: 'right',
    });
    expect(shownMeshIds(bundles, zoneOf, s)).toEqual(['m-forearm-r']);
  });
  it('several zones add up', () => {
    const s = state({ zones: new Set<BodyZone>(['forearm', 'hand']) });
    expect(shownMeshIds(bundles, zoneOf, s).sort()).toEqual([
      'b-forearm-r',
      'f-forearm-r',
      'm-forearm-l',
      'm-forearm-r',
      'm-hand-r',
    ]);
  });
});

describe('soleZoneAfterToggle', () => {
  it('is the zone picked when nothing was selected', () => {
    expect(soleZoneAfterToggle(new Set(), 'forearm')).toBe('forearm');
  });
  it('is the zone left behind when one of two is removed', () => {
    expect(soleZoneAfterToggle(new Set<BodyZone>(['forearm', 'hand']), 'hand')).toBe('forearm');
  });
  it('is null when the toggle leaves none or several', () => {
    expect(soleZoneAfterToggle(new Set<BodyZone>(['forearm']), 'forearm')).toBeNull();
    expect(soleZoneAfterToggle(new Set<BodyZone>(['forearm']), 'hand')).toBeNull();
  });
});

describe('unionBounds', () => {
  it('encloses every box and is null for none', () => {
    expect(unionBounds([])).toBeNull();
    expect(
      unionBounds([
        { min: [0, 1, 2], max: [1, 2, 3] },
        { min: [-1, 1.5, 0], max: [0.5, 4, 2] },
      ]),
    ).toEqual({ min: [-1, 1, 0], max: [1, 4, 3] });
  });
});

describe('rovingIndex', () => {
  it('moves with the arrows, wraps, and jumps with Home and End', () => {
    expect(rovingIndex('ArrowRight', 0, 13)).toBe(1);
    expect(rovingIndex('ArrowDown', 12, 13)).toBe(0);
    expect(rovingIndex('ArrowLeft', 0, 13)).toBe(12);
    expect(rovingIndex('Home', 7, 13)).toBe(0);
    expect(rovingIndex('End', 2, 13)).toBe(12);
    expect(rovingIndex('Enter', 2, 13)).toBeNull();
  });
});

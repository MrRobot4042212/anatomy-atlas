import { describe, expect, it } from 'vitest';
import type { AssetBundle, BodySystem, BodyZone } from '@atlas/shared';
import {
  clippedAway,
  cueFor,
  indexMeshFacts,
  occlusionVerdict,
  type CueState,
  type MeshFacts,
} from './selectionSight';
import { DEFAULT_CLIPPING, type Bounds } from './store';

const BODY: Bounds = { min: [-0.34, 0, -0.12], max: [0.34, 1.71, 0.14] };

const state = (patch: Partial<CueState> = {}): CueState => ({
  visibleSystems: new Set<BodySystem>(['skeletal']),
  hiddenSubsystems: new Set(),
  zones: new Set<BodyZone>(),
  side: 'both',
  ...patch,
});
const malleus: MeshFacts = {
  system: 'skeletal',
  subsystem: 'skeletal/auditory-ossicles',
  zone: 'head',
};
const seen = { meshId: 'ta2-881-r', sight: 'visible' as const };

describe('indexMeshFacts', () => {
  it('joins system, subsystem and zone per meshId from the bundles', () => {
    const bundle: AssetBundle = {
      id: 'skeletal-v1',
      system: 'skeletal',
      url: '/models/skeletal.glb',
      sizeBytes: 1,
      meshCount: 2,
      meshes: ['ta2-881-r', 'ta2-1001'],
      subsystems: { 'auditory-ossicles': ['ta2-881-r'] },
      zones: { head: ['ta2-881-r'], thorax: ['ta2-1001'] },
      hash: 'x',
    };
    const index = indexMeshFacts([bundle]);
    expect(index.get('ta2-881-r')).toEqual(malleus);
    expect(index.get('ta2-1001')).toEqual({ system: 'skeletal', zone: 'thorax' });
    expect(index.get('ta2-unknown')).toBeUndefined();
  });

  it('works for bundles without a zone index', () => {
    const bundle = {
      id: 'b',
      system: 'nervous',
      url: '',
      sizeBytes: 0,
      meshCount: 1,
      meshes: ['ta2-5'],
      subsystems: {},
      hash: '',
    } satisfies AssetBundle;
    expect(indexMeshFacts([bundle]).get('ta2-5')).toEqual({ system: 'nervous' });
  });
});

describe('cueFor', () => {
  it('says nothing without a selection or for a structure the catalog does not know', () => {
    expect(cueFor(null, malleus, state(), seen)).toBeNull();
    expect(cueFor('ta2-881-r', undefined, state(), seen)).toBeNull();
  });

  it('says nothing for a selection that shows', () => {
    expect(cueFor('ta2-881-r', malleus, state(), seen)).toBeNull();
  });

  it('reports a hidden layer first', () => {
    const s = state({
      visibleSystems: new Set(),
      hiddenSubsystems: new Set(['skeletal/auditory-ossicles']),
    });
    expect(cueFor('ta2-881-r', malleus, s, seen)).toBe('layer-hidden');
  });

  it('reports a hidden subsystem', () => {
    const s = state({ hiddenSubsystems: new Set(['skeletal/auditory-ossicles']) });
    expect(cueFor('ta2-881-r', malleus, s, seen)).toBe('subsystem-hidden');
  });

  it('reports a zone filter that leaves the selection out, also when its zone is unknown', () => {
    const s = state({ zones: new Set<BodyZone>(['thorax']) });
    expect(cueFor('ta2-881-r', malleus, s, seen)).toBe('zone-filtered');
    expect(cueFor('ta2-881-r', { system: 'skeletal' }, s, seen)).toBe('zone-filtered');
    expect(cueFor('ta2-881-r', malleus, state({ zones: new Set(['head']) }), seen)).toBeNull();
  });

  it('reports the side filter, never for midline structures', () => {
    expect(cueFor('ta2-881-r', malleus, state({ side: 'left' }), seen)).toBe('side-filtered');
    expect(cueFor('ta2-881-r', malleus, state({ side: 'right' }), seen)).toBeNull();
    expect(cueFor('ta2-1001', { system: 'skeletal' }, state({ side: 'left' }), seen)).toBeNull();
  });

  it('uses the camera measure only when it is for the same selection', () => {
    const occluded = { meshId: 'ta2-881-r', sight: 'occluded' as const };
    expect(cueFor('ta2-881-r', malleus, state(), occluded)).toBe('occluded');
    expect(cueFor('ta2-881-l', malleus, state(), occluded)).toBeNull();
    const out = { meshId: 'ta2-881-r', sight: 'out-of-view' as const };
    expect(cueFor('ta2-881-r', malleus, state(), out)).toBe('out-of-view');
    const unknown = { meshId: 'ta2-881-r', sight: 'unknown' as const };
    expect(cueFor('ta2-881-r', malleus, state(), unknown)).toBeNull();
  });

  it('prefers a state reason, which is certain, over a camera one', () => {
    const occluded = { meshId: 'ta2-881-r', sight: 'occluded' as const };
    expect(cueFor('ta2-881-r', malleus, state({ side: 'left' }), occluded)).toBe('side-filtered');
  });
});

describe('clippedAway', () => {
  const box: Bounds = { min: [0.05, 1.5, 0], max: [0.06, 1.6, 0.01] };
  const cut = (patch: Partial<typeof DEFAULT_CLIPPING>) => ({
    ...DEFAULT_CLIPPING,
    enabled: true,
    ...patch,
  });

  it('is false while the cut is off', () => {
    expect(clippedAway(box, DEFAULT_CLIPPING, BODY)).toBe(false);
  });

  it('removes a box entirely above the cut, and keeps it when flipped', () => {
    // Sagittal cut at the midline (x = 0): the box at x 0.05..0.06 is on the removed side.
    expect(clippedAway(box, cut({ axis: 'x', offset: 0.5 }), BODY)).toBe(true);
    expect(clippedAway(box, cut({ axis: 'x', offset: 0.5, flip: true }), BODY)).toBe(false);
  });

  it('keeps a box the plane crosses', () => {
    const across: Bounds = { min: [-0.01, 1, 0], max: [0.01, 1.1, 0.01] };
    expect(clippedAway(across, cut({ axis: 'x', offset: 0.5 }), BODY)).toBe(false);
    expect(clippedAway(across, cut({ axis: 'x', offset: 0.5, flip: true }), BODY)).toBe(false);
  });

  it('removes a box below a flipped transverse cut', () => {
    expect(clippedAway(box, cut({ axis: 'y', offset: 0.99, flip: true }), BODY)).toBe(true);
  });
});

describe('occlusionVerdict', () => {
  it('is visible as soon as one ray reaches the selection first', () => {
    expect(occlusionVerdict(['ta2-1', null, 'ta2-881-r'], 'ta2-881-r')).toBe('visible');
  });

  it('is occluded when every ray that hit something hit another structure', () => {
    expect(occlusionVerdict(['ta2-1', null, 'ta2-2'], 'ta2-881-r')).toBe('occluded');
  });

  it('is unknown when no ray hit anything', () => {
    expect(occlusionVerdict([null, null], 'ta2-881-r')).toBe('unknown');
    expect(occlusionVerdict([], 'ta2-881-r')).toBe('unknown');
  });
});

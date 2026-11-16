import { describe, expect, it } from 'vitest';
import type { BodyZone } from '@atlas/shared';
import { passesFilters, sideOf, variantFor, type PaintState } from './visibility';

const state = (patch: Partial<PaintState> = {}): PaintState => ({
  hovered: null,
  selected: null,
  hidden: new Set(),
  hiddenSubsystems: new Set(),
  isolated: null,
  transparent: new Set(),
  translucentSystems: new Set(),
  zones: new Set(),
  side: 'both',
  dimOthers: true,
  ...patch,
});

describe('sideOf', () => {
  it('reads the side from the meshId suffix and treats the rest as midline', () => {
    expect(sideOf('ta2-1360-r')).toBe('right');
    expect(sideOf('ta2-1360-l')).toBe('left');
    expect(sideOf('ta2-1001')).toBeNull();
    expect(sideOf('za-adductor-minimus-l')).toBe('left');
  });
});

describe('passesFilters', () => {
  const zoneOf = new Map<string, BodyZone>([
    ['ta2-10-r', 'forearm'],
    ['ta2-10-l', 'forearm'],
    ['ta2-11-r', 'hand'],
    ['ta2-12', 'thorax'],
    ['ta2-13', 'arm'],
  ]);
  const all = (zones: BodyZone[], side: 'both' | 'left' | 'right') =>
    [...zoneOf.keys()].filter((id) => passesFilters(id, zoneOf, new Set(zones), side));

  it('lets everything through when no filter is active', () => {
    expect(all([], 'both')).toHaveLength(5);
  });
  it('keeps only the chosen zones', () => {
    expect(all(['forearm'], 'both').sort()).toEqual(['ta2-10-l', 'ta2-10-r']);
    expect(all(['forearm', 'hand'], 'both')).toHaveLength(3);
  });
  it('keeps one side and always keeps the midline', () => {
    expect(all([], 'right').sort()).toEqual(['ta2-10-r', 'ta2-11-r', 'ta2-12', 'ta2-13']);
  });
  it('combines zone and side: the forearm on the right is one structure here', () => {
    expect(all(['forearm'], 'right')).toEqual(['ta2-10-r']);
  });
  it('hides a mesh that has no zone while a zone filter is active', () => {
    expect(passesFilters('ta2-99', zoneOf, new Set<BodyZone>(['forearm']), 'both')).toBe(false);
    expect(passesFilters('ta2-99', zoneOf, new Set<BodyZone>(), 'both')).toBe(true);
  });
});

describe('variantFor', () => {
  it('the selection and the hover always win', () => {
    const s = state({ selected: 'a', hovered: 'b', isolated: 'c' });
    expect(variantFor('a', 'skeletal', s)).toBe('selected');
    expect(variantFor('b', 'skeletal', s)).toBe('hover');
  });
  it('dims everything else around a selection, unless dimming is off', () => {
    expect(variantFor('x', 'skeletal', state({ selected: 'a' }))).toBe('ghost');
    expect(variantFor('x', 'skeletal', state({ selected: 'a', dimOthers: false }))).toBe('base');
  });
  it('does not dim anything when nothing is selected', () => {
    expect(variantFor('x', 'skeletal', state())).toBe('base');
  });
  it('isolate ghosts others even with dimming off', () => {
    expect(variantFor('x', 'skeletal', state({ isolated: 'a', dimOthers: false }))).toBe('ghost');
  });
  it('a translucent system and a translucent structure both read as translucent', () => {
    expect(variantFor('x', 'muscular', state({ translucentSystems: new Set(['muscular']) }))).toBe(
      'translucent',
    );
    expect(variantFor('x', 'skeletal', state({ transparent: new Set(['x']) }))).toBe('translucent');
    expect(variantFor('x', 'skeletal', state({ translucentSystems: new Set(['muscular']) }))).toBe(
      'base',
    );
  });
  it('dimming outranks translucency, so the selection stays the clearest thing on screen', () => {
    const s = state({ selected: 'a', translucentSystems: new Set(['muscular']) });
    expect(variantFor('x', 'muscular', s)).toBe('ghost');
  });
});

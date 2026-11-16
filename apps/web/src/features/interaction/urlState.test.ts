import { describe, expect, it } from 'vitest';
import { BODY_SYSTEMS, BODY_ZONES } from '@atlas/shared';
import { useViewerStore } from '@/features/viewer/store';
import {
  parseView,
  serializeView,
  SYSTEM_CODES,
  viewChanged,
  withViewHash,
  type ViewCatalog,
  type ViewSnapshot,
} from './urlState';

const initial = useViewerStore.getInitialState();
const defaults: ViewSnapshot = {
  visibleSystems: initial.visibleSystems,
  translucentSystems: initial.translucentSystems,
  hiddenSubsystems: initial.hiddenSubsystems,
  zones: initial.zones,
  side: initial.side,
  selected: initial.selected,
  clipping: initial.clipping,
  dimOthers: initial.dimOthers,
};

const MESHES = new Set(['ta2-1360-r', 'ta2-1360-l', 'za-adductor-minimus-l']);
const SUBSYSTEMS = new Set(['muscular/fascia', 'muscular/bursae', 'skeletal/teeth']);
const catalog: ViewCatalog = {
  hasMesh: (id) => MESHES.has(id),
  hasSubsystem: (key) => SUBSYSTEMS.has(key),
};

const view = (patch: Partial<ViewSnapshot> = {}): ViewSnapshot => ({ ...defaults, ...patch });

describe('serializeView', () => {
  it('writes nothing for the default view', () => {
    expect(serializeView(defaults, defaults)).toBe('');
  });

  it('writes a compact, versioned, ordered hash', () => {
    const hash = serializeView(
      view({
        visibleSystems: new Set(['muscular', 'skeletal']),
        translucentSystems: new Set(['muscular']),
        hiddenSubsystems: new Set(['skeletal/teeth']),
        zones: new Set(['hand', 'forearm']),
        side: 'right',
        selected: 'ta2-1360-r',
        clipping: { enabled: true, axis: 'x', offset: 0.5, flip: true },
        dimOthers: false,
      }),
      defaults,
    );
    expect(hash).toBe(
      'v=1&s=sk,mu&t=mu&h=sk/teeth&u=mu/fascia&z=forearm,hand&side=r&m=ta2-1360-r&c=x500f&d=0',
    );
  });

  it('writes an empty system list when every layer is off', () => {
    expect(serializeView(view({ visibleSystems: new Set() }), defaults)).toBe('v=1&s=');
  });

  it('omits the cut while it is off, whatever its axis and offset', () => {
    const clipping = { enabled: false, axis: 'z' as const, offset: 0.2, flip: true };
    expect(serializeView(view({ clipping }), defaults)).toBe('');
  });

  it('has a code for every body system, all distinct', () => {
    const codes = BODY_SYSTEMS.map((s) => SYSTEM_CODES[s]);
    expect(new Set(codes).size).toBe(BODY_SYSTEMS.length);
  });
});

describe('parseView', () => {
  it('round-trips a full view', () => {
    const original = view({
      visibleSystems: new Set(['skeletal', 'cardiovascular', 'nervous']),
      translucentSystems: new Set(['skeletal']),
      hiddenSubsystems: new Set(['muscular/bursae']),
      zones: new Set(['thorax']),
      side: 'left',
      selected: 'ta2-1360-l',
      clipping: { enabled: true, axis: 'z', offset: 0.375, flip: false },
      dimOthers: false,
    });
    const hash = serializeView(original, defaults);
    const restored = parseView(`#${hash}`, defaults, catalog);
    expect(restored).toEqual(original);
    expect(serializeView(restored!, defaults)).toBe(hash);
  });

  it('round-trips every single system and every zone', () => {
    for (const system of BODY_SYSTEMS) {
      const v = view({ visibleSystems: new Set([system]) });
      // The default view (skeletal alone) has no hash, so the page simply keeps its defaults.
      expect(parseView(serializeView(v, defaults), defaults, catalog) ?? defaults).toEqual(v);
    }
    for (const zone of BODY_ZONES) {
      const v = view({ zones: new Set([zone]) });
      expect(parseView(serializeView(v, defaults), defaults, catalog)).toEqual(v);
    }
  });

  it('ignores empty, foreign, other-version and oversized hashes', () => {
    for (const hash of [
      '',
      '#',
      '#section-2',
      '#v=2&s=mu',
      '#s=mu',
      `#v=1&z=${'a'.repeat(5000)}`,
    ]) {
      expect(parseView(hash, defaults, catalog)).toBeNull();
    }
  });

  it('ignores a hash whose percent-encoding is broken', () => {
    expect(parseView('#v=1&s=%E0%A4%A', defaults, catalog)).toBeNull();
  });

  it('accepts percent-encoded separators (links pasted through chat apps)', () => {
    expect(parseView('#v=1&s=sk%2Cmu', defaults, catalog)?.visibleSystems).toEqual(
      new Set(['skeletal', 'muscular']),
    );
  });

  it('drops a field with a bad value and keeps the rest', () => {
    const v = parseView('#v=1&s=sk,xx&z=thorax&side=up&c=w500&d=maybe', defaults, catalog)!;
    expect(v.visibleSystems).toEqual(defaults.visibleSystems);
    expect(v.zones).toEqual(new Set(['thorax']));
    expect(v.side).toBe('both');
    expect(v.clipping).toEqual(defaults.clipping);
    expect(v.dimOthers).toBe(true);
  });

  it('rejects cut offsets out of range and malformed subsystem tokens', () => {
    expect(parseView('#v=1&c=x1001', defaults, catalog)!.clipping.enabled).toBe(false);
    expect(parseView('#v=1&c=x-5', defaults, catalog)!.clipping.enabled).toBe(false);
    expect(parseView('#v=1&c=y1000', defaults, catalog)!.clipping).toEqual({
      enabled: true,
      axis: 'y',
      offset: 1,
      flip: false,
    });
    const bad = parseView('#v=1&h=mu/Bursae,sk/teeth&u=mu/fascia/x', defaults, catalog)!;
    expect(bad.hiddenSubsystems).toEqual(defaults.hiddenSubsystems);
  });

  it('drops a selection the catalog does not have or that is not a meshId', () => {
    expect(parseView('#v=1&m=ta2-9999-r', defaults, catalog)!.selected).toBeNull();
    expect(parseView('#v=1&m=<script>', defaults, catalog)!.selected).toBeNull();
    expect(parseView('#v=1&m=za-adductor-minimus-l', defaults, catalog)!.selected).toBe(
      'za-adductor-minimus-l',
    );
  });

  it('drops unknown subsystems one by one but keeps known ones', () => {
    const v = parseView('#v=1&h=sk/teeth,sk/no-such-group', defaults, catalog)!;
    expect(v.hiddenSubsystems).toEqual(new Set(['muscular/fascia', 'skeletal/teeth']));
  });

  it('keeps translucency only on visible systems', () => {
    const v = parseView('#v=1&s=sk&t=sk,mu', defaults, catalog)!;
    expect(v.translucentSystems).toEqual(new Set(['skeletal']));
  });

  it('lets the first occurrence of a field win and ignores unknown fields', () => {
    const v = parseView('#v=1&side=l&side=r&future=1', defaults, catalog)!;
    expect(v.side).toBe('left');
  });
});

describe('withViewHash', () => {
  it('sets the hash and keeps the embed flag', () => {
    expect(withViewHash('http://localhost:3202/?embed=1', 'v=1&s=mu')).toBe(
      'http://localhost:3202/?embed=1#v=1&s=mu',
    );
  });

  it('drops the ?mesh= entry link and a stale hash', () => {
    expect(withViewHash('http://x.test/?mesh=ta2-1360-r#v=1&s=sk', 'v=1&m=ta2-1360-r')).toBe(
      'http://x.test/#v=1&m=ta2-1360-r',
    );
    expect(withViewHash('http://x.test/?embed=1&mesh=ta2-1360-r#v=1&s=sk', '')).toBe(
      'http://x.test/?embed=1',
    );
  });
});

describe('viewChanged', () => {
  it('ignores fields the hash does not store', () => {
    const a = useViewerStore.getState();
    expect(viewChanged(a, { ...a, hovered: 'ta2-1360-r' } as typeof a)).toBe(false);
    expect(viewChanged(a, { ...a, side: 'left' })).toBe(true);
  });
});

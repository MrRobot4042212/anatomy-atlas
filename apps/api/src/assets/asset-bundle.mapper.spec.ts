import { toAssetBundle, toZones, type AssetBundleWithStructures } from './asset-bundle.mapper.js';

function bundle(partial: Partial<AssetBundleWithStructures> = {}): AssetBundleWithStructures {
  return {
    id: 'muscular-v1',
    system: 'muscular',
    url: '/models/muscular-v1.glb',
    sizeBytes: 100,
    meshCount: 2,
    hash: 'abc',
    zones: {},
    createdAt: new Date(0),
    structures: [
      { meshId: 'ta2-2479-r', subsystem: 'muscles' },
      { meshId: 'ta2-2540-r', subsystem: 'fascia' },
    ],
    ...partial,
  };
}

describe('toZones', () => {
  it('keeps BodyZone keys with string arrays, in BODY_ZONES order', () => {
    const zones = toZones({ forearm: ['ta2-2479-r'], head: ['ta2-520'], arm: ['ta2-2540-r'] });
    expect(zones).toEqual({ head: ['ta2-520'], arm: ['ta2-2540-r'], forearm: ['ta2-2479-r'] });
    expect(Object.keys(zones ?? {})).toEqual(['head', 'arm', 'forearm']);
  });

  it('drops unknown zones, non-array values and non-string ids', () => {
    expect(
      toZones({ 'upper-limb': ['a'], hand: 'ta2-1250-r', foot: [1, null, 'ta2-1468-l'], leg: [] }),
    ).toEqual({ foot: ['ta2-1468-l'] });
  });

  it('is null for the empty default and for values that are not an object', () => {
    expect(toZones({})).toBeNull();
    expect(toZones(null)).toBeNull();
    expect(toZones(['head'])).toBeNull();
    expect(toZones('head')).toBeNull();
  });
});

describe('toAssetBundle', () => {
  it('groups meshIds by subsystem and leaves zones out while the column is empty', () => {
    const b = toAssetBundle(bundle());
    expect(b.meshes).toEqual(['ta2-2479-r', 'ta2-2540-r']);
    expect(b.subsystems).toEqual({ muscles: ['ta2-2479-r'], fascia: ['ta2-2540-r'] });
    expect(b).not.toHaveProperty('zones');
  });

  it('returns the zones index when the bundle has one', () => {
    const b = toAssetBundle(bundle({ zones: { forearm: ['ta2-2479-r'], arm: ['ta2-2540-r'] } }));
    expect(b.zones).toEqual({ arm: ['ta2-2540-r'], forearm: ['ta2-2479-r'] });
  });

  it('files structures without a subsystem under "other" and skips rows without a mesh', () => {
    const b = toAssetBundle(
      bundle({
        structures: [
          { meshId: 'ta2-1', subsystem: null },
          { meshId: null, subsystem: 'muscles' },
        ],
      }),
    );
    expect(b.meshes).toEqual(['ta2-1']);
    expect(b.subsystems).toEqual({ other: ['ta2-1'] });
  });
});

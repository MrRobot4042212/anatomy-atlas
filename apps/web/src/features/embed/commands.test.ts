import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetBundle, BodySystem } from '@atlas/shared';
import { useViewerStore, type Bounds } from '@/features/viewer/store';
import {
  applyCommand,
  availableSystems,
  indexMeshes,
  type CommandContext,
  type ViewerCommand,
} from './commands';
import { resolveDeepLink } from './deepLink';
import { layersChangedEvent, readyEvent, selectedEvent } from './events';

const bundle = (id: string, system: BodySystem, meshes: string[]): AssetBundle => ({
  id,
  system,
  url: `/models/${id}.glb`,
  sizeBytes: 1,
  meshCount: meshes.length,
  meshes,
  subsystems: {},
  hash: id,
});

// Fixture: two bundles with a handful of real-shaped meshIds; no network, no GLB.
const BUNDLES = [
  bundle('skeletal', 'skeletal', ['ta2-1234-r', 'ta2-1234-l', 'ta2-1300']),
  bundle('cardiovascular', 'cardiovascular', ['ta2-4231-r']),
];
const FEMUR: Bounds = { min: [0.05, 0.45, -0.03], max: [0.12, 0.9, 0.04] };

const initial = useViewerStore.getState();

function context(boundsOf: CommandContext['boundsOf'] = async () => FEMUR): CommandContext {
  const index = indexMeshes(BUNDLES);
  const s = useViewerStore.getState();
  return {
    actions: {
      showSystem: s.showSystem,
      setVisibleSystems: s.setVisibleSystems,
      select: s.select,
      focus: s.focus,
      isolate: s.isolate,
      unhideAll: s.unhideAll,
      preset: s.preset,
    },
    getSelected: () => useViewerStore.getState().selected,
    systemOf: (meshId) => index.get(meshId),
    availableSystems: new Set(availableSystems(BUNDLES)),
    boundsOf,
  };
}

const run = (command: ViewerCommand, ctx = context()) => applyCommand(command, ctx);
const state = () => useViewerStore.getState();

beforeEach(() => {
  useViewerStore.setState(initial, true);
});

describe('applyCommand', () => {
  it('select turns the system on, selects and frames the structure', async () => {
    expect(state().visibleSystems.has('cardiovascular')).toBe(false);
    await expect(run({ type: 'select', meshId: 'ta2-4231-r', focus: true })).resolves.toBe(
      'applied',
    );
    expect(state().visibleSystems.has('cardiovascular')).toBe(true);
    expect(state().visibleSystems.has('skeletal')).toBe(true);
    expect(state().selected).toBe('ta2-4231-r');
    expect(state().cameraTarget).toEqual(FEMUR);
  });

  it('select with focus false leaves the camera alone and fetches nothing', async () => {
    const boundsOf = vi.fn(async () => FEMUR);
    await run({ type: 'select', meshId: 'ta2-1234-r', focus: false }, context(boundsOf));
    expect(state().selected).toBe('ta2-1234-r');
    expect(state().cameraTarget).toBeNull();
    expect(boundsOf).not.toHaveBeenCalled();
  });

  it('select null clears the selection', async () => {
    useViewerStore.setState({ selected: 'ta2-1234-r' });
    await run({ type: 'select', meshId: null, focus: true });
    expect(state().selected).toBeNull();
  });

  it('ignores a meshId the catalog does not serve and changes nothing', async () => {
    const before = state();
    await expect(run({ type: 'select', meshId: 'ta2-9999-r', focus: true })).resolves.toBe(
      'ignored',
    );
    await expect(run({ type: 'isolate', meshId: 'ta2-9999-r' })).resolves.toBe('ignored');
    expect(state()).toBe(before);
  });

  it('drops a focus that a newer selection superseded', async () => {
    let release: (b: Bounds) => void = () => {};
    const slow = () => new Promise<Bounds>((resolve) => (release = resolve));
    const pending = run({ type: 'select', meshId: 'ta2-1234-r', focus: true }, context(slow));
    await run({ type: 'select', meshId: 'ta2-1300', focus: false });
    release(FEMUR);
    await pending;
    expect(state().selected).toBe('ta2-1300');
    expect(state().cameraTarget).toBeNull();
  });

  it('keeps the selection when bounds cannot be fetched', async () => {
    const failing = async (): Promise<Bounds> => {
      throw new Error('API down');
    };
    await expect(
      run({ type: 'select', meshId: 'ta2-1234-r', focus: true }, context(failing)),
    ).resolves.toBe('applied');
    expect(state().selected).toBe('ta2-1234-r');
    expect(state().cameraTarget).toBeNull();
  });

  it('isolate selects, isolates and frames', async () => {
    await run({ type: 'isolate', meshId: 'ta2-4231-r' });
    expect(state().isolated).toBe('ta2-4231-r');
    expect(state().selected).toBe('ta2-4231-r');
    expect(state().visibleSystems.has('cardiovascular')).toBe(true);
    expect(state().cameraTarget).toEqual(FEMUR);
  });

  it('reset shows everything, clears the selection and returns to the anterior view', async () => {
    useViewerStore.setState({
      hidden: new Set(['ta2-1234-l']),
      transparent: new Set(['ta2-1300']),
      isolated: 'ta2-1234-r',
      selected: 'ta2-1234-r',
    });
    await run({ type: 'reset' });
    expect(state().hidden.size).toBe(0);
    expect(state().transparent.size).toBe(0);
    expect(state().isolated).toBeNull();
    expect(state().selected).toBeNull();
    expect(state().cameraPreset?.name).toBe('anterior');
  });

  it('set-layers sets exactly the requested systems that have a model', async () => {
    await run({ type: 'set-layers', systems: ['cardiovascular', 'nervous'] });
    expect([...state().visibleSystems]).toEqual(['cardiovascular']);
    await run({ type: 'set-layers', systems: [] });
    expect(state().visibleSystems.size).toBe(0);
  });
});

describe('catalog helpers', () => {
  it('lists available systems in canonical order', () => {
    expect(availableSystems([...BUNDLES].reverse())).toEqual(['skeletal', 'cardiovascular']);
  });

  it('validates a deep link against the served meshes', () => {
    const index = indexMeshes(BUNDLES);
    expect(resolveDeepLink('ta2-4231-r', index)).toBe('ta2-4231-r');
    expect(resolveDeepLink('ta2-4231-l', index)).toBeNull(); // right shape, not in the catalog
    expect(resolveDeepLink('<img src=x>', index)).toBeNull();
    expect(resolveDeepLink(undefined, index)).toBeNull();
  });
});

describe('outbound events', () => {
  it('carry the protocol envelope and canonical system order', () => {
    expect(
      readyEvent(['skeletal', 'cardiovascular'], new Set(['cardiovascular', 'skeletal'])),
    ).toEqual({
      protocol: 'wazo-anatomy',
      version: 1,
      type: 'ready',
      systems: ['skeletal', 'cardiovascular'],
      visibleSystems: ['skeletal', 'cardiovascular'],
    });
    expect(layersChangedEvent(new Set<BodySystem>(['nervous', 'muscular']))).toEqual({
      protocol: 'wazo-anatomy',
      version: 1,
      type: 'layers-changed',
      visibleSystems: ['muscular', 'nervous'],
    });
  });

  it('selected sends the three names, or nulls when cleared', () => {
    const names = { la: 'Femur', en: 'Femur', es: 'Fémur' };
    expect(selectedEvent('ta2-1234-r', { ...names, extra: 'x' } as typeof names)).toEqual({
      protocol: 'wazo-anatomy',
      version: 1,
      type: 'selected',
      meshId: 'ta2-1234-r',
      names,
    });
    expect(selectedEvent(null, names)).toMatchObject({ meshId: null, names: null });
    expect(selectedEvent('ta2-1234-r', null)).toMatchObject({ meshId: 'ta2-1234-r', names: null });
  });
});

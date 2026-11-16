import { BODY_SYSTEMS, type AssetBundle, type BodySystem } from '@atlas/shared';
import type { Bounds, ViewerState } from '@/features/viewer/store';
import type { HostCommand } from './protocol';

/** The public store actions a command may call; nothing else of the store is touched. */
export type ViewerActions = Pick<
  ViewerState,
  'showSystem' | 'setVisibleSystems' | 'select' | 'focus' | 'isolate' | 'unhideAll' | 'preset'
>;

export interface CommandContext {
  actions: ViewerActions;
  /** Current selection, read after async work so a superseded focus is dropped. */
  getSelected: () => string | null;
  /** The catalog lookup: which bundle (system) holds this mesh; undefined if none does. */
  systemOf: (meshId: string) => BodySystem | undefined;
  /** Systems that have a bundle and can be shown. */
  availableSystems: ReadonlySet<BodySystem>;
  /** Model-space bounds from the catalog (equal to world bounds, the model sits at the origin). */
  boundsOf: (meshId: string) => Promise<Bounds | null>;
}

/** Commands that change the viewer; `ping` is answered by the bridge itself. */
export type ViewerCommand = Exclude<HostCommand, { type: 'ping' }>;

export type CommandResult = 'applied' | 'ignored';

/** meshId -> system, from the bundles the catalog serves. The single source for "does it exist". */
export function indexMeshes(bundles: readonly AssetBundle[]): Map<string, BodySystem> {
  const index = new Map<string, BodySystem>();
  for (const bundle of bundles) {
    for (const meshId of bundle.meshes) index.set(meshId, bundle.system);
  }
  return index;
}

/** Systems with at least one bundle, in the canonical `BODY_SYSTEMS` order. */
export function availableSystems(bundles: readonly AssetBundle[]): BodySystem[] {
  const present = new Set(bundles.map((b) => b.system));
  return BODY_SYSTEMS.filter((s) => present.has(s));
}

/**
 * Maps a validated command onto store actions. Structures unknown to the catalog are ignored
 * (the host sees no `selected` event); the meshId is never used to invent anything.
 */
export async function applyCommand(
  command: ViewerCommand,
  ctx: CommandContext,
): Promise<CommandResult> {
  const { actions } = ctx;
  switch (command.type) {
    case 'select': {
      if (command.meshId === null) {
        actions.select(null);
        return 'applied';
      }
      if (!reveal(command.meshId, ctx)) return 'ignored';
      if (command.focus) await focusOn(command.meshId, ctx);
      return 'applied';
    }
    case 'isolate': {
      if (!reveal(command.meshId, ctx)) return 'ignored';
      actions.isolate(command.meshId);
      await focusOn(command.meshId, ctx);
      return 'applied';
    }
    case 'reset': {
      actions.unhideAll();
      actions.select(null);
      actions.preset('anterior');
      return 'applied';
    }
    case 'set-layers': {
      actions.setVisibleSystems(command.systems.filter((s) => ctx.availableSystems.has(s)));
      return 'applied';
    }
  }
}

/** Turns the structure's system on and selects it. False when the catalog does not know it. */
function reveal(meshId: string, ctx: CommandContext): boolean {
  const system = ctx.systemOf(meshId);
  if (!system) return false;
  ctx.actions.showSystem(system);
  ctx.actions.select(meshId);
  return true;
}

async function focusOn(meshId: string, ctx: CommandContext): Promise<void> {
  let bounds: Bounds | null;
  try {
    bounds = await ctx.boundsOf(meshId);
  } catch {
    return; // the selection stands; the camera just stays where it is
  }
  if (bounds && ctx.getSelected() === meshId) ctx.actions.focus(bounds);
}

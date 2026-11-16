import { BODY_SYSTEMS, type BodySystem, type StructureNames } from '@atlas/shared';

/**
 * The postMessage protocol between Wazo Anatomy (inside an iframe) and its host page
 * (ADR 0006, `docs/embedding.md`). Every message in either direction is a plain object with
 * `protocol`, `version` and `type`. Breaking changes bump `PROTOCOL_VERSION`; adding optional
 * fields or new message types does not. Unknown fields are ignored, never echoed.
 *
 * Validation is hand-written instead of a schema library: five small message shapes do not
 * justify shipping zod (about 13 kB gzipped, ~2 kB for zod/mini) to every viewer load, and
 * guards keep the exact rules visible and unit-tested next to the types.
 */
export const PROTOCOL = 'wazo-anatomy';
export const PROTOCOL_VERSION = 1;

/**
 * A structure key as the asset pipeline writes it into the GLB (ADR 0004), mirrored from
 * `MESH_ID` in `tools/asset-pipeline/src/optimize.ts`: `ta2-4231-r`, `za-adductor-minimus-l`.
 */
const MESH_ID = /^(ta2-\d+(-\d+)*|za-[a-z0-9-]+)(-[lr])?$/;
const MAX_MESH_ID_LENGTH = 128;

export function isMeshId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_MESH_ID_LENGTH && MESH_ID.test(value);
}

export function isBodySystem(value: unknown): value is BodySystem {
  return typeof value === 'string' && (BODY_SYSTEMS as readonly string[]).includes(value);
}

/** Commands the host may send. */
export type HostCommand =
  /** Asks for a fresh `ready` event (for hosts that attach their listener late). */
  | { type: 'ping' }
  /** Selects a structure (turning its system on) and, unless `focus` is false, frames it. `null` clears. */
  | { type: 'select'; meshId: string | null; focus: boolean }
  /** Selects, frames and isolates a structure: everything else is ghosted. */
  | { type: 'isolate'; meshId: string }
  /** Shows everything again: clears hidden, isolated and translucent structures and the selection. */
  | { type: 'reset' }
  /** Sets exactly which body systems are visible. */
  | { type: 'set-layers'; systems: BodySystem[] };

export type HostCommandType = HostCommand['type'];

/** Events Wazo Anatomy sends to the host. */
export type AtlasEvent =
  | {
      type: 'ready';
      /** Body systems that have a 3D model and can be shown. */
      systems: BodySystem[];
      visibleSystems: BodySystem[];
    }
  | { type: 'selected'; meshId: string | null; names: StructureNames | null }
  | { type: 'layers-changed'; visibleSystems: BodySystem[] };

export type Envelope<T> = T & { protocol: typeof PROTOCOL; version: typeof PROTOCOL_VERSION };

export function envelope<T extends AtlasEvent>(event: T): Envelope<T> {
  return { protocol: PROTOCOL, version: PROTOCOL_VERSION, ...event };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates an inbound `event.data` and returns the command it encodes, or `null` for anything
 * that is not a well-formed command of this protocol version. Callers drop `null` silently.
 */
export function parseHostCommand(data: unknown): HostCommand | null {
  if (!isRecord(data)) return null;
  if (data.protocol !== PROTOCOL || data.version !== PROTOCOL_VERSION) return null;

  switch (data.type) {
    case 'ping':
      return { type: 'ping' };
    case 'reset':
      return { type: 'reset' };
    case 'select': {
      const { meshId, focus } = data;
      if (meshId !== null && !isMeshId(meshId)) return null;
      if (focus !== undefined && typeof focus !== 'boolean') return null;
      return { type: 'select', meshId, focus: focus ?? true };
    }
    case 'isolate': {
      if (!isMeshId(data.meshId)) return null;
      return { type: 'isolate', meshId: data.meshId };
    }
    case 'set-layers': {
      const { systems } = data;
      if (!Array.isArray(systems) || systems.length > BODY_SYSTEMS.length) return null;
      if (!systems.every(isBodySystem)) return null;
      return { type: 'set-layers', systems: [...new Set(systems)] };
    }
    default:
      return null;
  }
}

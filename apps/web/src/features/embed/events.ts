import { BODY_SYSTEMS, type BodySystem, type StructureNames } from '@atlas/shared';
import { envelope, type AtlasEvent, type Envelope } from './protocol';

/** Systems in the canonical order, so hosts can compare lists without sorting. */
export function orderedSystems(systems: ReadonlySet<BodySystem>): BodySystem[] {
  return BODY_SYSTEMS.filter((s) => systems.has(s));
}

export function readyEvent(
  systems: readonly BodySystem[],
  visible: ReadonlySet<BodySystem>,
): Envelope<Extract<AtlasEvent, { type: 'ready' }>> {
  return envelope({
    type: 'ready',
    systems: [...systems],
    visibleSystems: orderedSystems(visible),
  });
}

export function selectedEvent(
  meshId: string | null,
  names: StructureNames | null,
): Envelope<Extract<AtlasEvent, { type: 'selected' }>> {
  return envelope({
    type: 'selected',
    meshId,
    names: meshId && names ? { la: names.la, en: names.en, es: names.es } : null,
  });
}

export function layersChangedEvent(
  visible: ReadonlySet<BodySystem>,
): Envelope<Extract<AtlasEvent, { type: 'layers-changed' }>> {
  return envelope({ type: 'layers-changed', visibleSystems: orderedSystems(visible) });
}

'use client';

import { EyeOff } from 'lucide-react';
import { focusStructure } from './focusStructure';
import { CUE_COPY, cueFor, type CueKind, type MeshFacts, type Sight } from './selectionSight';
import { useViewerStore } from './store';

/**
 * A quiet chip over the canvas when the selected structure cannot be seen: which reason, and
 * the one click that fixes it. Nothing shows while the selection is in view.
 */
export function SelectionCue({
  facts,
  sight,
}: {
  facts: ReadonlyMap<string, MeshFacts>;
  sight: { meshId: string | null; sight: Sight };
}) {
  const selected = useViewerStore((s) => s.selected);
  const visibleSystems = useViewerStore((s) => s.visibleSystems);
  const hiddenSubsystems = useViewerStore((s) => s.hiddenSubsystems);
  const zones = useViewerStore((s) => s.zones);
  const side = useViewerStore((s) => s.side);
  const dimOthers = useViewerStore((s) => s.dimOthers);

  const own = selected ? facts.get(selected) : undefined;
  const kind = cueFor(selected, own, { visibleSystems, hiddenSubsystems, zones, side }, sight);

  return (
    // The live region stays mounted so screen readers hear the chip when it appears.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4"
    >
      {kind && selected && own ? (
        <Chip key={kind} kind={kind} meshId={selected} facts={own} dimOthers={dimOthers} />
      ) : null}
    </div>
  );
}

function Chip({
  kind,
  meshId,
  facts,
  dimOthers,
}: {
  kind: CueKind;
  meshId: string;
  facts: MeshFacts;
  dimOthers: boolean;
}) {
  const copy = CUE_COPY[kind];
  // With the rest already dimmed, the stronger remedy for an occluded selection is isolating it.
  const action = kind === 'occluded' && dimOthers ? 'Aislar' : copy.action;

  const remedy = () => {
    const s = useViewerStore.getState();
    switch (kind) {
      case 'layer-hidden':
        s.showSystem(facts.system);
        break;
      case 'subsystem-hidden':
        if (facts.subsystem) s.toggleSubsystem(facts.subsystem);
        break;
      case 'zone-filtered':
        s.setZones([]);
        break;
      case 'side-filtered':
        s.setSide('both');
        break;
      case 'clipped':
        s.setClipping({ enabled: false });
        break;
      case 'out-of-view':
        focusStructure(meshId);
        break;
      case 'occluded':
        if (s.dimOthers) s.isolate(meshId);
        else s.toggleDimOthers();
        break;
    }
  };

  return (
    <div className="bar-surface label-settle pointer-events-auto flex items-center gap-3 rounded-md border border-hairline py-1 pr-1 pl-3 text-sm text-ink-strong">
      <EyeOff size={16} aria-hidden="true" className="shrink-0 text-ink-faint" />
      <span>{copy.message}</span>
      <button type="button" onClick={remedy} className="btn btn-sm btn-outline shrink-0">
        {action}
      </button>
    </div>
  );
}

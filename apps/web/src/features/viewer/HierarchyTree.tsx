'use client';

import { Component, Suspense, use, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { BodySystem, StructureTreeNode } from '@atlas/shared';
import { api } from '@/lib/api';
import { SYSTEM_LABELS } from './LayerPanel';
import { useViewerStore } from './store';

const treePromises = new Map<BodySystem, Promise<StructureTreeNode[]>>();
function treeFor(system: BodySystem): Promise<StructureTreeNode[]> {
  let p = treePromises.get(system);
  if (!p) {
    p = api.tree(system).catch((err: unknown) => {
      treePromises.delete(system);
      throw err;
    });
    treePromises.set(system, p);
  }
  return p;
}

const SIDE: Record<string, string> = { left: 'izq.', right: 'der.' };

// The tree depends on viewer state and on a client-side promise cache, so it is rendered on the
// client only; server rendering it produced hydration mismatches with no benefit.
const subscribeNoop = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

/** Hierarchy of every visible system: browse groups, select structures with geometry. */
export function HierarchyTree() {
  const visible = useViewerStore((s) => s.visibleSystems);
  const isClient = useIsClient();
  const systems = isClient ? [...visible] : [];

  return (
    <section aria-labelledby="tree-heading" className="flex min-h-0 flex-col">
      <h2
        id="tree-heading"
        className="px-4 pt-4 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint"
      >
        Jerarquía
      </h2>
      {!isClient ? (
        <p className="px-4 pb-4 text-xs text-ink-faint" aria-busy="true">
          Cargando jerarquía…
        </p>
      ) : systems.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-ink-muted">
          Activa una capa para recorrer su jerarquía.
        </p>
      ) : (
        <div className="flex flex-col gap-2 px-2 pb-4">
          {systems.map((system) => (
            <TreeBoundary key={system}>
              <Suspense fallback={<TreeSkeleton label={SYSTEM_LABELS[system]} />}>
                <SystemTree system={system} />
              </Suspense>
            </TreeBoundary>
          ))}
        </div>
      )}
    </section>
  );
}

function TreeSkeleton({ label }: { label: string }) {
  return (
    <div className="px-2 py-1 text-xs text-ink-faint" aria-busy="true">
      {label}: cargando jerarquía…
    </div>
  );
}

class TreeBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <p className="px-2 py-1 text-xs text-danger">
          La jerarquía no se pudo cargar: {this.state.error.message}
        </p>
      );
    }
    return this.props.children;
  }
}

function SystemTree({ system }: { system: BodySystem }) {
  const roots = use(treeFor(system));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(roots.map((r) => r.id)));
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ul role="tree" aria-label={SYSTEM_LABELS[system]} className="flex flex-col">
      {roots.map((node) => (
        <TreeRow key={node.id} node={node} depth={0} expanded={expanded} onToggle={toggle} />
      ))}
    </ul>
  );
}

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: StructureTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const selected = useViewerStore((s) => s.selected);
  const select = useViewerStore((s) => s.select);
  const focus = useViewerStore((s) => s.focus);
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = node.meshId !== null && node.meshId === selected;

  const activate = () => {
    if (node.meshId) {
      const meshId = node.meshId;
      select(meshId);
      void api
        .structure(meshId)
        .then((d) => focus(d.structure.bounds))
        .catch(() => undefined);
    } else if (hasChildren) {
      onToggle(node.id);
    }
  };

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isOpen : undefined} aria-selected={isSelected}>
      <div
        className={`flex items-center gap-1 rounded-xs pr-2 text-xs ${isSelected ? 'bg-accent-soft text-ink' : 'hover:bg-raised'}`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={isOpen ? 'Contraer' : 'Expandir'}
            onClick={() => onToggle(node.id)}
            className="shrink-0 rounded-xs p-0.5 text-ink-faint hover:text-ink"
          >
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="inline-block w-[17px] shrink-0" aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={activate}
          className={`flex min-w-0 flex-1 items-baseline gap-1.5 py-1 text-left ${node.meshId ? '' : 'text-ink-muted'}`}
        >
          <span className="truncate">{node.nameEs || node.name}</span>
          {node.laterality !== 'midline' ? (
            <span className="shrink-0 text-[10px] text-ink-faint">{SIDE[node.laterality]}</span>
          ) : null}
          {node.meshId ? (
            <span
              aria-label="con geometría"
              className={`ml-auto size-1.5 shrink-0 rounded-full ${isSelected ? 'bg-accent' : 'bg-hairline-strong'}`}
            />
          ) : null}
        </button>
      </div>
      {hasChildren && isOpen ? (
        <ul role="group">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

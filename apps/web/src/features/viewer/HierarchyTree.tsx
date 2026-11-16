'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { BODY_SYSTEMS, type BodySystem, type StructureTreeNode } from '@atlas/shared';
import { api } from '@/lib/api';
import { SYSTEM_LABELS } from './LayerPanel';
import { useViewerStore } from './store';
import { scrollTopToReveal, treeKeyAction, visibleRows, type TreeNavNode } from './treeNav';

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; roots: StructureTreeNode[] };

// One request per system for the whole session; a failed request is forgotten so a later mount
// retries it.
const loads = new Map<BodySystem, Load>();
const inflight = new Map<BodySystem, Promise<void>>();
function loadTree(system: BodySystem): Promise<void> {
  let p = inflight.get(system);
  if (!p) {
    loads.set(system, { status: 'loading' });
    p = api
      .tree(system)
      .then((roots) => void loads.set(system, { status: 'ready', roots }))
      .catch((err: unknown) => {
        loads.set(system, {
          status: 'error',
          message: err instanceof Error ? err.message : 'error desconocido',
        });
        inflight.delete(system);
      });
    inflight.set(system, p);
  }
  return p;
}

/** A row of the tree: a catalog node, or the placeholder of a system that is loading or failed. */
interface RailNode extends TreeNavNode {
  children: RailNode[];
  meshId: string | null;
  laterality: StructureTreeNode['laterality'];
  status?: string;
}

const SIDE: Record<string, string> = { left: 'Izq.', right: 'Der.' };
const SIDE_LONG: Record<string, string> = { left: 'lado izquierdo', right: 'lado derecho' };

function toRailNode(n: StructureTreeNode): RailNode {
  return {
    id: n.id,
    label: n.nameEs || n.name,
    meshId: n.meshId,
    laterality: n.laterality,
    children: n.children.map(toRailNode),
  };
}

/**
 * Hierarchy of every visible system as ONE tree widget (WAI-ARIA tree view): a single tab stop
 * with a roving tabindex, arrows to move, expand and collapse (`treeNav.ts`), Enter or Space to
 * select a structure with geometry or to open a group. Rendered flat (each row carries its level),
 * so the focus ring outlines one row and never a whole open branch.
 */
export function HierarchyTree() {
  const visible = useViewerStore((s) => s.visibleSystems);
  const selected = useViewerStore((s) => s.selected);
  const select = useViewerStore((s) => s.select);
  const focusCamera = useViewerStore((s) => s.focus);
  const systems = BODY_SYSTEMS.filter((s) => visible.has(s));
  const systemsKey = systems.join(',');

  const [, setVersion] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const opened = useRef(new Set<BodySystem>());
  const rowEls = useRef(new Map<string, HTMLLIElement>());

  // Fetch the trees of the visible systems; open each system's top level the first time it loads.
  useEffect(() => {
    let alive = true;
    for (const system of systemsKey.split(',').filter(Boolean) as BodySystem[]) {
      void loadTree(system).then(() => {
        if (!alive) return;
        const load = loads.get(system);
        if (load?.status === 'ready' && !opened.current.has(system)) {
          opened.current.add(system);
          setExpanded((prev) => new Set([...prev, ...load.roots.map((r) => r.id)]));
        }
        setVersion((v) => v + 1);
      });
    }
    return () => {
      alive = false;
    };
  }, [systemsKey]);

  const roots: RailNode[] = systems.flatMap((system): RailNode[] => {
    const load = loads.get(system) ?? { status: 'loading' };
    if (load.status === 'ready') return load.roots.map(toRailNode);
    return [
      {
        id: `system:${system}`,
        label: SYSTEM_LABELS[system],
        meshId: null,
        laterality: 'midline',
        children: [],
        status:
          load.status === 'loading' ? 'cargando jerarquía…' : `no se pudo cargar (${load.message})`,
      },
    ];
  });
  const rows = visibleRows(roots, expanded);
  const tabStop =
    focusId && rows.some((r) => r.node.id === focusId) ? focusId : (rows[0]?.node.id ?? null);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const activate = (node: RailNode) => {
    if (node.meshId) {
      const meshId = node.meshId;
      select(meshId);
      void api
        .structure(meshId)
        .then((d) => focusCamera(d.structure.bounds))
        .catch(() => undefined);
    } else if (node.children.length > 0) {
      toggle(node.id);
    }
  };

  /** Focus a row and scroll only the rail, never the page (no `scrollIntoView`). */
  const moveFocus = (id: string) => {
    setFocusId(id);
    const el = rowEls.current.get(id);
    if (!el) return;
    el.focus({ preventScroll: true });
    const container = el.closest<HTMLElement>('[data-scroll-container]');
    if (!container) return;
    const view = container.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const top = scrollTopToReveal(
      box.top - view.top + container.scrollTop,
      box.height,
      container.scrollTop,
      container.clientHeight,
    );
    if (top !== null) container.scrollTop = top;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !tabStop) return;
    const action = treeKeyAction(rows, expanded, tabStop, e.key);
    if (action.type === 'none') return;
    e.preventDefault();
    if (action.type === 'focus') moveFocus(action.id);
    else if (action.type === 'expand' || action.type === 'collapse') toggle(action.id);
    else {
      const row = rows.find((r) => r.node.id === action.id);
      if (row) activate(row.node as RailNode);
    }
  };

  // When a system is switched off its rows go and the tab stop falls back to the first row
  // (`tabStop`), so the tree never loses its single tab stop.

  if (systems.length === 0) {
    return (
      <p className="px-4 py-4 text-sm text-ink-muted">
        Activa un sistema en Capas para recorrer su jerarquía.
      </p>
    );
  }

  return (
    <section aria-labelledby="tree-heading" className="flex flex-col pb-4">
      <h2 id="tree-heading" className="sr-only">
        Jerarquía
      </h2>
      <ul
        role="tree"
        aria-labelledby="tree-heading"
        onKeyDown={onKeyDown}
        className="flex flex-col px-2 pt-2"
      >
        {rows.map(({ node: n, level, posInSet, setSize }) => {
          const node = n as RailNode;
          const hasChildren = node.children.length > 0;
          const isOpen = hasChildren && expanded.has(node.id);
          const isSelected = node.meshId !== null && node.meshId === selected;
          const side = SIDE[node.laterality];
          return (
            <li
              key={node.id}
              ref={(el) => {
                if (el) rowEls.current.set(node.id, el);
                else rowEls.current.delete(node.id);
              }}
              role="treeitem"
              aria-level={level}
              aria-posinset={posInSet}
              aria-setsize={setSize}
              aria-expanded={hasChildren ? isOpen : undefined}
              aria-selected={node.meshId ? isSelected : undefined}
              aria-label={
                side
                  ? `${node.label}, ${SIDE_LONG[node.laterality]}`
                  : node.status
                    ? `${node.label}: ${node.status}`
                    : undefined
              }
              aria-busy={node.status === 'cargando jerarquía…' || undefined}
              tabIndex={node.id === tabStop ? 0 : -1}
              onFocus={(e) => {
                if (e.target === e.currentTarget && focusId !== node.id) setFocusId(node.id);
              }}
              onClick={() => {
                moveFocus(node.id);
                activate(node);
              }}
              className={`flex min-h-10 cursor-pointer items-center rounded-xs pr-2 text-sm ${
                isSelected ? 'bg-accent-soft text-ink' : 'hover:bg-raised'
              } ${node.meshId || hasChildren ? '' : 'text-ink-muted'}`}
              style={{ paddingLeft: `${(level - 1) * 12}px` }}
            >
              {hasChildren ? (
                // Mouse only: the keyboard expands with the arrows, so this is not a tab stop.
                <span
                  aria-hidden="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveFocus(node.id);
                    toggle(node.id);
                  }}
                  className="flex size-10 shrink-0 items-center justify-center text-ink-faint hover:text-ink"
                >
                  <ChevronRight
                    size={16}
                    className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  />
                </span>
              ) : (
                <span className="w-10 shrink-0" aria-hidden="true" />
              )}
              <span
                className={`min-w-0 flex-1 truncate py-2 ${hasChildren && !node.meshId ? 'text-ink-muted' : ''}`}
                title={node.label}
              >
                {node.label}
                {node.status ? (
                  <span className="ml-1.5 text-xs text-ink-faint">{node.status}</span>
                ) : null}
              </span>
              {side ? (
                <span
                  aria-hidden="true"
                  className="ml-2 shrink-0 rounded-full border border-hairline-strong px-1.5 text-xs leading-5 text-ink-muted"
                >
                  {side}
                </span>
              ) : null}
              {node.meshId ? (
                <span
                  aria-hidden="true"
                  title="Con geometría"
                  className={`ml-2 size-1.5 shrink-0 rounded-full ${isSelected ? 'bg-scene-selected' : 'bg-hairline-strong'}`}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

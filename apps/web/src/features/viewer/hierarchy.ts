import type { BodySystem, StructureTreeNode } from '@atlas/shared';
import { api } from '@/lib/api';

// One promise per system: the tree of a system is the same for the whole session. The
// hierarchy tab of the left rail keeps its own cache today; both can share this one.
const treePromises = new Map<BodySystem, Promise<StructureTreeNode[]>>();

export function treeFor(system: BodySystem): Promise<StructureTreeNode[]> {
  let p = treePromises.get(system);
  if (!p) {
    p = api.tree(system).catch((err: unknown) => {
      treePromises.delete(system); // allow a retry
      throw err;
    });
    treePromises.set(system, p);
  }
  return p;
}

/** The API files structures without a parent under a synthetic root; it is not anatomy. */
export const isSyntheticNode = (node: StructureTreeNode) => node.id.endsWith(':unclassified');

/** Nodes from a root down to the node with this id (both included), or null if absent. */
export function pathTo(
  roots: readonly StructureTreeNode[],
  id: string,
): StructureTreeNode[] | null {
  for (const root of roots) {
    if (root.id === id) return [root];
    const below = pathTo(root.children, id);
    if (below) return [root, ...below];
  }
  return null;
}

export interface Family {
  /** The node itself, as the tree has it. */
  node: StructureTreeNode;
  /** Real ancestors, root first, direct parent last (the synthetic root left out). */
  ancestors: StructureTreeNode[];
  parent: StructureTreeNode | null;
  /** The parent's other children, in catalog order. */
  siblings: StructureTreeNode[];
  children: StructureTreeNode[];
}

/** Parent, siblings and children of a node, from the system tree. Null if the node is absent. */
export function familyOf(roots: readonly StructureTreeNode[], id: string): Family | null {
  const path = pathTo(roots, id);
  if (!path) return null;
  const node = path[path.length - 1];
  const ancestors = path.slice(0, -1).filter((n) => !isSyntheticNode(n));
  const parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;
  return {
    node,
    ancestors,
    parent,
    siblings: parent ? parent.children.filter((c) => c.id !== id) : [],
    children: node.children,
  };
}

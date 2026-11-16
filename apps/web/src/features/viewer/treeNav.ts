/**
 * Keyboard model of the hierarchy tree (WAI-ARIA tree view pattern), as pure functions so the
 * component only renders and applies the result. The tree is rendered flat: every visible row is a
 * treeitem with its level, and the focus moves over this list.
 */

export interface TreeNavNode {
  id: string;
  label: string;
  children: TreeNavNode[];
}

export interface VisibleRow<T extends TreeNavNode = TreeNavNode> {
  node: T;
  /** 1 for the roots, as `aria-level`. */
  level: number;
  parentId: string | null;
  /** 1-based position among its siblings and their count, as `aria-posinset` / `aria-setsize`. */
  posInSet: number;
  setSize: number;
}

/** The rows a reader sees: roots, and the children of every expanded row, depth first. */
export function visibleRows<T extends TreeNavNode>(
  roots: readonly T[],
  expanded: ReadonlySet<string>,
): VisibleRow<T>[] {
  const out: VisibleRow<T>[] = [];
  const walk = (nodes: readonly T[], level: number, parentId: string | null) => {
    nodes.forEach((node, i) => {
      out.push({ node, level, parentId, posInSet: i + 1, setSize: nodes.length });
      if (node.children.length > 0 && expanded.has(node.id)) {
        walk(node.children as T[], level + 1, node.id);
      }
    });
  };
  walk(roots, 1, null);
  return out;
}

export type TreeAction =
  | { type: 'focus'; id: string }
  | { type: 'expand'; id: string }
  | { type: 'collapse'; id: string }
  | { type: 'activate'; id: string }
  | { type: 'none' };

const NONE: TreeAction = { type: 'none' };

/**
 * What a key does on the focused row. Up and Down move; Right expands a closed row or enters an open
 * one; Left closes an open row or climbs to the parent; Home and End jump; Enter and Space activate.
 */
export function treeKeyAction(
  rows: readonly VisibleRow[],
  expanded: ReadonlySet<string>,
  focusedId: string,
  key: string,
): TreeAction {
  const index = rows.findIndex((r) => r.node.id === focusedId);
  if (index < 0) return rows.length ? { type: 'focus', id: rows[0].node.id } : NONE;
  const row = rows[index];
  const hasChildren = row.node.children.length > 0;
  const isOpen = hasChildren && expanded.has(row.node.id);

  switch (key) {
    case 'ArrowDown':
      return index < rows.length - 1 ? { type: 'focus', id: rows[index + 1].node.id } : NONE;
    case 'ArrowUp':
      return index > 0 ? { type: 'focus', id: rows[index - 1].node.id } : NONE;
    case 'ArrowRight':
      if (!hasChildren) return NONE;
      if (!isOpen) return { type: 'expand', id: row.node.id };
      return { type: 'focus', id: row.node.children[0].id };
    case 'ArrowLeft':
      if (isOpen) return { type: 'collapse', id: row.node.id };
      return row.parentId ? { type: 'focus', id: row.parentId } : NONE;
    case 'Home':
      return { type: 'focus', id: rows[0].node.id };
    case 'End':
      return { type: 'focus', id: rows[rows.length - 1].node.id };
    case 'Enter':
    case ' ':
      return { type: 'activate', id: row.node.id };
    // No typeahead on purpose: single letters are global viewer shortcuts (R reset, C cut,
    // A dim), and a tree that swallowed some of them only when a label matched would make
    // those keys unpredictable.
    default:
      return NONE;
  }
}

/**
 * Scroll offset that brings a row fully into a scroll container, or null when it already is.
 * Used instead of `scrollIntoView`, which also scrolls every scrollable ancestor (the page).
 */
export function scrollTopToReveal(
  rowTop: number,
  rowHeight: number,
  viewTop: number,
  viewHeight: number,
): number | null {
  if (rowTop < viewTop) return rowTop;
  if (rowTop + rowHeight > viewTop + viewHeight) return rowTop + rowHeight - viewHeight;
  return null;
}

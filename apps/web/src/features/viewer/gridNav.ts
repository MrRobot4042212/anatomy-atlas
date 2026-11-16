/**
 * Keyboard model of a layout grid (WAI-ARIA grid pattern): one tab stop for a whole panel of
 * controls, arrows move between them. Rows may have different numbers of cells (a system row has
 * a disclosure and three depth buttons, a subsystem row has one checkbox); moving vertically keeps
 * the column the reader was in, clamped to the row, and returns to it on rows wide enough.
 */

export interface GridPosition {
  row: number;
  col: number;
  /** Column to return to when a later row is wide enough again. */
  wantedCol: number;
}

/** Cell keys row by row. A key identifies one focusable control. */
export type GridMatrix = readonly (readonly string[])[];

export function positionOf(matrix: GridMatrix, key: string): GridPosition | null {
  for (let row = 0; row < matrix.length; row++) {
    const col = matrix[row].indexOf(key);
    if (col >= 0) return { row, col, wantedCol: col };
  }
  return null;
}

/**
 * New position after a key, or null when the key is not a grid key (let it through: Enter and
 * Space activate the focused button natively). Up and Down move between rows, Left and Right within
 * a row, Home and End to the ends of the row, Ctrl+Home and Ctrl+End to the first and last cell.
 */
export function gridKeyMove(
  matrix: GridMatrix,
  pos: GridPosition,
  key: string,
  ctrlKey = false,
): GridPosition | null {
  const rows = matrix.length;
  if (rows === 0) return null;
  const width = (row: number) => matrix[row].length;
  const vertical = (row: number): GridPosition => ({
    row,
    col: Math.min(pos.wantedCol, width(row) - 1),
    wantedCol: pos.wantedCol,
  });
  const horizontal = (col: number): GridPosition => ({ row: pos.row, col, wantedCol: col });

  switch (key) {
    case 'ArrowDown':
      return pos.row < rows - 1 ? vertical(pos.row + 1) : pos;
    case 'ArrowUp':
      return pos.row > 0 ? vertical(pos.row - 1) : pos;
    case 'ArrowRight':
      return pos.col < width(pos.row) - 1 ? horizontal(pos.col + 1) : pos;
    case 'ArrowLeft':
      return pos.col > 0 ? horizontal(pos.col - 1) : pos;
    case 'Home':
      return ctrlKey ? { row: 0, col: 0, wantedCol: 0 } : horizontal(0);
    case 'End':
      if (ctrlKey) {
        const last = rows - 1;
        return { row: last, col: width(last) - 1, wantedCol: width(last) - 1 };
      }
      return horizontal(width(pos.row) - 1);
    default:
      return null;
  }
}

export function keyAt(matrix: GridMatrix, pos: GridPosition): string | undefined {
  return matrix[pos.row]?.[pos.col];
}

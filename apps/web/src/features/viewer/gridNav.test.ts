import { describe, expect, it } from 'vitest';
import { gridKeyMove, keyAt, positionOf, type GridMatrix } from './gridNav';

// A system row (disclosure + three depth buttons), two subsystem rows, another system row.
const matrix: GridMatrix = [
  ['sk:name', 'sk:visible', 'sk:translucent', 'sk:hidden'],
  ['sk/axial'],
  ['sk/appendicular'],
  ['mu:name', 'mu:visible', 'mu:translucent', 'mu:hidden'],
];

const at = (key: string) => positionOf(matrix, key)!;
const move = (key: string, pressed: string, ctrl = false) => {
  const next = gridKeyMove(matrix, at(key), pressed, ctrl);
  return next ? keyAt(matrix, next) : null;
};

describe('gridKeyMove', () => {
  it('moves within a row and stops at its ends', () => {
    expect(move('sk:visible', 'ArrowRight')).toBe('sk:translucent');
    expect(move('sk:hidden', 'ArrowRight')).toBe('sk:hidden');
    expect(move('sk:name', 'ArrowLeft')).toBe('sk:name');
  });

  it('moves between rows, clamping the column to narrower rows', () => {
    expect(move('sk:translucent', 'ArrowDown')).toBe('sk/axial');
    expect(move('sk/appendicular', 'ArrowDown')).toBe('mu:name');
    expect(move('mu:name', 'ArrowUp')).toBe('sk/appendicular');
    expect(move('mu:hidden', 'ArrowDown')).toBe('mu:hidden');
  });

  it('returns to the wanted column after crossing narrower rows', () => {
    let pos = at('sk:translucent');
    for (let i = 0; i < 3; i++) pos = gridKeyMove(matrix, pos, 'ArrowDown')!;
    expect(keyAt(matrix, pos)).toBe('mu:translucent');
  });

  it('Home and End go to the ends of the row; with Ctrl, of the grid', () => {
    expect(move('sk:translucent', 'Home')).toBe('sk:name');
    expect(move('sk:name', 'End')).toBe('sk:hidden');
    expect(move('sk/axial', 'Home', true)).toBe('sk:name');
    expect(move('sk/axial', 'End', true)).toBe('mu:hidden');
  });

  it('lets other keys through', () => {
    expect(gridKeyMove(matrix, at('sk:visible'), 'Enter')).toBeNull();
    expect(gridKeyMove(matrix, at('sk:visible'), ' ')).toBeNull();
  });

  it('finds positions by key and nothing for unknown keys', () => {
    expect(positionOf(matrix, 'mu:visible')).toEqual({ row: 3, col: 1, wantedCol: 1 });
    expect(positionOf(matrix, 'nope')).toBeNull();
  });
});

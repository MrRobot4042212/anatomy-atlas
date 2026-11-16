import { describe, expect, it } from 'vitest';
import { nextToolbarIndex } from './roving';

describe('nextToolbarIndex', () => {
  it('moves with the arrows and wraps at both ends', () => {
    expect(nextToolbarIndex(0, 'ArrowRight', 9)).toBe(1);
    expect(nextToolbarIndex(8, 'ArrowRight', 9)).toBe(0);
    expect(nextToolbarIndex(0, 'ArrowLeft', 9)).toBe(8);
  });

  it('jumps to the ends with Home and End', () => {
    expect(nextToolbarIndex(4, 'Home', 9)).toBe(0);
    expect(nextToolbarIndex(4, 'End', 9)).toBe(8);
  });

  it('ignores other keys and empty toolbars, and recovers from a stale index', () => {
    expect(nextToolbarIndex(2, 'Tab', 9)).toBeNull();
    expect(nextToolbarIndex(2, 'ArrowDown', 9)).toBeNull();
    expect(nextToolbarIndex(0, 'ArrowRight', 0)).toBeNull();
    expect(nextToolbarIndex(-1, 'ArrowRight', 3)).toBe(1);
  });
});

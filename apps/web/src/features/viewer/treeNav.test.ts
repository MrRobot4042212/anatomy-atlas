import { describe, expect, it } from 'vitest';
import { scrollTopToReveal, treeKeyAction, visibleRows, type TreeNavNode } from './treeNav';

const n = (id: string, label: string, children: TreeNavNode[] = []): TreeNavNode => ({
  id,
  label,
  children,
});

// skeletal
//   axial
//     cranium
//     vertebral column
//   appendicular
//     femur
// muscular
const roots = [
  n('skeletal', 'Esquelético', [
    n('axial', 'Esqueleto axial', [n('cranium', 'Cráneo'), n('spine', 'Columna vertebral')]),
    n('appendicular', 'Esqueleto apendicular', [n('femur', 'Fémur')]),
  ]),
  n('muscular', 'Muscular'),
];

const ids = (expanded: string[]) => visibleRows(roots, new Set(expanded)).map((r) => r.node.id);

describe('visibleRows', () => {
  it('lists roots and the children of expanded rows, depth first', () => {
    expect(ids([])).toEqual(['skeletal', 'muscular']);
    expect(ids(['skeletal', 'axial'])).toEqual([
      'skeletal',
      'axial',
      'cranium',
      'spine',
      'appendicular',
      'muscular',
    ]);
  });

  it('does not show the children of an expanded row under a collapsed one', () => {
    expect(ids(['axial'])).toEqual(['skeletal', 'muscular']);
  });

  it('gives level, parent, position and set size for ARIA', () => {
    const rows = visibleRows(roots, new Set(['skeletal', 'axial']));
    expect(rows[3]).toMatchObject({ level: 3, parentId: 'axial', posInSet: 2, setSize: 2 });
    expect(rows[5]).toMatchObject({ level: 1, parentId: null, posInSet: 2, setSize: 2 });
  });
});

describe('treeKeyAction', () => {
  const open = new Set(['skeletal', 'axial']);
  const rows = visibleRows(roots, open);
  const act = (focused: string, key: string) => treeKeyAction(rows, open, focused, key);

  it('moves up and down over visible rows and stops at the ends', () => {
    expect(act('spine', 'ArrowDown')).toEqual({ type: 'focus', id: 'appendicular' });
    expect(act('appendicular', 'ArrowUp')).toEqual({ type: 'focus', id: 'spine' });
    expect(act('muscular', 'ArrowDown')).toEqual({ type: 'none' });
    expect(act('skeletal', 'ArrowUp')).toEqual({ type: 'none' });
  });

  it('Right expands a closed row, then enters it; does nothing on a leaf', () => {
    expect(act('appendicular', 'ArrowRight')).toEqual({ type: 'expand', id: 'appendicular' });
    expect(act('axial', 'ArrowRight')).toEqual({ type: 'focus', id: 'cranium' });
    expect(act('cranium', 'ArrowRight')).toEqual({ type: 'none' });
  });

  it('Left collapses an open row, otherwise climbs to the parent; nothing on a closed root', () => {
    expect(act('axial', 'ArrowLeft')).toEqual({ type: 'collapse', id: 'axial' });
    expect(act('cranium', 'ArrowLeft')).toEqual({ type: 'focus', id: 'axial' });
    expect(act('appendicular', 'ArrowLeft')).toEqual({ type: 'focus', id: 'skeletal' });
    expect(act('muscular', 'ArrowLeft')).toEqual({ type: 'none' });
  });

  it('Home and End jump to the first and last visible row', () => {
    expect(act('spine', 'Home')).toEqual({ type: 'focus', id: 'skeletal' });
    expect(act('spine', 'End')).toEqual({ type: 'focus', id: 'muscular' });
  });

  it('Enter and Space activate the focused row', () => {
    expect(act('cranium', 'Enter')).toEqual({ type: 'activate', id: 'cranium' });
    expect(act('cranium', ' ')).toEqual({ type: 'activate', id: 'cranium' });
  });

  it('leaves letters to the global shortcuts and Tab to the browser', () => {
    expect(act('cranium', 'r')).toEqual({ type: 'none' });
    expect(act('cranium', '/')).toEqual({ type: 'none' });
    expect(act('cranium', 'Tab')).toEqual({ type: 'none' });
  });

  it('recovers when the focused row is gone', () => {
    expect(act('gone', 'ArrowDown')).toEqual({ type: 'focus', id: 'skeletal' });
  });
});

describe('scrollTopToReveal', () => {
  it('scrolls up to a row above the view and down to a row below it', () => {
    expect(scrollTopToReveal(40, 40, 100, 300)).toBe(40);
    expect(scrollTopToReveal(400, 40, 100, 300)).toBe(140);
  });

  it('leaves the scroll alone when the row is already visible', () => {
    expect(scrollTopToReveal(120, 40, 100, 300)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import type { StructureTreeNode } from '@atlas/shared';
import { familyOf, pathTo } from './hierarchy';

const node = (
  id: string,
  children: StructureTreeNode[] = [],
  meshId: string | null = null,
): StructureTreeNode => ({
  id,
  termKey: `ta2:${id}`,
  meshId,
  name: id,
  nameEs: id,
  laterality: 'midline',
  children,
});

// skeleton > cranium > ear ossicles > (malleus l/r, incus, stapes); loose bones under the
// synthetic root the API adds.
const malleusL = node('malleus-l', [], 'ta2-881-l');
const malleusR = node('malleus-r', [], 'ta2-881-r');
const incus = node('incus', [], 'ta2-882');
const stapes = node('stapes', [], 'ta2-883');
const ossicles = node('ossicles', [malleusL, malleusR, incus, stapes]);
const cranium = node('cranium', [ossicles]);
const tree = [
  node('skeleton', [cranium]),
  node('skeletal:unclassified', [node('loose-a', [], 'za-a'), node('loose-b', [], 'za-b')]),
];

describe('pathTo', () => {
  it('walks from the root to the node, both included', () => {
    expect(pathTo(tree, 'incus')?.map((n) => n.id)).toEqual([
      'skeleton',
      'cranium',
      'ossicles',
      'incus',
    ]);
  });

  it('returns null for an id the tree does not hold', () => {
    expect(pathTo(tree, 'femur')).toBeNull();
  });
});

describe('familyOf', () => {
  it('gives the parent, the other children of the parent and the node children', () => {
    const f = familyOf(tree, 'malleus-r');
    expect(f?.parent?.id).toBe('ossicles');
    expect(f?.siblings.map((n) => n.id)).toEqual(['malleus-l', 'incus', 'stapes']);
    expect(f?.children).toEqual([]);
    expect(f?.ancestors.map((n) => n.id)).toEqual(['skeleton', 'cranium', 'ossicles']);
  });

  it('gives a group its children and a root no parent', () => {
    const f = familyOf(tree, 'skeleton');
    expect(f?.parent).toBeNull();
    expect(f?.siblings).toEqual([]);
    expect(f?.children.map((n) => n.id)).toEqual(['cranium']);
  });

  it('does not treat the synthetic unclassified root as anatomy', () => {
    const f = familyOf(tree, 'loose-a');
    expect(f?.parent).toBeNull();
    expect(f?.ancestors).toEqual([]);
    expect(f?.siblings).toEqual([]);
  });

  it('is null for a node outside the tree', () => {
    expect(familyOf(tree, 'femur')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import type { Structure } from '@atlas/shared';
import { groupResults } from './searchResults';

const BOX = { min: [0, 0, 0], max: [1, 1, 1] } as Structure['bounds'];

function s(
  id: string,
  termKey: string,
  laterality: Structure['laterality'],
  meshId: string | null,
  bounds: Structure['bounds'] = BOX,
): Structure {
  return {
    id,
    termKey,
    ta2Id: null,
    meshId,
    names: { la: id, en: id, es: id },
    system: 'nervous',
    subsystem: null,
    region: null,
    laterality,
    parentId: null,
    description: null,
    assetId: null,
    bounds,
  };
}

describe('groupResults', () => {
  it('puts both sides of a structure together, left first, in ranked order', () => {
    const groups = groupResults([
      s('nerve-r', 'ta2:6569', 'right', 'ta2-6569-r'),
      s('bursa-l', 'ta2:2600', 'left', 'ta2-2600-l'),
      s('nerve-l', 'ta2:6569', 'left', 'ta2-6569-l'),
      s('bursa-r', 'ta2:2600', 'right', 'ta2-2600-r'),
    ]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([
      ['nerve-l', 'nerve-r'],
      ['bursa-l', 'bursa-r'],
    ]);
  });

  it('drops the bilateral parent node when its sides are present', () => {
    const groups = groupResults([
      s('nerve-l', 'ta2:6569', 'left', 'ta2-6569-l'),
      s('nerve-r', 'ta2:6569', 'right', 'ta2-6569-r'),
      s('nerve', 'ta2:6569', 'midline', null),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.id)).toEqual(['nerve-l', 'nerve-r']);
  });

  it('keeps a group node framed by its descendants, and drops one without bounds', () => {
    const groups = groupResults([
      s('heart', 'ta2:3932', 'midline', null),
      s('empty-group', 'za:empty', 'midline', null, null),
      s('circumflex', 'ta2:4000', 'midline', 'ta2-4000'),
    ]);
    expect(groups.map((g) => g.items[0].id)).toEqual(['heart', 'circumflex']);
  });
});

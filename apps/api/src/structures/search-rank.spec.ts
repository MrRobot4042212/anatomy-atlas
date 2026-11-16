import {
  isAccessory,
  matchTier,
  MatchTier,
  normalizeQuery,
  rankStructures,
  type RankInput,
} from './search-rank.js';

// Fixtures copied from the real catalog (names already as Postgres `lower(unaccent())` returns them).
function r(
  nameEn: string,
  es: string,
  la: string,
  extra: Partial<RankInput> & { id?: string } = {},
): RankInput & { id: string } {
  return {
    id: extra.id ?? `${nameEn}/${extra.laterality ?? 'midline'}`,
    nameEn,
    en: nameEn.toLowerCase(),
    es,
    la,
    subsystem: null,
    meshId: 'mesh',
    laterality: 'midline',
    depth: 3,
    ...extra,
  };
}

const sciatic = [
  r(
    'Sciatic bursa of gluteus maximus muscle',
    'bolsa isquiatica del musculo gluteo mayor',
    'bursa ischiadica musculi glutei maximi',
    { subsystem: 'bursae', laterality: 'right', depth: 2 },
  ),
  r(
    'Sciatic bursa of obturator internus',
    'bolsa isquiatica del musculo obturador interno',
    'bursa ischiadica obturatoris interni',
    { subsystem: 'bursae', laterality: 'left', depth: 2 },
  ),
  r('Sciatic nerve', 'nervio ciatico', 'nervus ischiadicus', { meshId: null, depth: 5 }),
  r('Sciatic nerve', 'nervio ciatico', 'nervus ischiadicus', {
    subsystem: 'peripheral',
    laterality: 'right',
    depth: 6,
  }),
  r('Sciatic nerve', 'nervio ciatico', 'nervus ischiadicus', {
    subsystem: 'peripheral',
    laterality: 'left',
    depth: 6,
  }),
];

const kidney = [
  r(
    'Intrarenal arteries of left kidney',
    'arterias intrarrenales del rinon izquierdo',
    'arteriae intrarenales renis sinistri',
    { subsystem: 'arteries' },
  ),
  r(
    'Intrarenal veins of right kidney',
    'venas intrarrenales del rinon derecho',
    'venae intrarenales renis dextri',
    { subsystem: 'veins', depth: 2 },
  ),
  r('Kidney', 'rinon', 'ren', { laterality: 'right', depth: 2 }),
  r('Kidney', 'rinon', 'ren', { laterality: 'left', depth: 2 }),
];

const femur = [
  r('Ligament of head of femur', 'ligamento de la cabeza del femur', 'ligamentum capitis femoris', {
    subsystem: 'joints',
    laterality: 'left',
    depth: 5,
  }),
  r('Femur', 'femur', 'os femoris', { subsystem: 'bones-of-lower-limb', laterality: 'right' }),
  r('Femur', 'femur', 'os femoris', { subsystem: 'bones-of-lower-limb', laterality: 'left' }),
];

const heart = [
  r('Circumflex artery of heart', 'arteria circunfleja del corazon', 'arteria circumflexa cordis', {
    subsystem: 'heart',
  }),
  r('Arteries of heart', 'arterias del corazon', 'arteriae cardiacae', {
    meshId: null,
    subsystem: 'heart',
    depth: 2,
  }),
  r('Heart', 'corazon', 'cor', { meshId: null, subsystem: 'heart', depth: 1 }),
];

const names = (rows: RankInput[]) => rows.map((x) => `${x.nameEn}/${x.laterality}`);

describe('normalizeQuery', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeQuery('  nervio   ciatico ')).toBe('nervio ciatico');
    expect(normalizeQuery(undefined)).toBe('');
  });
});

describe('matchTier', () => {
  it('orders exact, prefix, word start, substring and scattered matches', () => {
    expect(matchTier('femur', 'femur')).toBe(MatchTier.Exact);
    expect(matchTier('sciatic nerve', 'sciatic')).toBe(MatchTier.Prefix);
    expect(matchTier('nervio ciatico', 'ciatico')).toBe(MatchTier.WordStart);
    expect(matchTier('intrarenal veins', 'renal')).toBe(MatchTier.Substring);
    expect(matchTier('nervus ischiadicus', 'ciatico')).toBe(MatchTier.Scattered);
  });

  it('never matches an empty name (structures without a Latin name)', () => {
    expect(matchTier('', 'kidney')).toBe(MatchTier.Scattered);
  });
});

describe('isAccessory', () => {
  it('flags bursae, tendon sheaths and fasciae by subsystem', () => {
    expect(isAccessory({ subsystem: 'bursae', en: 'x', la: 'x' })).toBe(true);
    expect(isAccessory({ subsystem: 'tendon-sheaths', en: 'x', la: 'x' })).toBe(true);
    expect(isAccessory({ subsystem: 'fascia', en: 'x', la: 'x' })).toBe(true);
  });

  it('flags vessel and nerve branches by their head noun, in English or Latin', () => {
    expect(
      isAccessory({
        subsystem: 'arteries',
        en: 'deep branch of transverse cervical artery',
        la: '',
      }),
    ).toBe(true);
    expect(
      isAccessory({
        subsystem: 'heart',
        en: 'right inferolateral branch of right coronary artery',
        la: '(ramus inferolateralis dexter arteriae coronariae dextrae)',
      }),
    ).toBe(true);
    expect(isAccessory({ subsystem: 'peripheral', en: 'x', la: 'rami musculares' })).toBe(true);
  });

  it('does not flag main structures, nor muscles named after a fascia', () => {
    expect(
      isAccessory({ subsystem: 'peripheral', en: 'sciatic nerve', la: 'nervus ischiadicus' }),
    ).toBe(false);
    expect(isAccessory({ subsystem: null, en: 'kidney', la: 'ren' })).toBe(false);
    expect(
      isAccessory({
        subsystem: 'muscular-system-of-lower-limb',
        en: 'tensor fasciae latae',
        la: 'tensor fasciae latae',
      }),
    ).toBe(false);
  });
});

describe('rankStructures', () => {
  it('puts the sciatic nerve before the sciatic bursae, both sides together', () => {
    expect(names(rankStructures(sciatic, 'sciatic'))).toEqual([
      'Sciatic nerve/left',
      'Sciatic nerve/right',
      'Sciatic nerve/midline',
      'Sciatic bursa of obturator internus/left',
      'Sciatic bursa of gluteus maximus muscle/right',
    ]);
  });

  it('finds the nerve first by its Spanish name', () => {
    const ranked = rankStructures(sciatic, 'ciatico');
    expect(names(ranked).slice(0, 2)).toEqual(['Sciatic nerve/left', 'Sciatic nerve/right']);
  });

  it('ranks the exact phrase of a multi-word query first', () => {
    expect(names(rankStructures(sciatic, 'nervio ciatico'))[0]).toBe('Sciatic nerve/left');
  });

  it('puts the kidney before the vessels named after it, in English and in Spanish', () => {
    for (const q of ['kidney', 'rinon']) {
      expect(names(rankStructures(kidney, q)).slice(0, 2)).toEqual(['Kidney/left', 'Kidney/right']);
    }
  });

  it('puts the femur before the ligament of its head', () => {
    expect(names(rankStructures(femur, 'femur'))).toEqual([
      'Femur/left',
      'Femur/right',
      'Ligament of head of femur/left',
    ]);
  });

  it('puts the heart group first even though it has no geometry of its own', () => {
    expect(names(rankStructures(heart, 'heart'))[0]).toBe('Heart/midline');
    expect(names(rankStructures(heart, 'corazon'))[0]).toBe('Heart/midline');
  });

  it('prefers geometry over a group at the same tier, then shorter names, then shallower', () => {
    const rows = [
      r('Ulnar nerve group', 'grupo nervio cubital', '', { meshId: null, depth: 1 }),
      r('Ulnar nerve long', 'nervio cubital largo', '', { depth: 1 }),
      r('Ulnar nerve', 'nervio cubital x', '', { depth: 4, id: 'deep' }),
      r('Ulnar nerve', 'nervio cubital x', '', { depth: 2, id: 'shallow' }),
    ];
    expect(rankStructures(rows, 'ulnar').map((x) => x.id)).toEqual([
      'shallow',
      'deep',
      'Ulnar nerve long/midline',
      'Ulnar nerve group/midline',
    ]);
  });

  it('does not mutate its input', () => {
    const copy = [...sciatic];
    rankStructures(sciatic, 'sciatic');
    expect(sciatic).toEqual(copy);
  });
});

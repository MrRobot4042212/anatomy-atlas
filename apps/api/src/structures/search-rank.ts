/**
 * Search ranking over the catalog. Pure: it receives the rows that already match the query (every
 * word in one of the three names, accent-insensitive, decided in SQL) with their names normalized by
 * Postgres (`lower(unaccent(...))`), so the comparison here sees exactly what the filter saw.
 *
 * Why rank in TypeScript and not in an ORDER BY: the catalog is bounded (3,269 rows with all eleven
 * systems bundled) and a query matches a few dozen rows; the broadest two-letter query matches about
 * 1,500. Ranking in memory keeps the rules testable without a database (CI has none) and costs a few
 * milliseconds, measured on the real catalog (see the service). If the catalog grows by an order of
 * magnitude, move the same keys into SQL and keep these tests as the contract.
 */

/** The fields the ranking reads. Names are lower-case and unaccented (Postgres `unaccent`). */
export interface RankInput {
  es: string;
  en: string;
  la: string;
  nameEn: string;
  subsystem: string | null;
  meshId: string | null;
  laterality: 'left' | 'right' | 'midline';
  /** Distance from the root of the hierarchy (0 for a root). */
  depth: number;
}

/** How the whole query meets a name, best first. */
export const MatchTier = {
  Exact: 0,
  Prefix: 1,
  WordStart: 2,
  Substring: 3,
  /** Every word matches somewhere, but not the query as one phrase. */
  Scattered: 4,
} as const;
export type MatchTier = (typeof MatchTier)[keyof typeof MatchTier];

/**
 * Accessory structures: they carry the name of a main structure ("Sciatic bursa of gluteus maximus",
 * "Deep branch of transverse cervical artery") and must never rank above it. Detected by subsystem
 * and by the head noun: Latin names put it first, English names put it anywhere.
 */
const ACCESSORY_SUBSYSTEMS = new Set(['bursae', 'tendon-sheaths', 'fascia']);
const ACCESSORY_EN_WORDS = new Set([
  'bursa',
  'bursae',
  'sheath',
  'sheaths',
  'fascia',
  'branch',
  'branches',
]);
const ACCESSORY_LA_HEADS = new Set([
  'bursa',
  'bursae',
  'vagina',
  'vaginae',
  'fascia',
  'ramus',
  'rami',
]);

const LATERALITY_ORDER = { left: 0, right: 1, midline: 2 } as const;

/** Trims and collapses whitespace; the phrase the tiers compare against. */
export function normalizeQuery(q: string | undefined): string {
  return (q ?? '').trim().split(/\s+/).filter(Boolean).join(' ');
}

export function matchTier(name: string, q: string): MatchTier {
  if (!name || !q) return MatchTier.Scattered;
  if (name === q) return MatchTier.Exact;
  if (name.startsWith(q)) return MatchTier.Prefix;
  if (` ${name}`.includes(` ${q}`)) return MatchTier.WordStart;
  if (name.includes(q)) return MatchTier.Substring;
  return MatchTier.Scattered;
}

export function isAccessory(row: Pick<RankInput, 'subsystem' | 'en' | 'la'>): boolean {
  if (row.subsystem && ACCESSORY_SUBSYSTEMS.has(row.subsystem)) return true;
  if (row.en.split(/[^a-z]+/).some((w) => ACCESSORY_EN_WORDS.has(w))) return true;
  const head = row.la.replace(/^\(/, '').split(' ')[0];
  return ACCESSORY_LA_HEADS.has(head);
}

/** The best of the three names: lowest tier, then the shortest name at that tier. */
function bestMatch(row: RankInput, q: string): { tier: MatchTier; length: number } {
  let best = { tier: MatchTier.Scattered as MatchTier, length: Number.MAX_SAFE_INTEGER };
  for (const name of [row.es, row.en, row.la]) {
    if (!name) continue;
    const tier = matchTier(name, q);
    if (tier < best.tier || (tier === best.tier && name.length < best.length)) {
      best = { tier, length: name.length };
    }
  }
  return best;
}

/**
 * Ranking keys, in order: exact, prefix, word-start and substring matches of the whole query on
 * any name; main structures before accessory ones; structures with geometry before group nodes;
 * shorter names; shallower in the hierarchy. Ties fall back to the English name and left, right,
 * midline, so the two sides of one structure always sit together.
 */
export function rankKey(row: RankInput, q: string): (number | string)[] {
  const { tier, length } = bestMatch(row, q);
  return [
    tier,
    isAccessory(row) ? 1 : 0,
    row.meshId ? 0 : 1,
    length,
    row.depth,
    row.nameEn,
    LATERALITY_ORDER[row.laterality],
  ];
}

function compareKeys(a: (number | string)[], b: (number | string)[]): number {
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    return String(x).localeCompare(String(y), 'en');
  }
  return 0;
}

/** Sorts a copy of `rows` by relevance to `q` (already lower-cased and unaccented). */
export function rankStructures<T extends RankInput>(rows: readonly T[], q: string): T[] {
  const keyed = rows.map((row) => ({ row, key: rankKey(row, q) }));
  keyed.sort((a, b) => compareKeys(a.key, b.key));
  return keyed.map((k) => k.row);
}

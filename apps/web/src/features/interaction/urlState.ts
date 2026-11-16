import { BODY_SYSTEMS, BODY_ZONES, type BodySystem, type BodyZone } from '@atlas/shared';
import { isMeshId } from '@/features/embed/protocol';
import type { ClippingAxis, ClippingState, SideFilter, ViewerState } from '@/features/viewer/store';

/**
 * The view in the URL hash, so reload and sharing restore what the student was looking at.
 *
 *   #v=1&s=sk,mu&t=mu&h=sk/teeth&u=mu/fascia&z=forearm,hand&side=r&m=ta2-1360-r&c=x500f&d=0
 *
 * - `v`    format version; anything but `1` makes the whole hash foreign and it is ignored.
 * - `s`    visible systems as two-letter codes (`s=` with nothing is "no system"); `t` the
 *          translucent ones among them.
 * - `h`    subsystems hidden on top of the default set; `u` default-hidden subsystems shown.
 *          Both as `<code>/<subsystem slug>`, so the hash stores the difference, not the set.
 * - `z`    zone filter; `side` `l` or `r`; `m` the selected meshId.
 * - `c`    the cut when it is on: axis, offset in thousandths, `f` when flipped.
 * - `d=0`  "Atenuar resto" off.
 *
 * Every field equal to its default is omitted, so the initial view has no hash at all. Unknown
 * fields are ignored (room to grow inside v1). A field that fails validation is dropped whole
 * and falls back to its default; ids that are well formed but unknown to the catalog (a mesh or
 * subsystem renamed by a later pipeline run) are dropped one by one.
 *
 * Not in the hash: the camera pose (the viewer owns it and exposes no pose to restore) and
 * per-structure hide, isolate and translucency, which are short-lived edits.
 */
export const VIEW_HASH_VERSION = '1';
const MAX_HASH_LENGTH = 4096;

export type ViewSnapshot = Pick<
  ViewerState,
  | 'visibleSystems'
  | 'translucentSystems'
  | 'hiddenSubsystems'
  | 'zones'
  | 'side'
  | 'selected'
  | 'clipping'
  | 'dimOthers'
>;

export const VIEW_FIELDS = [
  'visibleSystems',
  'translucentSystems',
  'hiddenSubsystems',
  'zones',
  'side',
  'selected',
  'clipping',
  'dimOthers',
] as const satisfies readonly (keyof ViewSnapshot)[];

/** What the catalog knows; the parser keeps only ids it can find here. */
export interface ViewCatalog {
  hasMesh: (meshId: string) => boolean;
  hasSubsystem: (key: string) => boolean;
}

export const SYSTEM_CODES: Record<BodySystem, string> = {
  skeletal: 'sk',
  muscular: 'mu',
  cardiovascular: 'cv',
  nervous: 'nv',
  lymphatic: 'ly',
  digestive: 'dg',
  respiratory: 'rs',
  urinary: 'ur',
  reproductive: 'rp',
  endocrine: 'en',
  integumentary: 'ig',
};
const SYSTEM_BY_CODE = new Map(
  Object.entries(SYSTEM_CODES).map(([system, code]) => [code, system as BodySystem]),
);
const SUBSYSTEM_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CUT = /^([xyz])(\d{1,4})(f?)$/;

const inOrder = <T extends string>(set: ReadonlySet<T>, order: readonly T[]) =>
  order.filter((x) => set.has(x));
const sameSet = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

function subsystemToken(key: string): string | null {
  const slash = key.indexOf('/');
  const code = SYSTEM_CODES[key.slice(0, slash) as BodySystem];
  return slash > 0 && code ? `${code}/${key.slice(slash + 1)}` : null;
}

function subsystemKeyOf(token: string): string | null {
  const [code, slug, ...rest] = token.split('/');
  const system = SYSTEM_BY_CODE.get(code);
  if (!system || rest.length > 0 || !slug || slug.length > 64 || !SUBSYSTEM_SLUG.test(slug)) {
    return null;
  }
  return `${system}/${slug}`;
}

/** The hash body (no `#`) for this view, or `''` when the view is the default one. */
export function serializeView(view: ViewSnapshot, defaults: ViewSnapshot): string {
  const fields: [string, string][] = [];
  if (!sameSet(view.visibleSystems, defaults.visibleSystems)) {
    fields.push([
      's',
      inOrder(view.visibleSystems, BODY_SYSTEMS)
        .map((s) => SYSTEM_CODES[s])
        .join(','),
    ]);
  }
  const translucent = inOrder(view.translucentSystems, BODY_SYSTEMS).filter((s) =>
    view.visibleSystems.has(s),
  );
  if (translucent.length > 0) fields.push(['t', translucent.map((s) => SYSTEM_CODES[s]).join(',')]);

  const tokens = (keys: string[]) =>
    keys
      .sort()
      .map(subsystemToken)
      .filter((t): t is string => t !== null && subsystemKeyOf(t) !== null);
  const extraHidden = tokens(
    [...view.hiddenSubsystems].filter((k) => !defaults.hiddenSubsystems.has(k)),
  );
  const shown = tokens([...defaults.hiddenSubsystems].filter((k) => !view.hiddenSubsystems.has(k)));
  if (extraHidden.length > 0) fields.push(['h', extraHidden.join(',')]);
  if (shown.length > 0) fields.push(['u', shown.join(',')]);

  const zones = inOrder(view.zones, BODY_ZONES);
  if (zones.length > 0) fields.push(['z', zones.join(',')]);
  if (view.side !== 'both') fields.push(['side', view.side === 'left' ? 'l' : 'r']);
  if (view.selected && isMeshId(view.selected)) fields.push(['m', view.selected]);
  if (view.clipping.enabled) {
    const permille = Math.round(Math.min(1, Math.max(0, view.clipping.offset)) * 1000);
    fields.push(['c', `${view.clipping.axis}${permille}${view.clipping.flip ? 'f' : ''}`]);
  }
  if (view.dimOthers !== defaults.dimOthers) fields.push(['d', view.dimOthers ? '1' : '0']);

  if (fields.length === 0) return '';
  return [['v', VIEW_HASH_VERSION], ...fields].map(([k, v]) => `${k}=${v}`).join('&');
}

/** Splits `a=1&b=2` into a map; first occurrence wins; values percent-decoded. Null if broken. */
function readFields(body: string): Map<string, string> | null {
  const fields = new Map<string, string>();
  for (const part of body.split('&')) {
    if (part === '') continue;
    const eq = part.indexOf('=');
    const key = eq === -1 ? part : part.slice(0, eq);
    let value: string;
    try {
      value = decodeURIComponent(eq === -1 ? '' : part.slice(eq + 1));
    } catch {
      return null;
    }
    if (!fields.has(key)) fields.set(key, value);
  }
  return fields;
}

function list(value: string): string[] {
  return value === '' ? [] : value.split(',');
}

function parseSystems(value: string): Set<BodySystem> | null {
  const systems = new Set<BodySystem>();
  for (const code of list(value)) {
    const system = SYSTEM_BY_CODE.get(code);
    if (!system) return null;
    systems.add(system);
  }
  return systems;
}

function parseSubsystems(value: string, catalog: ViewCatalog): string[] | null {
  const keys: string[] = [];
  for (const token of list(value)) {
    const key = subsystemKeyOf(token);
    if (!key) return null;
    if (catalog.hasSubsystem(key)) keys.push(key);
  }
  return keys;
}

function parseCut(value: string, base: ClippingState): ClippingState | null {
  const match = CUT.exec(value);
  if (!match) return null;
  const permille = Number(match[2]);
  if (permille > 1000) return null;
  return {
    ...base,
    enabled: true,
    axis: match[1] as ClippingAxis,
    offset: permille / 1000,
    flip: match[3] === 'f',
  };
}

/**
 * Reads a view from `location.hash` (with or without `#`). Returns `null` when the hash is
 * empty, too long, broken, or not a v1 view, so the page loads as if it were absent. Otherwise
 * returns a complete snapshot: defaults wherever the hash says nothing or says something invalid.
 */
export function parseView(
  hash: string,
  defaults: ViewSnapshot,
  catalog: ViewCatalog,
): ViewSnapshot | null {
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  if (body === '' || body.length > MAX_HASH_LENGTH) return null;
  const fields = readFields(body);
  if (!fields || fields.get('v') !== VIEW_HASH_VERSION) return null;

  const view: ViewSnapshot = {
    visibleSystems: new Set(defaults.visibleSystems),
    translucentSystems: new Set<BodySystem>(),
    hiddenSubsystems: new Set(defaults.hiddenSubsystems),
    zones: new Set<BodyZone>(),
    side: defaults.side,
    selected: null,
    clipping: { ...defaults.clipping },
    dimOthers: defaults.dimOthers,
  };

  const s = fields.get('s');
  if (s !== undefined) view.visibleSystems = parseSystems(s) ?? view.visibleSystems;

  const t = fields.get('t');
  if (t !== undefined) {
    const translucent = parseSystems(t);
    // Translucent is a depth of a visible layer; a hidden system cannot be translucent.
    if (translucent) {
      view.translucentSystems = new Set([...translucent].filter((x) => view.visibleSystems.has(x)));
    }
  }

  const h = fields.get('h');
  const u = fields.get('u');
  const extraHidden = h === undefined ? [] : (parseSubsystems(h, catalog) ?? []);
  const shown = u === undefined ? [] : (parseSubsystems(u, catalog) ?? []);
  for (const key of extraHidden) view.hiddenSubsystems.add(key);
  for (const key of shown) view.hiddenSubsystems.delete(key);

  const z = fields.get('z');
  if (z !== undefined) {
    const zones = list(z);
    if (zones.every((x): x is BodyZone => (BODY_ZONES as readonly string[]).includes(x))) {
      view.zones = new Set(zones);
    }
  }

  const side = fields.get('side');
  if (side === 'l' || side === 'r')
    view.side = (side === 'l' ? 'left' : 'right') satisfies SideFilter;

  const m = fields.get('m');
  if (m !== undefined && isMeshId(m) && catalog.hasMesh(m)) view.selected = m;

  const c = fields.get('c');
  if (c !== undefined) view.clipping = parseCut(c, defaults.clipping) ?? view.clipping;

  const d = fields.get('d');
  if (d === '0' || d === '1') view.dimOthers = d === '1';

  return view;
}

/**
 * The address to write: same path and query, the view in the hash (none when it is the
 * default). `?mesh=` goes: it is an entry link, and once the hash carries the selection a
 * leftover `mesh` would win over the student's later choice on reload. `embed` and anything
 * else in the query stay.
 */
export function withViewHash(href: string, viewHash: string): string {
  const url = new URL(href);
  url.searchParams.delete('mesh');
  url.hash = viewHash;
  // `URL` keeps a bare `#` when the hash is set to ''; drop it for a clean address.
  const out = url.toString();
  return out.endsWith('#') ? out.slice(0, -1) : out;
}

/** Whether any field the hash stores changed between two store states (reference equality). */
export function viewChanged(a: ViewSnapshot, b: ViewSnapshot): boolean {
  return VIEW_FIELDS.some((k) => a[k] !== b[k]);
}

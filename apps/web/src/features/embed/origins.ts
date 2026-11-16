/**
 * Embedding allowlist (ADR 0006). One environment variable, `EMBED_ALLOWED_ORIGINS`, drives both
 * the CSP `frame-ancestors` header (who may frame the page) and the postMessage bridge (whose
 * messages are accepted and where events are sent). Pure functions only: used by the proxy, the
 * page (server) and the bridge (client).
 */

export interface ParsedOrigins {
  /** Normalized, deduplicated origins (`https://campus.example.com`). */
  origins: string[];
  /** Entries that were dropped, verbatim, so the server can log them. */
  rejected: string[];
}

/**
 * Parses a comma-separated list of origins. An entry is kept only if it is an absolute http(s)
 * URL with nothing beyond scheme, host and port (a trailing slash is tolerated). Wildcards, the
 * opaque `null` origin, paths, queries, credentials and other schemes are rejected: framing and
 * messaging are granted to exact origins or not at all.
 */
export function parseAllowedOrigins(raw: string | undefined | null): ParsedOrigins {
  const origins: string[] = [];
  const rejected: string[] = [];
  if (!raw) return { origins, rejected };

  for (const entry of raw.split(',')) {
    const value = entry.trim();
    if (!value) continue;
    const origin = normalizeOrigin(value);
    if (origin === null) rejected.push(value);
    else if (!origins.includes(origin)) origins.push(origin);
  }
  return { origins, rejected };
}

function normalizeOrigin(value: string): string | null {
  if (value.includes('*')) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== '/' && url.pathname !== '') return null;
  // URL normalizes dot segments away (`https://a.com/..` has pathname '/'); refuse any spelled path.
  if (/^[a-z]+:\/\/[^/]+\/./i.test(value)) return null;
  return url.origin;
}

/** Exact match against the normalized allowlist. `event.origin` is already normalized. */
export function isAllowedOrigin(origin: string, allowlist: readonly string[]): boolean {
  if (!origin || origin === 'null') return false;
  return allowlist.includes(origin);
}

/**
 * The `Content-Security-Policy` value for framing. `'self'` is always present so the app can
 * frame itself; with no allowlist the page is same-origin only. Never a wildcard.
 */
export function frameAncestorsPolicy(allowlist: readonly string[]): string {
  return ['frame-ancestors', "'self'", ...allowlist].join(' ');
}

/**
 * Best guess of the framing page's origin before it has sent anything: Chromium and Safari
 * expose `location.ancestorOrigins`; elsewhere the referrer carries at least the origin under
 * the default `strict-origin-when-cross-origin` policy. Returned only when it is allowlisted;
 * otherwise the bridge waits for the host's first valid message and uses its `event.origin`.
 */
export function resolveHostOrigin(
  candidates: { ancestorOrigin?: string | null; referrer?: string | null },
  allowlist: readonly string[],
): string | null {
  const fromReferrer = (() => {
    if (!candidates.referrer) return null;
    try {
      return new URL(candidates.referrer).origin;
    } catch {
      return null;
    }
  })();
  for (const origin of [candidates.ancestorOrigin ?? null, fromReferrer]) {
    if (origin && isAllowedOrigin(origin, allowlist)) return origin;
  }
  return null;
}

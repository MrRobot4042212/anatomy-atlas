import { describe, expect, it } from 'vitest';
import {
  frameAncestorsPolicy,
  isAllowedOrigin,
  parseAllowedOrigins,
  resolveHostOrigin,
} from './origins';

describe('parseAllowedOrigins', () => {
  it('returns nothing for a missing or blank variable', () => {
    expect(parseAllowedOrigins(undefined)).toEqual({ origins: [], rejected: [] });
    expect(parseAllowedOrigins('')).toEqual({ origins: [], rejected: [] });
    expect(parseAllowedOrigins(' , ,')).toEqual({ origins: [], rejected: [] });
  });

  it('normalizes, trims and deduplicates exact origins', () => {
    const { origins, rejected } = parseAllowedOrigins(
      ' https://campuswazo.com , https://CampusWazo.com/, https://staging.campuswazo.com:8443,http://localhost:4000',
    );
    expect(origins).toEqual([
      'https://campuswazo.com',
      'https://staging.campuswazo.com:8443',
      'http://localhost:4000',
    ]);
    expect(rejected).toEqual([]);
  });

  it('drops the default port like browsers do in event.origin', () => {
    expect(parseAllowedOrigins('https://campuswazo.com:443').origins).toEqual([
      'https://campuswazo.com',
    ]);
  });

  it.each([
    '*',
    'https://*.campuswazo.com',
    'campuswazo.com',
    'null',
    'ftp://campuswazo.com',
    'javascript:alert(1)',
    'https://campuswazo.com/course/1',
    'https://campuswazo.com/..',
    'https://campuswazo.com?x=1',
    'https://campuswazo.com#top',
    'https://user:pass@campuswazo.com',
  ])('rejects %s', (entry) => {
    const { origins, rejected } = parseAllowedOrigins(`${entry},https://ok.example`);
    expect(origins).toEqual(['https://ok.example']);
    expect(rejected).toEqual([entry]);
  });
});

describe('isAllowedOrigin', () => {
  const allowlist = ['https://campuswazo.com'];

  it('accepts an exact match only', () => {
    expect(isAllowedOrigin('https://campuswazo.com', allowlist)).toBe(true);
    expect(isAllowedOrigin('http://campuswazo.com', allowlist)).toBe(false);
    expect(isAllowedOrigin('https://campuswazo.com.evil.example', allowlist)).toBe(false);
    expect(isAllowedOrigin('https://evil.campuswazo.com', allowlist)).toBe(false);
    expect(isAllowedOrigin('https://campuswazo.com:8443', allowlist)).toBe(false);
  });

  it('never accepts the opaque or empty origin', () => {
    expect(isAllowedOrigin('null', ['null'])).toBe(false);
    expect(isAllowedOrigin('', [''])).toBe(false);
  });

  it('accepts nothing with an empty allowlist', () => {
    expect(isAllowedOrigin('https://campuswazo.com', [])).toBe(false);
  });
});

describe('frameAncestorsPolicy', () => {
  it('is same-origin only by default', () => {
    expect(frameAncestorsPolicy([])).toBe("frame-ancestors 'self'");
  });

  it('lists the allowed origins after self, never a wildcard', () => {
    const policy = frameAncestorsPolicy(
      parseAllowedOrigins('https://campuswazo.com,*,https://*.x.com').origins,
    );
    expect(policy).toBe("frame-ancestors 'self' https://campuswazo.com");
    expect(policy).not.toContain('*');
  });
});

describe('resolveHostOrigin', () => {
  const allowlist = ['https://campuswazo.com'];

  it('prefers ancestorOrigins, then the referrer origin', () => {
    expect(resolveHostOrigin({ ancestorOrigin: 'https://campuswazo.com' }, allowlist)).toBe(
      'https://campuswazo.com',
    );
    expect(
      resolveHostOrigin({ referrer: 'https://campuswazo.com/curso/anatomia?leccion=3' }, allowlist),
    ).toBe('https://campuswazo.com');
  });

  it('returns null when the framing page is not allowlisted or unknown', () => {
    expect(resolveHostOrigin({ ancestorOrigin: 'https://evil.example' }, allowlist)).toBeNull();
    expect(resolveHostOrigin({ referrer: 'not a url' }, allowlist)).toBeNull();
    expect(resolveHostOrigin({ ancestorOrigin: null, referrer: '' }, allowlist)).toBeNull();
  });

  it('skips a disallowed ancestor and falls back to an allowed referrer', () => {
    expect(
      resolveHostOrigin(
        { ancestorOrigin: 'https://evil.example', referrer: 'https://campuswazo.com/' },
        allowlist,
      ),
    ).toBe('https://campuswazo.com');
  });
});

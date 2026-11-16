import { NextResponse } from 'next/server';
import { frameAncestorsPolicy, parseAllowedOrigins } from '@/features/embed/origins';

// Read once per server process: the proxy runs on the Node.js runtime (Next 16 default), so this
// is the deployment's runtime environment, not a value frozen at build time (`headers()` in
// next.config is evaluated at build). One image can then serve staging and production hosts.
const allowed = parseAllowedOrigins(process.env.EMBED_ALLOWED_ORIGINS);
if (allowed.rejected.length > 0) {
  console.warn(
    `EMBED_ALLOWED_ORIGINS: ignored ${allowed.rejected.map((r) => JSON.stringify(r)).join(', ')}; ` +
      'entries must be exact http(s) origins without wildcards or paths.',
  );
}
const framing = frameAncestorsPolicy(allowed.origins);

/**
 * Framing policy (ADR 0006): only the origins in `EMBED_ALLOWED_ORIGINS` may put the atlas in
 * an iframe; with none configured, same-origin only. Applies to every page so a navigation
 * inside the frame (for example to `/licencias`) keeps the same policy.
 */
export function proxy() {
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', framing);
  // Legacy browsers without CSP Level 2 only understand X-Frame-Options, which cannot express
  // an allowlist; send it only when the answer is "same origin" anyway.
  if (allowed.origins.length === 0) response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return response;
}

export const config = {
  // Documents only: static chunks, optimized images and public assets are not framed.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|brand/|models/).*)'],
};

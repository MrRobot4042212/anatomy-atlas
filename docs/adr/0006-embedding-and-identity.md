# ADR 0006: Embedding in Campus WAZO, and identity

Date: 2026-11-16
Status: accepted (embedding); proposed (identity, not implemented)

## Context

Wazo Anatomy ships inside WAZO's learning platform, campuswazo.com, as an iframe. Campus owns
users, courses and billing; the atlas must not duplicate any of them. A lesson page needs to
point the atlas at a structure ("look at the right femur"), restrict layers, and hear what the
student selects. What Campus is built on (Moodle, Canvas, Open edX or custom) is not known yet.

## Decision

### 1. Framing policy

`src/proxy.ts` sets `Content-Security-Policy: frame-ancestors 'self' <origins>` on every page,
with the origins from `EMBED_ALLOWED_ORIGINS` (comma-separated). Entries must be exact http(s)
origins; wildcards, `null`, paths, queries and credentials are rejected and logged at startup.
Unset or empty means same-origin only, and `X-Frame-Options: SAMEORIGIN` is added for browsers
without CSP 2. With an allowlist, `X-Frame-Options` is omitted because it cannot express one.

Proxy, not `headers()` in `next.config.ts`: `headers()` is evaluated at build, which would freeze
the allowlist into the image. The proxy runs on the Node.js runtime and reads the variable from
the deployment environment, so one build serves staging and production. The cost is one proxy
call per document request (string set only, no I/O). The page is rendered at request time
already (`force-dynamic`), so the bridge reads the same variable at runtime too.

This is a framing policy, not a full CSP. A `script-src` policy with nonces is separate
hardening work. It needs every inline script audited, and someone has to check the three.js
workers and decoders still load.

### 2. Embed mode

`/?embed=1` pins the layout to the frame (`fixed inset-0`, no page scroll; rails scroll on
their own), turns the header brand into a non-link so the frame cannot wander to `/`, and mounts
the bridge. Everything else is the standalone surface, including the credits footer and its
`/licencias` link, which the licences require on screen. `?mesh=<meshId>` selects and frames a
structure on load in both modes. It is validated against the meshes the catalog serves, and an
unknown id is ignored.

### 3. postMessage protocol v1

Every message is `{ protocol: 'wazo-anatomy', version: 1, type, ...fields }`.

- Host to atlas: `ping`, `select { meshId | null, focus? }`, `isolate { meshId }`, `reset`,
  `set-layers { systems }`.
- Atlas to host: `ready { systems, visibleSystems }`, `selected { meshId, names }`,
  `layers-changed { visibleSystems }`.

Structures are addressed only by `meshId` (ADR 0004). A meshId that is well-formed but not in
the catalog is ignored. The host knows a command worked when the matching event arrives.
Adding optional fields or message types keeps `version: 1`. Renaming or removing anything bumps
it, and the atlas then drops messages of the other version. Full reference: `docs/embedding.md`.

### 4. Security model

An inbound message becomes a command only when all of these hold (`features/embed/gate.ts`):

1. the atlas is framed and `event.source === window.parent`, which rules out other frames,
   popups and the atlas itself;
2. `event.origin` exactly matches an allowlisted origin (same variable as the framing policy);
3. `event.data` passes the hand-written guards in `protocol.ts`: known protocol and version, a
   known command, a meshId matching the pipeline's `MESH_ID` shape, systems from `BODY_SYSTEMS`.

Anything else is dropped without a reply, so probing reveals nothing. Outbound messages always
name one target origin, never `"*"`. That origin is the allowlisted origin from
`location.ancestorOrigins` or the referrer. When neither gives it, the atlas waits for the
host's first valid message, uses its `event.origin` and answers with `ready`. The bridge calls
public store actions only. Commands cannot navigate, run code or inject markup: payload strings
are never rendered, and names in events come from the catalog.

Hand-written guards instead of zod: five small shapes do not justify ~13 kB gzipped (~2 kB for
zod/mini) on every viewer load. The guards are 60 lines and are unit-tested case by case.

Residual risk: whatever runs on an allowlisted origin can drive the view. That is acceptable,
because the bridge exposes only public catalog data and view state. A nested frame (Campus
framing an LMS frame that frames the atlas) needs the direct parent allowlisted. Every ancestor
must also pass `frame-ancestors`.

### 5. Identity (recommendation, not built)

- **If Campus WAZO runs on Moodle, Canvas, Open edX, Brightspace or Blackboard:** integrate as an
  **LTI 1.3 tool** (with LTI Advantage). The platform signs an OIDC `id_token` per launch
  carrying user, course context and role. The API verifies it against the platform JWKS, keeps
  `state` and `nonce`, and registers one client id per platform. Deep Linking lets teachers
  place a structure (`meshId`) in a lesson. Assignment and Grade Services post quiz scores to
  the gradebook later. It is the standard those platforms already speak, so Campus writes no
  integration code. Cost: the OIDC launch flow, platform registration and key rotation in the
  NestJS API. The launch session also must not rely on third-party cookies: Safari and Chrome
  block them in iframes. Use the LTI platform-storage postMessage spec or an in-memory token.
- **If Campus is a custom platform:** Campus mints a **short-lived signed JWT** (ES256, at most
  5 minutes). Claims: `iss` campus, `aud` wazo-anatomy, a pseudonymous stable `sub`, course
  context, role, `exp`, `iat`, `jti`. Campus hands it to the iframe over this bridge as a new
  `auth` command, never in the URL, where it would leak into logs, history and referrers. The
  API verifies it against Campus's JWKS, rejects replayed `jti`s, and exchanges it for its own
  short session token kept in memory, not in a cookie. No names or emails are needed.

Either way the atlas stores a pseudonymous id, never Campus credentials. The choice waits for a
single fact: what Campus is built on.

## Not built, and why

- **Identity.** The right protocol depends on the host platform, which is unknown. Building the
  wrong one means a hard-to-reverse API surface and key management. The bridge is anonymous by
  design.
- **Progress persistence.** It needs identity first, and the product has not decided on accounts
  or progress yet (`PRODUCT.md`, roadmap phase 5). Until then, Campus can record progress on its
  side from the `selected` events.
- **A full script CSP.** See section 1.

## Follow-ups

- In embed mode, `/licencias` opens inside the frame and its "Volver al atlas" link returns to
  standalone mode without the bridge. Opening it in a new tab needs a small change to
  `Credits.tsx`, a licensing file that this work did not touch. It needs the owner's approval.
- An `error` event (for example `unknown-mesh`), if Campus finds the silent ignore hard to
  debug. It is additive, so the version stays 1.

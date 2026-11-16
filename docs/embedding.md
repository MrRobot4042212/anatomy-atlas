# Embedding Wazo Anatomy

This guide is for the Campus WAZO developers. The design and security reasoning is in
[ADR 0006](adr/0006-embedding-and-identity.md). The examples use `https://anatomy.example.com`
for the atlas and `https://campuswazo.com` for Campus; replace both with the real hosts.

## 1. Allow your origin

The atlas refuses to be framed by any origin it has not been told about. Set this on the atlas
deployment (or in `apps/web/.env.local` for development). It is read at runtime, so a restart
is enough and no rebuild is needed:

```bash
EMBED_ALLOWED_ORIGINS=https://campuswazo.com,https://staging.campuswazo.com
```

Rules: exact origins only (scheme, host, optional port), comma-separated. Wildcards and paths
are rejected and logged when the server starts. Unset means same-origin only. The same list
decides which origins may send commands.

## 2. Add the iframe

```html
<iframe
  id="wazo-anatomy"
  src="https://anatomy.example.com/?embed=1&mesh=ta2-1360-r"
  title="Wazo Anatomy: atlas 3D"
  style="width: 100%; height: 640px; border: 0"
></iframe>
```

- `embed=1` switches to the embedded layout: it fills the frame, has no page scroll, and keeps
  the attribution footer, which is a licence requirement. Do not cover or crop it.
- `mesh=<meshId>` (optional) selects and frames that structure on load. Unknown ids are ignored.
  It also works without `embed=1`, for plain links.
- Do not add `sandbox`. If you must, include `allow-scripts allow-same-origin`, otherwise the
  atlas cannot reach its catalog API.
- Keep the default referrer policy. With `referrerpolicy="no-referrer"` the atlas cannot know
  your origin until you send a first message, so send a `ping` (below).
- Give the frame at least 640 px of height. Below 1024 px of width the panels stack under the
  model and scroll inside the frame.

## 3. Talk to it

Every message, in both directions, is a plain object:

```js
{ protocol: 'wazo-anatomy', version: 1, type: '<type>', ...fields }
```

The atlas accepts messages only from the page that directly frames it, at an allowlisted
origin, with a valid payload. Anything else is dropped silently, with no error reply. Always
pass the atlas origin as `targetOrigin`, never `'*'`.

```js
const ATLAS = 'https://anatomy.example.com';
const frame = document.getElementById('wazo-anatomy');

function send(type, fields = {}) {
  frame.contentWindow.postMessage({ protocol: 'wazo-anatomy', version: 1, type, ...fields }, ATLAS);
}

window.addEventListener('message', (event) => {
  if (event.origin !== ATLAS || event.source !== frame.contentWindow) return;
  const msg = event.data;
  if (msg?.protocol !== 'wazo-anatomy' || msg.version !== 1) return;
  switch (msg.type) {
    case 'ready':
      /* safe to send commands now */ break;
    case 'selected':
      /* msg.meshId, msg.names */ break;
    case 'layers-changed':
      /* msg.visibleSystems */ break;
  }
});

// Attach the listener first, then ping: if `ready` already fired, this asks for it again.
send('ping');
```

Structures are identified only by `meshId`: the Terminologia Anatomica 2 id plus side, for
example `ta2-1360-r` for the right femur. Get ids from the catalog API
(`GET /api/structures?q=femur`) or from `selected` events. Never build them by hand from names.

Body systems: `skeletal`, `muscular`, `cardiovascular`, `nervous`, `lymphatic`, `digestive`,
`respiratory`, `urinary`, `reproductive`, `endocrine`, `integumentary`. Only those listed in
`ready.systems` have a model.

### Commands (Campus to atlas)

| `type`       | Fields                                   | Effect                                                                                                                            |
| ------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ping`       | none                                     | Replies with `ready`.                                                                                                             |
| `select`     | `meshId: string \| null`, `focus?: bool` | Turns the structure's system on, selects it and frames it (`focus` defaults to `true`). `null` clears.                            |
| `isolate`    | `meshId: string`                         | Selects and frames the structure and ghosts everything else.                                                                      |
| `reset`      | none                                     | Shows everything again (hidden, isolated, translucent), clears the selection, returns to the front view. Layers stay as they are. |
| `set-layers` | `systems: string[]`                      | Shows exactly these systems. Systems without a model are skipped. `[]` hides all.                                                 |

```js
send('select', { meshId: 'ta2-1360-r' });
// { protocol: 'wazo-anatomy', version: 1, type: 'select', meshId: 'ta2-1360-r' }

send('select', { meshId: 'ta2-1360-r', focus: false }); // select without moving the camera
send('select', { meshId: null }); // clear the selection

send('isolate', { meshId: 'ta2-1360-l' });
// { protocol: 'wazo-anatomy', version: 1, type: 'isolate', meshId: 'ta2-1360-l' }

send('reset');
// { protocol: 'wazo-anatomy', version: 1, type: 'reset' }

send('set-layers', { systems: ['skeletal', 'cardiovascular'] });
// { protocol: 'wazo-anatomy', version: 1, type: 'set-layers', systems: ['skeletal', 'cardiovascular'] }
```

A command that names a meshId the catalog does not have is ignored. Success is visible in the
events that follow: `selected` after `select` and `isolate`, `layers-changed` after
`set-layers` or any command that turns on a system.

### Events (atlas to Campus)

**`ready`**: the bridge is listening. It is sent on load when the atlas can tell your origin,
otherwise in reply to your first valid message, and again after every `ping`. It may arrive more
than once; treat it as idempotent.

```js
{
  protocol: 'wazo-anatomy', version: 1, type: 'ready',
  systems: ['skeletal', 'muscular', 'cardiovascular', 'nervous', 'lymphatic', 'digestive',
            'respiratory', 'urinary', 'reproductive', 'endocrine', 'integumentary'],
  visibleSystems: ['skeletal']
}
```

**`selected`**: the selection changed, whether the student clicked or Campus sent a command.
`names` are Latin, English and Spanish from the catalog. They are `null` when the selection is
cleared, or when the catalog could not be reached (the `meshId` is still accurate then).

```js
{
  protocol: 'wazo-anatomy', version: 1, type: 'selected',
  meshId: 'ta2-1360-r',
  names: { la: 'Os femoris', en: 'Femur', es: 'Fémur' }
}
{ protocol: 'wazo-anatomy', version: 1, type: 'selected', meshId: null, names: null }
```

**`layers-changed`**: the visible systems changed, by the student or by `set-layers`.
Systems are listed in the canonical order above.

```js
{ protocol: 'wazo-anatomy', version: 1, type: 'layers-changed', visibleSystems: ['skeletal', 'cardiovascular'] }
```

## Try it

`docs/examples/embed-host.html` is a complete host page that frames the atlas and runs every
command in turn, printing each message it sends and receives. Serve it from an origin you put
in `EMBED_ALLOWED_ORIGINS` (for local work, `python -m http.server 8099` in that folder with
`EMBED_ALLOWED_ORIGINS=http://localhost:8099` on the atlas), and change `ATLAS` and the iframe
`src` if the atlas is not on `http://localhost:3000`. From any other origin the browser refuses
to show the frame, which is the expected result. Links in the attribution footer open in a new
tab when embedded, so following one never replaces the atlas and drops the bridge.

## Versioning

`version` is the protocol major version. New optional fields and new message types keep
`version: 1`, so ignore what you do not recognize. A breaking change bumps the version; the
atlas then ignores messages with the other version.

## Not included

There is no login, user identity or progress storage in the atlas. The iframe is anonymous.
To track progress today, record `selected` events on the Campus side. Identity options (LTI 1.3,
or a short-lived JWT minted by Campus) are in ADR 0006.

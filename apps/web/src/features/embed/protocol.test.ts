import { describe, expect, it } from 'vitest';
import { acceptMessage } from './gate';
import { isMeshId, parseHostCommand, PROTOCOL, PROTOCOL_VERSION } from './protocol';

const msg = (body: Record<string, unknown>) => ({
  protocol: PROTOCOL,
  version: PROTOCOL_VERSION,
  ...body,
});

describe('isMeshId', () => {
  it.each(['ta2-4231-r', 'ta2-4231-l', 'ta2-1234', 'ta2-12-3-l', 'za-adductor-minimus-l'])(
    'accepts %s',
    (id) => expect(isMeshId(id)).toBe(true),
  );

  it.each([
    'ta2:4231',
    'TA2-4231-r',
    'ta2-4231-x',
    'femur',
    '',
    'za-',
    'ta2-1<script>',
    `za-${'a'.repeat(200)}`,
    42,
    null,
  ])('rejects %s', (id) => expect(isMeshId(id)).toBe(false));
});

describe('parseHostCommand', () => {
  it('parses every command of the protocol', () => {
    expect(parseHostCommand(msg({ type: 'ping' }))).toEqual({ type: 'ping' });
    expect(parseHostCommand(msg({ type: 'reset' }))).toEqual({ type: 'reset' });
    expect(parseHostCommand(msg({ type: 'select', meshId: 'ta2-4231-r' }))).toEqual({
      type: 'select',
      meshId: 'ta2-4231-r',
      focus: true,
    });
    expect(parseHostCommand(msg({ type: 'select', meshId: 'ta2-4231-r', focus: false }))).toEqual({
      type: 'select',
      meshId: 'ta2-4231-r',
      focus: false,
    });
    expect(parseHostCommand(msg({ type: 'select', meshId: null }))).toEqual({
      type: 'select',
      meshId: null,
      focus: true,
    });
    expect(parseHostCommand(msg({ type: 'isolate', meshId: 'za-adductor-minimus-l' }))).toEqual({
      type: 'isolate',
      meshId: 'za-adductor-minimus-l',
    });
    expect(
      parseHostCommand(
        msg({ type: 'set-layers', systems: ['skeletal', 'cardiovascular', 'skeletal'] }),
      ),
    ).toEqual({ type: 'set-layers', systems: ['skeletal', 'cardiovascular'] });
    expect(parseHostCommand(msg({ type: 'set-layers', systems: [] }))).toEqual({
      type: 'set-layers',
      systems: [],
    });
  });

  it('drops unknown fields instead of passing them through', () => {
    expect(parseHostCommand(msg({ type: 'reset', extra: { evil: true } }))).toEqual({
      type: 'reset',
    });
  });

  it.each<[string, unknown]>([
    ['a string', 'select ta2-4231-r'],
    ['null', null],
    ['an array', [PROTOCOL, PROTOCOL_VERSION, 'reset']],
    ['another protocol', { protocol: 'other', version: 1, type: 'reset' }],
    ['a missing version', { protocol: PROTOCOL, type: 'reset' }],
    ['a future version', { protocol: PROTOCOL, version: 2, type: 'reset' }],
    ['a version as string', { protocol: PROTOCOL, version: '1', type: 'reset' }],
    ['an unknown type', msg({ type: 'navigate', url: 'https://evil.example' })],
    ['an outbound event type', msg({ type: 'ready', systems: [] })],
    ['select without meshId', msg({ type: 'select' })],
    ['select with a malformed meshId', msg({ type: 'select', meshId: 'Femur' })],
    ['select with a non-boolean focus', msg({ type: 'select', meshId: 'ta2-1', focus: 'yes' })],
    ['isolate with null', msg({ type: 'isolate', meshId: null })],
    ['set-layers with an unknown system', msg({ type: 'set-layers', systems: ['skeletal', 'x'] })],
    ['set-layers with a non-array', msg({ type: 'set-layers', systems: 'skeletal' })],
    [
      'set-layers with too many entries',
      msg({ type: 'set-layers', systems: Array(50).fill('skeletal') }),
    ],
  ])('rejects %s', (_label, data) => {
    expect(parseHostCommand(data)).toBeNull();
  });
});

describe('acceptMessage', () => {
  const parent = { name: 'parent window' };
  const allowlist = ['https://campuswazo.com'];
  const data = msg({ type: 'reset' });

  it('accepts a valid command from the parent at an allowed origin', () => {
    expect(
      acceptMessage({ origin: 'https://campuswazo.com', source: parent, data }, parent, allowlist),
    ).toEqual({ type: 'reset' });
  });

  it('rejects a message from any window other than the parent', () => {
    expect(
      acceptMessage(
        { origin: 'https://campuswazo.com', source: { name: 'popup' }, data },
        parent,
        allowlist,
      ),
    ).toBeNull();
    expect(
      acceptMessage({ origin: 'https://campuswazo.com', source: null, data }, parent, allowlist),
    ).toBeNull();
  });

  it('rejects everything when not framed (no expected source)', () => {
    expect(
      acceptMessage({ origin: 'https://campuswazo.com', source: null, data }, null, allowlist),
    ).toBeNull();
  });

  it('rejects the parent when its origin is not allowlisted', () => {
    expect(
      acceptMessage({ origin: 'https://evil.example', source: parent, data }, parent, allowlist),
    ).toBeNull();
    expect(acceptMessage({ origin: 'null', source: parent, data }, parent, allowlist)).toBeNull();
  });

  it('rejects an invalid payload from a trusted parent', () => {
    expect(
      acceptMessage(
        { origin: 'https://campuswazo.com', source: parent, data: { type: 'reset' } },
        parent,
        allowlist,
      ),
    ).toBeNull();
  });
});

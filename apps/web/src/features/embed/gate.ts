import { isAllowedOrigin } from './origins';
import { parseHostCommand, type HostCommand } from './protocol';

/** The parts of a `MessageEvent` the gate looks at. */
export interface InboundMessage {
  origin: string;
  source: unknown;
  data: unknown;
}

/**
 * The only way a message becomes a command: it must come from the window that frames us
 * (`expectedSource` is `window.parent`, and only when we are actually framed), from an
 * allowlisted origin, and carry a valid payload. Everything else returns `null` and is dropped
 * without a reply, so probing the bridge reveals nothing.
 */
export function acceptMessage(
  message: InboundMessage,
  expectedSource: unknown,
  allowlist: readonly string[],
): HostCommand | null {
  if (expectedSource === null || expectedSource === undefined) return null;
  if (message.source !== expectedSource) return null;
  if (!isAllowedOrigin(message.origin, allowlist)) return null;
  return parseHostCommand(message.data);
}

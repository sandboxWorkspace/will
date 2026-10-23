/**
 * Remote clicker — command validation (pure, node-testable).
 *
 * Shared by the optional host/clicker modules. The remote can only pause,
 * resume, and end the drill; nothing here touches the core drill.
 */

const ACTIONS = new Set(['pause', 'resume', 'end']);

export function isKnownAction(action) {
  return typeof action === 'string' && ACTIONS.has(action);
}

export function makeCommand(action) {
  if (!isKnownAction(action)) throw new Error('Unknown remote action');
  const id = globalThis.crypto && globalThis.crypto.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, action, at: Date.now() };
}

export function isFreshCommand(cmd, now = Date.now(), maxAgeMs = 10000) {
  if (!cmd || typeof cmd !== 'object') return false;
  if (typeof cmd.id !== 'string' || !cmd.id) return false;
  if (!isKnownAction(cmd.action)) return false;
  if (typeof cmd.at !== 'number' || !Number.isFinite(cmd.at)) return false;
  return now - cmd.at <= maxAgeMs && cmd.at - now <= 60000;
}

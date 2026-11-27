// The rules of the automatic sign-out (REQ-3.5, D-85), kept apart so they can be tested
// (tools/test-signout.mjs).

export const MINUTE = 60_000
export const IDLE_MS = 30 * MINUTE
export const MAX_MS = 8 * 60 * MINUTE
export const WARN_MS = 2 * MINUTE

// What decides the sign-out, as pure rules.
export function signOutState(now: number, lastActivity: number, since: number, l: { idle: number; max: number }) {
  if (now - since >= l.max) return { out: 'max' as const, warnLeft: null }
  const idle = now - lastActivity
  if (idle >= l.idle) return { out: 'idle' as const, warnLeft: null }
  if (idle >= l.idle - WARN_MS) return { out: null, warnLeft: l.idle - idle }
  return { out: null, warnLeft: null }
}


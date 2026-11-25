// Is the student working on the lesson right now? (REQ-5.33, D-73, D-76)
// Pure rules, also tested by functions/presence.test.js.
//
// The student is away when the Evolora tab isn't in front (another tab or app, or the browser
// minimised, or the computer closed), or after 2 minutes without mouse, keyboard or touch.
// A video or audio playing in the lesson counts as working.

export const IDLE_MS = 2 * 60 * 1000
// Ticks are about a second apart; a longer gap (the computer was asleep) never counts as working.
export const MAX_TICK_MS = 5000

export interface PresenceInput {
  now: number
  visible: boolean
  focused: boolean
  lastInput: number
  mediaPlaying: boolean
}

export interface PresenceState {
  present: boolean
  lastTick: number
  netMs: number
  away: number
}

export function isPresent(i: PresenceInput): boolean {
  return i.visible && i.focused && (i.mediaPlaying || i.now - i.lastInput < IDLE_MS)
}

export function startPresence(i: PresenceInput): PresenceState {
  return { present: isPresent(i), lastTick: i.now, netMs: 0, away: 0 }
}

// One step: working time grows only while the student stays present; every change from
// present to away counts one time away, however short.
export function stepPresence(s: PresenceState, i: PresenceInput): PresenceState {
  const present = isPresent(i)
  const dt = Math.max(0, Math.min(i.now - s.lastTick, MAX_TICK_MS))
  return {
    present,
    lastTick: i.now,
    netMs: s.netMs + (s.present && present ? dt : 0),
    away: s.away + (s.present && !present ? 1 : 0),
  }
}

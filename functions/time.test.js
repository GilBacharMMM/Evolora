// Time on lessons and time away (REQ-5.33, D-73, D-76). Run: npm test (in this folder)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyTimeReport, awayALot, awayLimit, timeSummary, validReport } from './time.js'
import { IDLE_MS, startPresence, stepPresence } from '../web/src/presence.ts'

const MIN = 60 * 1000

// Runs the browser's presence rules second by second.
function run(seconds, at, state, inputFor) {
  let s = state
  for (let i = 1; i <= seconds; i++) s = stepPresence(s, inputFor(at + i * 1000))
  return s
}
const working = (now) => ({ now, visible: true, focused: true, lastInput: now, mediaPlaying: false })

test('presence: working time grows while the student works', () => {
  const s = run(300, 0, startPresence(working(0)), working)
  assert.equal(s.netMs, 300000)
  assert.equal(s.away, 0)
})

test('presence: every switch to another tab counts once, however short', () => {
  let s = startPresence(working(0))
  let t = 0
  for (let k = 0; k < 3; k++) {
    s = run(30, t, s, working)
    t += 30000
    s = run(3, t, s, (now) => ({ ...working(now), visible: false }))
    t += 3000
  }
  assert.equal(s.away, 3)
  assert.ok(Math.abs(s.netMs - 90000) <= 3000, String(s.netMs))
})

test('presence: 3 minutes without touching anything is one time away, and about 2 minutes of work', () => {
  const s = run(180, 0, startPresence(working(0)), (now) => ({ now, visible: true, focused: true, lastInput: 0, mediaPlaying: false }))
  assert.equal(s.away, 1)
  assert.ok(Math.abs(s.netMs - IDLE_MS) <= 1000, String(s.netMs))
})

test('presence: a 4-minute video without touching anything is not time away', () => {
  const s = run(240, 0, startPresence(working(0)), (now) => ({ now, visible: true, focused: true, lastInput: 0, mediaPlaying: true }))
  assert.equal(s.away, 0)
  assert.equal(s.netMs, 240000)
})

test('presence: a closed computer (no ticks for 10 minutes) adds no working time', () => {
  let s = run(300, 0, startPresence(working(0)), working)
  s = stepPresence(s, { ...working(900000), visible: false })
  assert.equal(s.netMs, 300000)
  assert.equal(s.away, 1)
})

test('reports: added up, capped by the real time between them, and a new sitting counts as away', () => {
  assert.ok(validReport({ netMs: 20000, away: 0, opened: true }))
  assert.ok(!validReport({ netMs: -1, away: 0 }))
  assert.ok(!validReport({ netMs: 1000, away: 1.5 }))
  let t = applyTimeReport(null, { netMs: 20000, away: 0, opened: true }, 100000)
  assert.deepEqual([t.firstAt, t.netMs, t.awayCount], [100000, 20000, 0])
  t = applyTimeReport(t, { netMs: 999999, away: 2 }, 120000)
  assert.equal(t.netMs, 20000 + 25000)
  assert.equal(t.awayCount, 2)
  t = applyTimeReport(t, { netMs: 0, away: 0, opened: true }, 900000)
  assert.equal(t.awayCount, 3)
})

test('summary: 5 minutes, 10 away with the computer closed, 5 more: total about 20, net about 10', () => {
  const t = { firstAt: 0, lastAt: 20 * MIN, netMs: 10 * MIN, awayCount: 2 }
  assert.deepEqual(timeSummary(t, 20 * MIN), { totalMs: 20 * MIN, netMs: 10 * MIN, awayCount: 2, awayMs: 10 * MIN })
  assert.equal(timeSummary(null, null), null)
})

test('away a lot: more than the class number (default 5)', () => {
  assert.equal(awayLimit({}), 5)
  assert.equal(awayLimit({ awayWarnAt: 10 }), 10)
  assert.ok(awayALot({ awayCount: 6 }, 5))
  assert.ok(!awayALot({ awayCount: 5 }, 5))
  assert.ok(!awayALot({ awayCount: 6 }, 10))
})

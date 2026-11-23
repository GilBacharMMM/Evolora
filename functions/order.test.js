// Course order and due date tests (REQ-5.8, 5.9, D-55, D-60). The rules live in the website
// (web/src/courseOrder.ts); Node reads TypeScript directly. Run: npm test (in this folder)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dueFor, groupLessons, isLate, lateGrade, lockedByDue, orderStatuses } from '../web/src/courseOrder.ts'

// learning A + practice A1, A2; learning B + practice B1; learning C
const items = [
  { lessonId: 'A', practice: [{ lessonId: 'A1' }, { lessonId: 'A2' }] },
  { lessonId: 'B', practice: [{ lessonId: 'B1' }] },
  { lessonId: 'C', practice: [] },
]
const st = (order, finished, started = [], early = []) => Object.fromEntries(orderStatuses(items, order, new Set(finished), new Set(started), new Set(early)))

test('one after another: practice A locked until A is finished, B until practice A is finished', () => {
  assert.deepEqual(st('oneByOne', []), { A: 'open', A1: 'locked', A2: 'locked', B: 'locked', B1: 'locked', C: 'locked' })
  assert.deepEqual(st('oneByOne', ['A']), { A: 'done', A1: 'open', A2: 'locked', B: 'locked', B1: 'locked', C: 'locked' })
  assert.equal(st('oneByOne', ['A', 'A1', 'A2']).B, 'open')
})

test('paired: finishing A opens its practice and B; finishing B opens C even if practice A is not done', () => {
  assert.deepEqual(st('paired', ['A']), { A: 'done', A1: 'open', A2: 'open', B: 'open', B1: 'locked', C: 'locked' })
  const r = st('paired', ['A', 'B'])
  assert.equal(r.C, 'open')
  assert.equal(r.A1, 'open')
  assert.equal(r.B1, 'open')
})

test('any order: everything open', () => {
  assert.ok(Object.values(st('any', [])).every((s) => s === 'open'))
})

test('started and opened-early lessons are open in every order (REQ-5.20)', () => {
  assert.equal(st('oneByOne', [], ['B']).B, 'open')
  assert.equal(st('paired', [], [], ['C']).C, 'open')
})

test('a selection of lessons groups practice lessons under the teaching lesson before them', () => {
  const g = groupLessons([{ lessonId: 'p0', type: 'practice' }, { lessonId: 'T', type: 'teaching' }, { lessonId: 'p1', type: 'practice' }, { lessonId: 'T2', type: 'teaching' }])
  assert.deepEqual(g.map((i) => [i.lessonId, i.practice.map((p) => p.lessonId)]), [['p0', []], ['T', ['p1']], ['T2', []]])
})

test('due dates: extensions per student, late, reduce and lock (REQ-5.9)', () => {
  const rule = { due: 1000, afterDue: 'reduce', reduceBy: 10, extensions: { s2: 5000 } }
  assert.equal(dueFor(rule, 's1'), 1000)
  assert.equal(dueFor(rule, 's2'), 5000)
  assert.equal(isLate(1000, 900, 2000), false)
  assert.equal(isLate(1000, 1100, 2000), true)
  assert.equal(isLate(1000, null, 2000), true)
  assert.equal(isLate(null, null, 2000), false)
  assert.equal(lateGrade(80, rule, 1000, 1100), 70, 'finished late: 10 points off')
  assert.equal(lateGrade(5, rule, 1000, 1100), 0)
  assert.equal(lateGrade(80, rule, 1000, 900), 80, 'on time')
  assert.equal(lateGrade(80, { ...rule, afterDue: 'lock' }, 1000, 1100), 80)
  const lock = { due: 1000, afterDue: 'lock', reduceBy: 0 }
  assert.equal(lockedByDue(lock, 1000, false, 2000), true)
  assert.equal(lockedByDue(lock, 1000, true, 2000), false, 'a finished lesson can still be opened')
  assert.equal(lockedByDue(lock, 5000, false, 2000), false, 'extended')
})

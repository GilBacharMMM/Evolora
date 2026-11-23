// Dashboard and grade table tests (REQ-5.10, 5.11, 5.24, 5.12). Run: npm test (in this folder)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { averageGrade, coursePosition, lessonCell, median, studentStatus, toCsv, waitingAnswers } from './dashboard.js'
import { gradeOpen, lessonGrade } from './check.js'

test('status: red beats orange beats yellow; green otherwise', () => {
  assert.equal(studentStatus({ openFlags: 1, courses: [{ mine: 0, middle: 4 }], pastDue: true }).status, 'red')
  assert.equal(studentStatus({ openFlags: 0, courses: [{ mine: 0, middle: 4 }], pastDue: true }).status, 'orange')
  assert.equal(studentStatus({ openFlags: 0, courses: [{ mine: 3, middle: 4 }], pastDue: true }).status, 'yellow')
  assert.equal(studentStatus({ openFlags: 0, courses: [{ mine: 3, middle: 4 }] }).status, 'green')
})

test('exactly 1 lesson behind is not orange; more than 1 is', () => {
  assert.equal(studentStatus({ openFlags: 0, courses: [{ mine: 2, middle: 3 }] }).status, 'green')
  assert.equal(studentStatus({ openFlags: 0, courses: [{ mine: 1, middle: 3 }] }).status, 'orange')
  assert.equal(studentStatus({ openFlags: 0, courses: [{ mine: 1, middle: 2.5 }] }).status, 'orange')
})

test('a star for a student ahead of the class', () => {
  assert.equal(studentStatus({ openFlags: 0, courses: [{ mine: 5, middle: 2 }] }).star, true)
  assert.equal(studentStatus({ openFlags: 0, courses: [{ mine: 3, middle: 2 }] }).star, false)
  assert.equal(studentStatus({ openFlags: 1, courses: [{ mine: 5, middle: 2 }] }).star, true, 'red and a star together')
})

test('median of the class', () => {
  assert.equal(median([]), 0)
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([1, 2, 3, 10]), 2.5)
})

test('grade table cells: not done is 0, pending is left out of averages', () => {
  const notDone = lessonCell({ grade: { percent: 90, pending: false } })
  const pending = lessonCell({ finished: true, grade: { percent: 50, pending: true } })
  const done = lessonCell({ finished: true, grade: { percent: 80, pending: false } })
  const reading = lessonCell({ finished: true, grade: { percent: null, pending: false } })
  assert.deepEqual(notDone, { kind: 'notDone', percent: 0 })
  assert.equal(pending.kind, 'pending')
  assert.equal(done.percent, 80)
  assert.equal(averageGrade([notDone, pending, done, reading]), 40)
  assert.equal(averageGrade([pending]), null)
})

test('progress map: finished count and current lesson', () => {
  const p = { a: { finished: true }, b: { questions: {} } }
  assert.deepEqual(coursePosition(['a', 'b', 'c'], (id) => p[id]), { done: 1, current: 'b', working: true })
  assert.deepEqual(coursePosition(['a'], (id) => p[id]), { done: 1, current: null, working: false })
  assert.deepEqual(coursePosition(['c', 'a'], (id) => p[id]), { done: 1, current: 'c', working: false })
})

test('grading an open answer ends "pending" and sets its share of the marks', () => {
  const open = { attempts: ['text'], result: 'pending', score: null }
  const auto = { attempts: [['c1']], result: 'correct1', score: 1 }
  assert.equal(lessonGrade({ a: auto, b: open }).pending, true)
  const half = gradeOpen(open, 0.5, '  Good start ')
  assert.equal(half.state.score, 0.5)
  assert.equal(half.state.teacherComment, 'Good start')
  const g = lessonGrade({ a: auto, b: half.state })
  assert.equal(g.pending, false)
  assert.equal(g.percent, 75)
  assert.equal(gradeOpen(half.state, 1, '').state.teacherComment, undefined, 'regrading replaces the comment')
  assert.equal(gradeOpen(auto, 1).invalid, true, 'only open answers are graded by hand')
  assert.equal(gradeOpen(open, 1.5).invalid, true)
  assert.equal(gradeOpen(open, -0.1).invalid, true)
  assert.deepEqual(waitingAnswers({ questions: { a: auto, b: open, c: half.state } }), ['b'])
})

test('CSV opens in spreadsheet programs, with Hebrew and commas', () => {
  const csv = toCsv([['Student', 'שיעור, 1'], ['Dana "D"', 80], ['=cmd', null]])
  assert.ok(csv.startsWith('﻿'))
  assert.equal(csv, '﻿Student,"שיעור, 1"\r\n"Dana ""D""",80\r\n"\'=cmd",\r\n')
})

test('teacher changes any score (REQ-5.15): automatic answers are marked changed', async () => {
  const { teacherScore } = await import('./check.js')
  const auto = { attempts: [['c2'], ['c2']], result: 'wrong', score: 0 }
  const r = teacherScore(auto, 1)
  assert.equal(r.state.score, 1)
  assert.equal(r.state.changedByTeacher, true)
  assert.equal(r.state.result, 'wrong', 'what happened stays')
  assert.equal(lessonGrade({ a: r.state, b: { result: 'correct2', score: 0.5 } }).percent, 75)
  assert.equal(teacherScore(undefined, 1).invalid, true, 'an unanswered question cannot be scored')
  const open = teacherScore({ attempts: ['x'], result: 'pending', score: null }, 0, 'See me')
  assert.equal(open.state.graded, true)
  assert.equal(open.state.teacherComment, 'See me')
})

test('send back for corrections (REQ-5.14): answers move to history, topic counts go down', async () => {
  const { sendBackForCorrections } = await import('./check.js')
  const progress = {
    questions: { a: { result: 'correct1', score: 1 }, b: { result: 'wrong', score: 0, checkAgain: { result: 'correct2' } }, c: { result: 'pending' } },
    topics: { 1: { correct: 3 } },
    history: { a: [{ result: 'wrong' }] },
  }
  const r = sendBackForCorrections(progress, ['a', 'b', 'zzz'], () => 1)
  assert.deepEqual(r.sent, ['a', 'b'])
  assert.deepEqual(Object.keys(r.questions), ['c'])
  assert.equal(r.topics[1].correct, 1)
  assert.equal(r.history.a.length, 2)
  assert.equal(progress.questions.a.result, 'correct1', 'the original is not changed')
})

test('grades shown by lesson type, or all, or none (REQ-5.22)', async () => {
  const { gradesShown } = await import('./dashboard.js')
  assert.equal(gradesShown('usual', 'teaching'), false)
  assert.equal(gradesShown('usual', 'practice'), true)
  assert.equal(gradesShown('usual', 'exam'), true)
  assert.equal(gradesShown(undefined, 'practice'), true)
  assert.equal(gradesShown('show', 'teaching'), true)
  assert.equal(gradesShown('hide', 'practice'), false)
})

test('not yet mastered (REQ-5.25): level 1, wrong, until the flag is cleared', async () => {
  const { notMastered } = await import('./dashboard.js')
  const qs = [{ id: 'a', level: 1 }, { id: 'b', level: 2 }, { id: 'c', level: 1 }, { id: 'd', level: 1 }]
  const states = { a: { result: 'wrong', checkAgain: { result: 'wrong' } }, b: { result: 'wrong' }, c: { result: 'correct2' }, d: { result: 'wrong', checkAgain: { result: 'correct1' } } }
  assert.deepEqual(notMastered(qs, states, [{ questionId: 'a', open: true }]).map((q) => q.id), ['a'])
  assert.deepEqual(notMastered(qs, states, [{ questionId: 'a', open: false }]).map((q) => q.id), [])
  assert.deepEqual(notMastered(qs, states, []).map((q) => q.id), ['a'])
})

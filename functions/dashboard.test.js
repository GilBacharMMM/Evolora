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

// Grading tests (system-design 8.1): every scoring case in REQ-6.3, 4.16, 4.17 and 4.22.
// Run: npm test (in this folder)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { answerCheckAgain, answerMain, isFinished, lessonGrade, parseNumber } from './check.js'

const choiceQ = { id: 'q1', kind: 'choice' }
const choiceS = {
  correct: ['c1'],
  hint: 'HINT',
  solution: 'SOLUTION',
  checkAgain: [{ id: 'q1-check1', kind: 'choice', prompt: 'again?', choices: [{ id: 'c1', text: 'a' }, { id: 'c2', text: 'b' }], correct: ['c2'], hint: null, solution: 'CA-SOL' }],
}
const pickFirst = (bank) => bank[0]

test('correct on the 1st attempt: full marks', () => {
  const r = answerMain(undefined, choiceQ, choiceS, ['c1'], pickFirst)
  assert.equal(r.state.result, 'correct1')
  assert.equal(r.state.score, 1)
  assert.equal(r.reply.result, 'correct')
  assert.equal(r.countsCorrect, true)
})

test('wrong, then correct: hint after the 1st, half marks', () => {
  const a = answerMain(undefined, choiceQ, choiceS, ['c2'], pickFirst)
  assert.equal(a.reply.result, 'tryAgain')
  assert.equal(a.reply.hint, 'HINT')
  assert.equal(a.state.result, null)
  assert.equal(a.state.correct, undefined, 'the correct answer is not sent before the 2nd wrong attempt (D-17)')
  const b = answerMain(a.state, choiceQ, choiceS, ['c1'], pickFirst)
  assert.equal(b.state.result, 'correct2')
  assert.equal(b.state.score, 0.5)
})

test('two wrong: 0, full solution, a check-again question, no 3rd attempt', () => {
  const a = answerMain(undefined, choiceQ, choiceS, ['c2'], pickFirst)
  const b = answerMain(a.state, choiceQ, choiceS, ['c3'], pickFirst)
  assert.equal(b.state.result, 'wrong')
  assert.equal(b.state.score, 0)
  assert.equal(b.reply.solution, 'SOLUTION')
  assert.deepEqual(b.reply.correct, { choices: ['c1'] })
  assert.equal(b.reply.checkAgain.id, 'q1-check1')
  assert.equal(b.reply.checkAgain.correct, undefined, 'the check-again question is sent without its answer')
  assert.equal(isFinished(b.state), false)
  const c = answerMain(b.state, choiceQ, choiceS, ['c1'], pickFirst)
  assert.equal(c.reply.already, true, 'no 3rd attempt')
  assert.equal(c.state.score, 0)
})

test('check-again: correct sends no flag; two wrong send a flag and show the answer', () => {
  const a = answerMain(undefined, choiceQ, choiceS, ['c2'], pickFirst)
  const b = answerMain(a.state, choiceQ, choiceS, ['c2'], pickFirst)
  const ok = answerCheckAgain(b.state, choiceS, ['c2'])
  assert.equal(ok.flag, false)
  assert.equal(ok.countsCorrect, true)
  assert.equal(isFinished(ok.state), true)
  assert.equal(ok.state.score, 0, 'the check-again question never changes the grade')

  const w1 = answerCheckAgain(b.state, choiceS, ['c1'])
  assert.equal(w1.reply.result, 'tryAgain')
  assert.equal(w1.reply.hint, 'HINT', 'without its own hint, the original hint is shown again')
  const w2 = answerCheckAgain(w1.state, choiceS, ['c1'])
  assert.equal(w2.flag, true)
  assert.deepEqual(w2.reply.correct, { choices: ['c2'] })
  assert.equal(isFinished(w2.state), true)
})

test('several correct choices: only the exact combination is right', () => {
  const s = { correct: ['c1', 'c3'], hint: 'h', solution: 's', checkAgain: [] }
  assert.equal(answerMain(undefined, choiceQ, s, ['c1'], pickFirst).reply.result, 'tryAgain')
  assert.equal(answerMain(undefined, choiceQ, s, ['c3', 'c1'], pickFirst).reply.result, 'correct')
  assert.equal(answerMain(undefined, choiceQ, s, ['c1', 'c2', 'c3'], pickFirst).reply.result, 'tryAgain')
})

test('type-a-number: within 0.1 is correct (REQ-4.22)', () => {
  const q = { id: 'q2', kind: 'number' }
  const s = { answer: 11.46, hint: 'h', solution: 's', checkAgain: [] }
  assert.equal(answerMain(undefined, q, s, '11.5', pickFirst).reply.result, 'correct')
  assert.equal(answerMain(undefined, q, s, '11.46', pickFirst).reply.result, 'correct')
  assert.equal(answerMain(undefined, q, s, '11.4', pickFirst).reply.result, 'correct')
  assert.equal(answerMain(undefined, q, s, '12', pickFirst).reply.result, 'tryAgain')
  assert.equal(answerMain(undefined, q, s, '11', pickFirst).reply.result, 'tryAgain')
})

test('type-a-number: commas and letters', () => {
  assert.equal(parseNumber('7,850'), 7850)
  assert.equal(parseNumber('7850'), 7850)
  assert.equal(parseNumber(' 3.14 '), 3.14)
  assert.equal(parseNumber('abc'), null)
  assert.equal(parseNumber('12 cm'), null)
  assert.equal(parseNumber(''), null)
  const q = { id: 'q2', kind: 'number' }
  const s = { answer: 5, hint: 'h', solution: 's', checkAgain: [] }
  const r = answerMain(undefined, q, s, 'five', pickFirst)
  assert.equal(r.invalid, true, 'letters are refused without using up an attempt')
})

test('extra practice questions have no check-again question', () => {
  const s = { correct: ['c1'], hint: 'h', solution: 's', checkAgain: [] }
  const a = answerMain(undefined, choiceQ, s, ['c2'], pickFirst)
  const b = answerMain(a.state, choiceQ, s, ['c2'], pickFirst)
  assert.equal(b.reply.checkAgain, null)
  assert.equal(isFinished(b.state), true)
})

test('open questions: saved, pending, the grade waits for the teacher', () => {
  const q = { id: 'q3', kind: 'open' }
  const r = answerMain(undefined, q, {}, 'my answer', pickFirst)
  assert.equal(r.state.result, 'pending')
  assert.equal(answerMain(undefined, q, {}, '   ', pickFirst).invalid, true)
  const g = lessonGrade({ q1: { result: 'correct1', score: 1 }, q2: { result: 'correct2', score: 0.5 }, q3: r.state })
  assert.equal(g.pending, true)
})

test('lesson grade: average of the questions received; weights count', () => {
  const states = { q1: { result: 'correct1', score: 1 }, q2: { result: 'correct2', score: 0.5 }, q3: { result: 'wrong', score: 0 }, q4: undefined }
  assert.equal(lessonGrade(states).percent, 50)
  assert.equal(lessonGrade(states, { q1: 2 }).percent, 63)
})

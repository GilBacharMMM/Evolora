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

test('a right answer shows the "why it\'s right" explanation, on the 1st or 2nd attempt (REQ-4.28)', () => {
  const s = { ...choiceS, whyRight: 'WHY' }
  const a = answerMain(undefined, choiceQ, s, ['c1'], pickFirst)
  assert.equal(a.reply.whyRight, 'WHY')
  assert.equal(a.state.solution, undefined, 'the full solution is not needed when there is an explanation')
  const w = answerMain(undefined, choiceQ, s, ['c2'], pickFirst)
  assert.equal(w.state.whyRight, undefined, 'not sent before a right answer (D-17)')
  const b = answerMain(w.state, choiceQ, s, ['c1'], pickFirst)
  assert.equal(b.reply.whyRight, 'WHY')
})

test('without an explanation, a right answer shows the full solution (REQ-4.28)', () => {
  const a = answerMain(undefined, choiceQ, choiceS, ['c1'], pickFirst)
  assert.equal(a.reply.whyRight, null)
  assert.equal(a.reply.solution, 'SOLUTION')
})

test('check-again: its own explanation, or else only its correct answer (REQ-4.28)', () => {
  const wrong1 = answerMain(undefined, choiceQ, choiceS, ['c2'], pickFirst)
  const wrong2 = answerMain(wrong1.state, choiceQ, choiceS, ['c2'], pickFirst)
  const plain = answerCheckAgain(wrong2.state, choiceS, ['c2'])
  assert.equal(plain.reply.whyRight, null)
  assert.deepEqual(plain.reply.correct, { choices: ['c2'] })
  const withWhy = { ...choiceS, checkAgain: [{ ...choiceS.checkAgain[0], whyRight: 'CA-WHY' }] }
  const own = answerCheckAgain(wrong2.state, withWhy, ['c2'])
  assert.equal(own.reply.whyRight, 'CA-WHY')
})

// A lesson counts as finished when every question the student received is answered (D-55).
test('lesson finished: every question answered; skipped extras and audio count as done', async () => {
  const { lessonFinished } = await import('./check.js')
  const version = {
    topics: [
      { number: 1, blocks: [{ type: 'text' }, { type: 'question', id: 'a', kind: 'choice' }, { type: 'question', id: 'x', kind: 'number', extra: true }, { type: 'question', id: 'b', kind: 'open' }] },
      { number: 2, blocks: [{ type: 'question', id: 'c', kind: 'choice' }, { type: 'question', id: 'rec', kind: 'audio' }] },
    ],
  }
  const done = { attempts: ['c1'], result: 'correct1', score: 1 }
  const pending = { attempts: ['text'], result: 'pending', score: null }
  assert.equal(lessonFinished(version, {}, {}, 1), false)
  assert.equal(lessonFinished(version, { a: done, b: pending }, { 1: { correct: 1 } }, 1), false, 'topic 2 not answered')
  assert.equal(lessonFinished(version, { a: done, b: pending, c: done }, { 1: { correct: 1 }, 2: { correct: 1 } }, 1), false, 'the recorded answer is still missing (REQ-6.6)')
  assert.equal(lessonFinished(version, { a: done, b: pending, c: done, rec: pending }, { 1: { correct: 1 }, 2: { correct: 1 } }, 1), true, 'extra skipped, open and recorded answers sent')
  assert.equal(lessonFinished(version, { a: { ...done, result: 'wrong', score: 0 }, b: pending, c: done }, { 1: { correct: 0 } }, 1), false, 'minimum not reached: the extra question is still asked')
  const waitingCheckAgain = { result: 'wrong', score: 0, checkAgain: { result: null } }
  assert.equal(lessonFinished(version, { a: done, b: pending, c: waitingCheckAgain }, { 1: { correct: 1 } }, 1), false, 'check-again question still open')
  assert.equal(lessonFinished({ topics: [{ number: 1, blocks: [{ type: 'text' }] }] }, {}, {}, 0), true, 'a lesson without questions')
})

test('levels (REQ-6.10): a student receives questions up to their level; the lesson finishes without the others', async () => {
  const { lessonFinished, receives } = await import('./check.js')
  assert.equal(receives({ level: 1 }, 1), true)
  assert.equal(receives({ level: 2 }, 1), false)
  assert.equal(receives({ level: null }, 1), true, 'no level means level 1')
  assert.equal(receives({ level: 3 }, 3), true)
  const version = { topics: [{ number: 1, blocks: [{ type: 'question', id: 'a', kind: 'choice', level: 1 }, { type: 'question', id: 'b', kind: 'choice', level: 2 }, { type: 'question', id: 'c', kind: 'choice', level: 3 }] }] }
  const done = { result: 'correct1', score: 1 }
  assert.equal(lessonFinished(version, { a: done }, {}, 0, 1), true, 'level 1: only a')
  assert.equal(lessonFinished(version, { a: done }, {}, 0, 2), false, 'level 2: b too')
  assert.equal(lessonFinished(version, { a: done, b: done }, {}, 0, 2), true)
  assert.equal(lessonFinished(version, { a: done, b: done }, {}, 0, 3), false, 'level 3: all three')
})

test('a marked-up copy is saved with the grade of a written answer (REQ-5.12)', async () => {
  const { teacherScore } = await import('./check.js')
  const open = { attempts: ['the crown is silver'], result: 'pending', score: null }
  const r = teacherScore(open, 0.5, 'Close!', 'the crown is ⟦gold⟧')
  assert.equal(r.state.markup, 'the crown is ⟦gold⟧')
  assert.equal(teacherScore(r.state, 0.5, 'Close!', '').state.markup, undefined, 'an empty markup removes it')
  assert.equal(teacherScore({ attempts: [['c1']], result: 'wrong', score: 0 }, 1, undefined, 'x').state.markup, undefined, 'only written answers')
})

test('recordings are deleted after 31 July (REQ-10.5, D-67)', async () => {
  const { lastEndOfYear } = await import('./index.js')
  const endOf2026 = Date.UTC(2026, 6, 31, 21)
  assert.equal(lastEndOfYear(new Date(Date.UTC(2026, 6, 31, 10))), Date.UTC(2025, 6, 31, 21), 'on 31 July itself: nothing from this school year yet')
  assert.equal(lastEndOfYear(new Date(Date.UTC(2026, 7, 1, 0))), endOf2026, 'from 1 August (Israel time): this year\'s end')
  assert.equal(lastEndOfYear(new Date(Date.UTC(2027, 2, 1))), endOf2026, 'during the next school year')
})

test('a comment without a grade is saved, and the grade stays (D-68)', async () => {
  const { teacherScore, lessonGrade } = await import('./check.js')
  const open = { attempts: ['x'], result: 'pending', score: null }
  const r = teacherScore(open, null, 'Please add the units')
  assert.equal(r.state.teacherComment, 'Please add the units')
  assert.equal(r.state.graded, undefined, 'still waiting for a grade')
  assert.equal(lessonGrade({ a: r.state }).pending, true)
  assert.equal(teacherScore(open, undefined).invalid, true, 'a missing grade must be null, not left out')
})

test('drag and drop (REQ-4.12, D-70 as changed by Gil): attempts by number of cards, marks, locked cards, grades, red flag', async () => {
  const { answerMain, judge, dragAttempts } = await import('./check.js')
  const secret = { correct: ['k2', 'k1', 'k4', 'k5'], hint: 'H', solution: 'S', whyRight: 'W' }
  const cards = (n) => Array.from({ length: n }, (_, i) => ({ id: `k${i + 1}`, text: `c${i + 1}` }))
  const q = { id: 'q9', kind: 'drag', cards: cards(5) }
  const pick = () => null
  assert.equal(judge('drag', secret, ['k2', 'k1', 'k4', 'k5']), true)

  // Attempts: cards minus 2, never fewer than 2.
  assert.equal(dragAttempts(q), 3, '4 spots and 1 extra card: 3 attempts')
  assert.equal(dragAttempts({ cards: cards(4) }), 2)
  assert.equal(dragAttempts({ cards: cards(2) }), 2)
  assert.equal(dragAttempts({ cards: cards(8) }), 6)

  // First attempt with one card wrong: marks, the right cards locked, the hint.
  const a1 = answerMain(undefined, q, secret, ['k2', 'k1', 'k3', 'k5'], pick)
  assert.equal(a1.reply.result, 'tryAgain')
  assert.deepEqual(a1.reply.marks, [true, true, false, true])
  assert.deepEqual(a1.state.locked, ['k2', 'k1', null, 'k5'])
  assert.equal(a1.reply.hint, 'H')
  assert.equal(a1.reply.attemptsLeft, 2)
  assert.equal(a1.state.correct, undefined, 'the right places are not told before the last attempt (D-17)')
  assert.equal(answerMain(a1.state, q, secret, ['k1', 'k2', 'k4', 'k5'], pick).invalid, true, 'locked cards cannot be moved')
  assert.equal(answerMain(undefined, q, secret, ['k2', 'k2', 'k4', 'k5'], pick).invalid, true, 'a card is used once')
  assert.equal(answerMain(undefined, q, secret, ['k2', 'k1', 'k4'], pick).invalid, true, 'every spot needs a card')
  assert.equal(answerMain(undefined, q, secret, ['k2', 'k1', 'k4', 'k9'], pick).invalid, true, 'only real cards')

  // Grades: full, half, a quarter.
  assert.equal(answerMain(undefined, q, secret, ['k2', 'k1', 'k4', 'k5'], pick).state.score, 1)
  const second = answerMain(a1.state, q, secret, ['k2', 'k1', 'k4', 'k5'], pick)
  assert.equal(second.state.result, 'correct2')
  assert.equal(second.state.score, 0.5)
  const a2 = answerMain(a1.state, q, secret, ['k2', 'k1', 'k3', 'k5'], pick)
  assert.equal(a2.reply.result, 'tryAgain')
  const third = answerMain(a2.state, q, secret, ['k2', 'k1', 'k4', 'k5'], pick)
  assert.equal(third.state.result, 'correct3')
  assert.equal(third.state.score, 0.25)
  assert.equal(third.countsCorrect, true)

  // Every attempt fails: 0, the solution with every card, a red flag, no check-again question.
  const last = answerMain(a2.state, q, secret, ['k2', 'k1', 'k3', 'k5'], pick)
  assert.equal(last.reply.result, 'wrong')
  assert.equal(last.state.score, 0)
  assert.deepEqual(last.reply.correct, { cards: ['k2', 'k1', 'k4', 'k5'] })
  assert.equal(last.reply.checkAgain, null)
  assert.equal(last.flag, true)
  assert.equal(last.flagKind, 'dragWrong')

  // An extra card can be left out (k3 here) and the answer is still right; with 4 cards, 2 attempts.
  const small = { id: 'q8', kind: 'drag', cards: cards(4) }
  const s2 = { correct: ['k1', 'k2'], hint: null, solution: 'S' }
  const w1 = answerMain(undefined, small, s2, ['k2', 'k1'], pick)
  assert.deepEqual(w1.state.locked, [null, null])
  assert.equal(answerMain(w1.state, small, s2, ['k3', 'k4'], pick).reply.result, 'wrong', 'the 2nd wrong attempt is the last')
})

test('fill in the blanks (REQ-4.30, D-78): typed, choice and word list; attempts, locking, exam credit', async () => {
  const { answerMain, blanksAttempts, normalizeTyped, examBlanks } = await import('./check.js')
  const pick = () => null
  // Typed: spaces, nikud and punctuation ignored; typos wrong; more than one right answer.
  assert.equal(normalizeTyped('  זָהָב. '), 'זהב')
  const typed = { id: 'q1', kind: 'blanks', blanksKind: 'typed', blanks: [{}, {}, {}, {}] }
  const ts = { correct: [['זהב', 'הזהב'], ['משקל'], ['צפיפות'], ['נפח']], hint: 'H', solution: 'S' }
  assert.equal(blanksAttempts(typed), 2, '4 blanks: 2 attempts')
  assert.equal(answerMain(undefined, typed, ts, ['הזהב', 'משקל', 'צפיפות', 'נפח '], pick).state.score, 1)
  assert.equal(answerMain(undefined, typed, ts, ['זהב ', 'משקל', 'צפיפות', 'נפח'], pick).state.score, 1)
  const t1 = answerMain(undefined, typed, ts, ['זהבב', 'משקל', 'צפיפות', 'נפח'], pick)
  assert.equal(t1.reply.result, 'tryAgain', 'a typo is wrong')
  assert.deepEqual(t1.reply.marks, [false, true, true, true])
  assert.deepEqual(t1.state.locked, [null, 'משקל', 'צפיפות', 'נפח'])
  assert.equal(t1.reply.hint, 'H')
  assert.equal(answerMain(undefined, typed, ts, ['', 'משקל', 'צפיפות', 'נפח'], pick).invalid, true, 'every blank needs an answer')
  const t2 = answerMain(t1.state, typed, ts, ['כסף', 'משקל', 'צפיפות', 'נפח'], pick)
  assert.equal(t2.reply.result, 'wrong')
  assert.deepEqual(t2.reply.correct, { blanks: ['זהב', 'משקל', 'צפיפות', 'נפח'] })
  assert.equal(t2.flagKind, 'blanksWrong')
  assert.equal(answerMain(t1.state, typed, ts, ['זהב', 'משקל', 'צפיפות', 'נפח'], pick).state.score, 0.5)

  // Choice: only the option ids of that blank.
  const choice = { id: 'q2', kind: 'blanks', blanksKind: 'choice', blanks: [{ options: [{ id: 'o1-1' }, { id: 'o1-2' }] }, { options: [{ id: 'o2-1' }, { id: 'o2-2' }] }] }
  const cs = { correct: ['o1-2', 'o2-1'] }
  assert.equal(answerMain(undefined, choice, cs, ['o1-2', 'o2-1'], pick).state.score, 1)
  assert.equal(answerMain(undefined, choice, cs, ['o2-1', 'o2-1'], pick).invalid, true)

  // Word list: attempts from the cards; each card once; checked by the word.
  const words = { id: 'q3', kind: 'blanks', blanksKind: 'words', blanks: [{}, {}, {}, {}], cards: ['זהב', 'משקל', 'נפח', 'צבע', 'צפיפות'].map((text, n) => ({ id: `k${n + 1}`, text })) }
  const ws = { correct: ['זהב', 'משקל', 'צפיפות', 'נפח'] }
  assert.equal(blanksAttempts(words), 3, '4 words and 1 extra card: 3 attempts')
  assert.equal(answerMain(undefined, words, ws, ['k1', 'k1', 'k5', 'k3'], pick).invalid, true, 'a card is used once')
  const w1 = answerMain(undefined, words, ws, ['k1', 'k2', 'k4', 'k3'], pick)
  assert.deepEqual(w1.reply.marks, [true, true, false, true])
  const w2 = answerMain(w1.state, words, ws, ['k1', 'k2', 'k3', 'k3'], pick)
  assert.equal(w2.invalid, true)
  const w3 = answerMain(answerMain(w1.state, words, ws, ['k1', 'k2', 'k4', 'k3'], pick).state, words, ws, ['k1', 'k2', 'k5', 'k3'], pick)
  assert.equal(w3.state.result, 'correct3')
  assert.equal(w3.state.score, 0.25)

  // Exams: one attempt, credit per blank.
  assert.equal(examBlanks(typed, ts, ['זהב', 'משקל', 'צפיפות', 'מסה']).score, 0.75)
  assert.equal(examBlanks(typed, ts, ['', '', '', '']).score, 0)
})

// Questions a teacher removed for a class (REQ-5.36, D-92)
test('removed questions do not count in the grade; their answers stay', async () => {
  const states = { q1: { result: 'correct1', score: 1 }, q2: { result: 'wrong', score: 0 } }
  assert.equal(lessonGrade(states).percent, 50)
  assert.equal(lessonGrade(states, {}, ['q2']).percent, 100)
  assert.equal(lessonGrade(states, {}, ['q2']).outOf, 1)
  assert.ok(states.q2, 'the answer itself is kept')
})

test('removed questions are not needed to finish the lesson', async () => {
  const { lessonFinished, readRemovals } = await import('./check.js')
  const version = { topics: [{ number: 1, blocks: [{ type: 'question', id: 'a', kind: 'choice' }, { type: 'question', id: 'b', kind: 'choice' }] }] }
  const done = { result: 'correct1', score: 1 }
  assert.equal(lessonFinished(version, { a: done }, { 1: { correct: 1 } }, 1), false)
  assert.equal(lessonFinished(version, { a: done }, { 1: { correct: 1 } }, 1, 3, readRemovals({ questions: ['b'] })), true)
})

test("a topic's minimum drops to the questions left after removals", async () => {
  const { topicMinimum, readRemovals, lessonFinished } = await import('./check.js')
  const topic = {
    number: 1,
    blocks: [
      { type: 'question', id: 'a', kind: 'choice' },
      { type: 'question', id: 'b', kind: 'number' },
      { type: 'question', id: 'x', kind: 'choice', extra: true },
      { type: 'question', id: 'o', kind: 'open' },
      { type: 'question', id: 'l2', kind: 'choice', level: 2 },
    ],
  }
  assert.equal(topicMinimum(topic, 2), 2)
  assert.equal(topicMinimum(topic, 2, readRemovals({ questions: ['a', 'b'] })), 1, 'only the extra question is left')
  assert.equal(topicMinimum(topic, 2, readRemovals({ questions: ['a', 'b', 'x'] })), 0, 'open and level 2 questions do not count')
  // With the minimum lowered to 1, one right answer lets the extra question be skipped.
  const version = { topics: [topic] }
  const done = { result: 'correct1', score: 1 }
  const removed = readRemovals({ questions: ['a'] })
  assert.equal(topicMinimum(topic, 3, removed), 2)
  assert.equal(lessonFinished(version, { b: done, x: done, o: { result: 'pending' }, l2: done }, { 1: { correct: 2 } }, 3, 3, removed), true)
})

test('removed check-again questions are not asked; with none left, the student moves on', async () => {
  const { checkAgainLeft, readRemovals } = await import('./check.js')
  const bank = [{ id: 'c1' }, { id: 'c2' }]
  assert.deepEqual(checkAgainLeft(bank, readRemovals({ checkAgain: { q1: ['c1'] } }), 'q1').map((c) => c.id), ['c2'])
  assert.deepEqual(checkAgainLeft(bank, readRemovals({ checkAgain: { q1: ['c1', 'c2'] } }), 'q1'), [])
  assert.equal(checkAgainLeft(bank, readRemovals({ checkAgain: { q9: ['c1'] } }), 'q1').length, 2, 'other questions are not affected')
  // A question whose check-again questions were all removed: after two wrong answers, the solution only.
  const s = { correct: ['c1'], solution: 'SOL', checkAgain: [] }
  const first = answerMain(undefined, { id: 'q1', kind: 'choice' }, s, ['c2'], pickFirst)
  const second = answerMain(first.state, { id: 'q1', kind: 'choice' }, s, ['c2'], pickFirst)
  assert.equal(second.state.result, 'wrong')
  assert.equal(second.state.checkAgain, undefined)
  assert.equal(isFinished(second.state), true)
})

test('a student in two classes has removed only what both classes removed', async () => {
  const { commonRemovals } = await import('./check.js')
  const r = commonRemovals([{ questions: ['a', 'b'], checkAgain: { q: ['c1', 'c2'] } }, { questions: ['b'], checkAgain: { q: ['c2'] } }])
  assert.deepEqual([...r.questions], ['b'])
  assert.deepEqual([...r.checkAgain.q], ['c2'])
  assert.equal(commonRemovals([]).questions.size, 0)
})

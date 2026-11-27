// The checking rules (REQ-4.16, 4.17, 4.21, 4.22, 6.3), kept apart from the cloud
// plumbing so they can be tested automatically (system-design 8.1).
//
// Each question's state, saved in the student's progress:
//   attempts: the answers given so far
//   result:   null (not finished) | 'correct1' | 'correct2' | 'correct3' (drag and drop, a later
//             attempt) | 'wrong' | 'pending' (open question)
//   score:    1 (correct on the 1st attempt), 0.5 (on the 2nd), 0 (two wrong), null (waiting for the teacher)
//   graded, teacherComment: an open answer the teacher graded (score 0 to 1), with an optional comment (REQ-5.12, 5.13)
//   hint, solution, correct, whyRight: shown to the student only once earned
//   checkAgain: the check-again question asked after two wrong answers, with its own attempts

export const TOLERANCE = 0.1

// Reads a typed number. Accepts "7850", "7,850", "11.46", "-3". Returns null for anything else
// (letters, empty), so the student gets a friendly message without losing an attempt (REQ-4.22).
export function parseNumber(text) {
  if (typeof text !== 'string' && typeof text !== 'number') return null
  const s = String(text).trim().replace(/\s/g, '')
  if (!/^-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(s) && !/^-?\.\d+$/.test(s)) return null
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

export function numberIsCorrect(given, exact) {
  return Math.abs(given - exact) <= TOLERANCE + 1e-9
}

export function choicesAreCorrect(given, correct) {
  if (!Array.isArray(given)) return false
  const a = [...new Set(given)].sort()
  const b = [...correct].sort()
  return a.length === b.length && a.every((v, i) => v === b[i])
}

// Checks one answer to a question (or a check-again question) described by `secret`
// ({ kind, correct, answer }). Returns 'invalid', true or false.
export function judge(kind, secret, value) {
  if (kind === 'number') {
    const n = parseNumber(value)
    if (n === null) return 'invalid'
    return numberIsCorrect(n, secret.answer)
  }
  if (kind === 'choice') {
    if (!Array.isArray(value) || value.length === 0) return 'invalid'
    return choicesAreCorrect(value, secret.correct)
  }
  // Drag and drop (REQ-4.12, D-70): one card for each spot, in the order of the spots; right only
  // if every spot has its card.
  if (kind === 'drag') {
    const spots = (secret.correct || []).length
    if (!Array.isArray(value) || value.length !== spots || !value.every((v) => typeof v === 'string' && v)) return 'invalid'
    return value.every((v, i) => v === secret.correct[i])
  }
  return 'invalid'
}

function correctAnswerFor(kind, secret, q) {
  if (kind === 'drag') return { cards: secret.correct }
  if (kind === 'blanks') return { blanks: blankTexts(q, secret) }
  return kind === 'number' ? { number: secret.answer } : { choices: secret.correct }
}

// One answer to a main question. `state` is the question's saved state (or undefined),
// `q` the public question, `s` its secret part, `pickCheckAgain` chooses one from the bank.
// Returns { state, reply }, or { invalid: true } when the answer can't be read.
export function answerMain(state, q, s, value, pickCheckAgain) {
  const st = state ? structuredClone(state) : { attempts: [], result: null, score: null }
  if (st.result) return { state: st, reply: { already: true } }

  if (q.kind === 'open' || q.kind === 'audio') {
    const text = typeof value === 'string' ? value.trim() : ''
    if (!text) return { invalid: true }
    st.attempts.push(text.slice(0, 20000))
    st.result = 'pending'
    st.score = null
    return { state: st, reply: { result: 'pending' }, countsCorrect: false }
  }

  if (q.kind === 'drag') return answerDrag(st, q, s, value)
  if (q.kind === 'blanks') return answerBlanks(st, q, s, value)

  const ok = judge(q.kind, s, value)
  if (ok === 'invalid') return { invalid: true }
  st.attempts.push(value)
  const attempt = st.attempts.length

  if (ok) {
    st.result = attempt === 1 ? 'correct1' : 'correct2'
    st.score = attempt === 1 ? 1 : 0.5
    // A short "why it's right" explanation; without one, the full solution (REQ-4.28).
    if (s.whyRight) st.whyRight = s.whyRight
    else st.solution = s.solution || null
    return { state: st, reply: { result: 'correct', attempt, whyRight: st.whyRight || null, solution: st.solution || null }, countsCorrect: true }
  }
  if (attempt === 1) {
    st.hint = s.hint || null
    return { state: st, reply: { result: 'tryAgain', hint: st.hint }, countsCorrect: false }
  }
  // Second wrong answer: full solution with the correct answer, then a check-again question.
  st.result = 'wrong'
  st.score = 0
  st.solution = s.solution || null
  st.correct = correctAnswerFor(q.kind, s)
  const bank = s.checkAgain || []
  if (bank.length) {
    const ca = pickCheckAgain(bank)
    st.checkAgain = {
      id: ca.id,
      question: { id: ca.id, kind: ca.kind, prompt: ca.prompt, choices: ca.choices, multipleCorrect: ca.multipleCorrect, unit: ca.unit },
      attempts: [],
      result: null,
    }
  }
  return { state: st, reply: { result: 'wrong', solution: st.solution, correct: st.correct, checkAgain: st.checkAgain?.question || null }, countsCorrect: false }
}

// Drag and drop (REQ-4.12, D-70, changed by Gil 2026-11-25).
// Attempts: the number of cards (extra cards included) minus 2, never fewer than 2.
export function dragAttempts(q) {
  return Math.max(2, (q.cards || []).length - 2)
}
const DRAG_SCORES = [1, 0.5, 0.25]

// After each attempt every placed card is marked right or wrong; right cards stay locked on their
// spots, wrong ones go back to the pile. Right on the 1st attempt: full marks; 2nd: half; any later
// one: a quarter. When every attempt fails: 0, the full solution with the right card on every spot,
// and a red flag for the class's teachers (no check-again question). The right card of a spot is
// told only when the card placed there is right, or after the last attempt (D-17).
function answerDrag(st, q, s, value) {
  const correct = s.correct || []
  const cardIds = new Set((q.cards || []).map((c) => c.id))
  if (!Array.isArray(value) || value.length !== correct.length || !value.every((v) => typeof v === 'string' && cardIds.has(v))) return { invalid: true }
  if (new Set(value).size !== value.length) return { invalid: true }
  return answerParts(st, q, s, value, (v, i) => v === correct[i], dragAttempts(q), 'dragWrong', 'drag')
}

// Fill in the blanks (REQ-4.30, D-78): checked in lessons like drag and drop (D-70). Attempts: the
// number of blanks minus 2 (word list: the number of cards minus 2), never fewer than 2.
export function blanksAttempts(q) {
  return Math.max(2, (q.blanksKind === 'words' ? (q.cards || []).length : (q.blanks || []).length) - 2)
}

// Typed blanks: extra spaces, nikud and punctuation don't matter; a typo does.
export function normalizeTyped(text) {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[\p{P}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// A typed blank's right answers: kept as one text, separated by |.
const typedList = (c) => (Array.isArray(c) ? c : String(c ?? '').split('|')).map((a) => a.trim()).filter(Boolean)

export function blankIsRight(q, s, i, v) {
  if (q.blanksKind === 'typed') return typedList(s.correct?.[i]).some((a) => normalizeTyped(a) === normalizeTyped(v)) && normalizeTyped(v) !== ''
  if (q.blanksKind === 'choice') return v === s.correct?.[i]
  return (q.cards || []).find((c) => c.id === v)?.text === s.correct?.[i]
}

// A full answer to a blanks question: one value per blank, each of the right sort.
export function validBlanks(q, value, { allowEmpty = false } = {}) {
  const n = (q.blanks || []).length
  if (!Array.isArray(value) || value.length !== n) return false
  if (q.blanksKind === 'typed') return value.every((v) => typeof v === 'string' && v.length <= 200 && (allowEmpty || v.trim()))
  if (q.blanksKind === 'choice') return value.every((v, i) => (allowEmpty && v === '') || (q.blanks[i].options || []).some((o) => o.id === v))
  const ids = new Set((q.cards || []).map((c) => c.id))
  const used = value.filter((v) => v !== '')
  return value.every((v) => (allowEmpty && v === '') || ids.has(v)) && new Set(used).size === used.length
}

// The right word in every blank, as the student sees it in the solution.
function blankTexts(q, s) {
  return (s.correct || []).map((c, i) => (q.blanksKind === 'typed' ? typedList(c)[0] : q.blanksKind === 'choice' ? q.blanks[i].options.find((o) => o.id === c)?.text || '' : c))
}

function answerBlanks(st, q, s, value) {
  if (!validBlanks(q, value)) return { invalid: true }
  const clean = q.blanksKind === 'typed' ? value.map((v) => v.trim()) : value
  return answerParts(st, q, s, clean, (v, i) => blankIsRight(q, s, i, v), blanksAttempts(q), 'blanksWrong', 'blanks')
}

// Questions with several parts (drag and drop, fill in the blanks; D-70, D-78): after each attempt
// every part is marked right or wrong; right parts stay locked, wrong ones are emptied. Right on the
// 1st attempt: full marks; 2nd: half; any later one: a quarter. When every attempt fails: 0, the full
// solution and a red flag (no check-again question). What is right is told only part by part, or
// after the last attempt (D-17).
function answerParts(st, q, s, value, isRight, allowed, flagKind, kind) {
  const correct = s.correct || []
  const locked = st.locked || correct.map(() => null)
  // A locked card can't be moved: what was right stays right.
  if (locked.some((card, i) => card && value[i] !== card)) return { invalid: true }
  st.attempts.push(value)
  const attempt = st.attempts.length
  const marks = value.map((v, i) => isRight(v, i))
  st.marks = marks
  st.locked = value.map((v, i) => (marks[i] ? v : null))
  st.attemptsAllowed = allowed

  if (marks.every(Boolean)) {
    st.result = attempt === 1 ? 'correct1' : attempt === 2 ? 'correct2' : 'correct3'
    st.score = DRAG_SCORES[Math.min(attempt, 3) - 1]
    if (s.whyRight) st.whyRight = s.whyRight
    else st.solution = s.solution || null
    return { state: st, reply: { result: 'correct', attempt, marks, whyRight: st.whyRight || null, solution: st.solution || null }, countsCorrect: true }
  }
  if (attempt < st.attemptsAllowed) {
    // The hint after the first wrong attempt, and it stays.
    st.hint = s.hint || null
    return { state: st, reply: { result: 'tryAgain', marks, hint: st.hint, attemptsLeft: st.attemptsAllowed - attempt }, countsCorrect: false }
  }
  st.result = 'wrong'
  st.score = 0
  st.solution = s.solution || null
  st.correct = correctAnswerFor(kind, s, q)
  return { state: st, reply: { result: 'wrong', marks, solution: st.solution, correct: st.correct, checkAgain: null }, countsCorrect: false, flag: true, flagKind }
}

// One answer to the check-again question (REQ-4.17): 2 attempts; it never changes the grade;
// two wrong answers raise a red flag for the class's teachers.
export function answerCheckAgain(state, s, value) {
  const st = structuredClone(state)
  const ca = st.checkAgain
  if (!ca) return { invalid: true }
  if (ca.result) return { state: st, reply: { already: true } }
  const secret = (s.checkAgain || []).find((c) => c.id === ca.id)
  if (!secret) return { invalid: true }
  const ok = judge(secret.kind, secret, value)
  if (ok === 'invalid') return { invalid: true }
  ca.attempts.push(value)
  const attempt = ca.attempts.length
  if (ok) {
    ca.result = attempt === 1 ? 'correct1' : 'correct2'
    // Its own explanation if it has one; otherwise only its correct answer (REQ-4.28).
    if (secret.whyRight) ca.whyRight = secret.whyRight
    else ca.correct = correctAnswerFor(secret.kind, secret)
    return { state: st, reply: { result: 'correct', attempt, whyRight: ca.whyRight || null, correct: ca.correct || null }, countsCorrect: true, flag: false }
  }
  if (attempt === 1) {
    ca.hint = secret.hint || s.hint || null
    return { state: st, reply: { result: 'tryAgain', hint: ca.hint }, countsCorrect: false, flag: false }
  }
  ca.result = 'wrong'
  ca.correct = correctAnswerFor(secret.kind, secret)
  ca.solution = secret.solution || null
  return { state: st, reply: { result: 'wrong', correct: ca.correct, solution: ca.solution }, countsCorrect: false, flag: true }
}

// A question is finished when it has a result and, if it got a check-again question, that is finished too.
export function isFinished(state) {
  if (!state || !state.result) return false
  if (state.checkAgain && !state.checkAgain.result) return false
  return true
}

// The lesson grade (REQ-4.4, 6.3, system-design 5.3): weighted average of the questions the
// student received. "pending" while an open answer waits for the teacher. Questions the teacher
// removed for the class (REQ-5.36, D-92) don't count; their answers stay saved.
export function lessonGrade(questionStates, weights = {}, removed = []) {
  const gone = new Set(removed)
  let total = 0
  let got = 0
  let pending = false
  for (const [id, st] of Object.entries(questionStates)) {
    if (!st || !st.result || gone.has(id)) continue
    const w = weights[id] ?? 1
    // An open answer is pending until the teacher grades it (REQ-5.12).
    if (st.result === 'pending' && !st.graded) { pending = true; total += w; continue }
    total += w
    got += (st.score || 0) * w
  }
  return { percent: total ? Math.round((got / total) * 100) : null, pending, points: got, outOf: total }
}

// A student receives only questions at or below their level (REQ-6.10). No level means level 1.
export function receives(question, maxLevel = 3) {
  return (question.level ?? 1) <= maxLevel
}

// Questions a teacher removed for a class (REQ-5.36, D-92), as saved: the removed questions'
// ids, and for each question the ids of its removed check-again questions.
export function readRemovals(r) {
  return { questions: new Set(r?.questions || []), checkAgain: Object.fromEntries(Object.entries(r?.checkAgain || {}).map(([q, ids]) => [q, new Set(ids)])) }
}
export const NO_REMOVALS = readRemovals(null)

// What a student has removed when the lesson is given to them in several classes: only what was
// removed in every one of those classes (a question stays if any class still asks it).
export function commonRemovals(list) {
  if (!list.length) return NO_REMOVALS
  const all = list.map(readRemovals)
  const questions = new Set([...all[0].questions].filter((id) => all.every((r) => r.questions.has(id))))
  const checkAgain = {}
  for (const [q, ids] of Object.entries(all[0].checkAgain)) {
    const both = [...ids].filter((id) => all.every((r) => r.checkAgain[q]?.has(id)))
    if (both.length) checkAgain[q] = new Set(both)
  }
  return { questions, checkAgain }
}

// The check-again questions left for a question after removals (REQ-5.36).
export function checkAgainLeft(bank, removals, questionId) {
  const gone = removals?.checkAgain?.[questionId]
  return gone ? (bank || []).filter((c) => !gone.has(c.id)) : bank || []
}

// Level 1 questions checked automatically, counted for a topic's minimum (REQ-4.21), as in the
// lesson check: multiple choice, number and fill in the blanks, extra practice questions included.
const countsForMinimum = (b) => b.type === 'question' && (b.level ?? 1) === 1 && ['choice', 'number', 'blanks'].includes(b.kind)

// A topic's minimum for a class (REQ-5.36, D-92): when the teacher removed questions and fewer
// level 1 questions are left than the minimum, the minimum drops to the number left.
export function topicMinimum(topic, minimum, removals = NO_REMOVALS) {
  if (!minimum) return 0
  const left = (topic.blocks || []).filter((b) => countsForMinimum(b) && !removals.questions.has(b.id)).length
  return Math.min(minimum, left)
}

// Is the lesson finished (D-55)? Every question the student received has been answered:
// open and recorded (audio) answers count once sent (REQ-6.6, D-67), and extra
// practice questions skipped because the topic's minimum was reached count as done (REQ-4.21).
// Questions removed for the class are not asked (REQ-5.36).
// The same rule the lesson player uses to show the end of the lesson.
export function lessonFinished(version, questionStates, topics = {}, minimum = 0, maxLevel = 3, removals = NO_REMOVALS) {
  for (const topic of version.topics || []) {
    const correct = topics[topic.number]?.correct || 0
    const min = topicMinimum(topic, minimum, removals)
    for (const b of topic.blocks || []) {
      if (b.type !== 'question' || !receives(b, maxLevel) || removals.questions.has(b.id)) continue
      const st = questionStates[b.id]
      if (isFinished(st)) continue
      if (b.extra && !st && min > 0 && correct >= min) continue
      return false
    }
  }
  return true
}

// The teacher's grade for an open answer (REQ-5.12): a share of the question's full marks,
// from 0 to 1 (shown to the teacher as 0 to 100%), and an optional written comment (REQ-5.13).
export function gradeOpen(state, score, comment) {
  if (!state || state.result !== 'pending') return { invalid: true }
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) return { invalid: true }
  const st = structuredClone(state)
  st.graded = true
  st.score = Math.round(score * 1000) / 1000
  const text = typeof comment === 'string' ? comment.trim().slice(0, 5000) : ''
  if (text) st.teacherComment = text
  else delete st.teacherComment
  return { state: st }
}

// The teacher sets the score of any answered question (REQ-5.15, D-59): a share of the marks from
// 0 to 1. An open answer becomes graded; an automatically checked one is marked "changed by the
// teacher". An optional comment goes with it.
export function teacherScore(state, score, comment, markup) {
  if (!state || !state.result) return { invalid: true }
  // score null: only the comment, mark-up or recorded comment change; the grade stays (D-68).
  if (score !== null && (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1)) return { invalid: true }
  const st = structuredClone(state)
  if (score !== null) {
    st.score = Math.round(score * 1000) / 1000
    if (st.result === 'pending') st.graded = true
    else st.changedByTeacher = true
  }
  if (comment !== undefined) {
    const text = typeof comment === 'string' ? comment.trim().slice(0, 5000) : ''
    if (text) st.teacherComment = text
    else delete st.teacherComment
  }
  // A marked-up copy of a written answer (REQ-5.12, D-64): the teacher's edits and highlights.
  if (markup !== undefined && st.result === 'pending') {
    const m = typeof markup === 'string' ? markup.slice(0, 20000) : ''
    if (m.trim()) st.markup = m
    else delete st.markup
  }
  return { state: st }
}

const isCorrect = (r) => r === 'correct1' || r === 'correct2' || r === 'correct3'

// Questions sent back for corrections (REQ-5.14): they can be answered again, with 2 attempts as
// new. The earlier answers go to `history`; topic counts of right answers go down so extra
// practice questions work as before. `topicOf(questionId)` gives the question's topic number.
export function sendBackForCorrections(progress, questionIds, topicOf) {
  const questions = { ...(progress.questions || {}) }
  const topics = structuredClone(progress.topics || {})
  const history = structuredClone(progress.history || {})
  const sent = []
  for (const id of questionIds) {
    const st = questions[id]
    if (!st || !st.result) continue
    const n = topicOf(id)
    if (n != null && topics[n]) {
      let minus = 0
      if (isCorrect(st.result)) minus++
      if (st.checkAgain && isCorrect(st.checkAgain.result)) minus++
      topics[n].correct = Math.max(0, (topics[n].correct || 0) - minus)
    }
    history[id] = [...(history[id] || []), st]
    delete questions[id]
    sent.push(id)
  }
  return { questions, topics, history, sent }
}

// An exam's fill-in-the-blanks answer (REQ-4.30, D-78): one attempt; the share of blanks that are
// right. Blanks left empty are wrong.
export function examBlanks(q, s, given) {
  const n = (q.blanks || []).length
  if (!n) return { score: 0, marks: [] }
  const value = Array.isArray(given) ? given : []
  const marks = Array.from({ length: n }, (_, i) => typeof value[i] === 'string' && value[i] !== '' && blankIsRight(q, s, i, value[i]))
  const right = marks.filter(Boolean).length
  return { score: Math.round((right / n) * 1000) / 1000, marks, correct: correctAnswerFor('blanks', s, q) }
}

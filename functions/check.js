// The checking rules (REQ-4.16, 4.17, 4.21, 4.22, 6.3), kept apart from the cloud
// plumbing so they can be tested automatically (system-design 8.1).
//
// Each question's state, saved in the student's progress:
//   attempts: the answers given so far
//   result:   null (not finished) | 'correct1' | 'correct2' | 'wrong' | 'pending' (open question)
//   score:    1 (correct on the 1st attempt), 0.5 (on the 2nd), 0 (two wrong), null (waiting for the teacher)
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
  return 'invalid'
}

function correctAnswerFor(kind, secret) {
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
// student received. "pending" while an open answer waits for the teacher.
export function lessonGrade(questionStates, weights = {}) {
  let total = 0
  let got = 0
  let pending = false
  for (const [id, st] of Object.entries(questionStates)) {
    if (!st || !st.result) continue
    const w = weights[id] ?? 1
    if (st.result === 'pending') { pending = true; total += w; continue }
    total += w
    got += (st.score || 0) * w
  }
  return { percent: total ? Math.round((got / total) * 100) : null, pending, points: got, outOf: total }
}

// Is the lesson finished (D-55)? Every question the student received has been answered:
// open answers count once sent, audio questions (not recorded yet) are left out, and extra
// practice questions skipped because the topic's minimum was reached count as done (REQ-4.21).
// The same rule the lesson player uses to show the end of the lesson.
export function lessonFinished(version, questionStates, topics = {}, minimum = 0) {
  for (const topic of version.topics || []) {
    const correct = topics[topic.number]?.correct || 0
    for (const b of topic.blocks || []) {
      if (b.type !== 'question' || b.kind === 'audio') continue
      const st = questionStates[b.id]
      if (isFinished(st)) continue
      if (b.extra && !st && minimum > 0 && correct >= minimum) continue
      return false
    }
  }
  return true
}

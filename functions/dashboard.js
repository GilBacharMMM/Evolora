// The class dashboard and grade table rules (REQ-5.10, 5.11, 5.24, system-design 2.7), kept apart
// from the cloud plumbing so they can be tested, and kept in one place so they can be changed after
// trying them (REQ-5.10).

// How far behind (or ahead of) the middle of the class a student must be, in lessons, to show
// orange (or a star). "More than 1 lesson" (REQ-5.10).
export const BEHIND_BY = 1

export function median(numbers) {
  if (!numbers.length) return 0
  const s = [...numbers].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// A lesson's grade for the teacher (REQ-5.11): 'notDone' (counts as 0), 'pending' (open answers
// wait for the teacher; left out of averages), or a percentage.
export function lessonCell(progress) {
  if (!progress || !progress.finished) return { kind: 'notDone', percent: 0 }
  const g = effectiveGrade(progress) || {}
  if (g.pending) return { kind: 'pending', percent: null }
  if (g.percent == null) return { kind: 'doneNoGrade', percent: null } // a lesson without questions
  return { kind: 'grade', percent: g.percent }
}

// Average over the lessons given to the student: not done counts as 0; pending (and lessons
// without questions) are left out.
export function averageGrade(cells) {
  const counted = cells.filter((c) => c.percent != null)
  if (!counted.length) return null
  return Math.round(counted.reduce((s, c) => s + c.percent, 0) / counted.length)
}

// Where a student is in a course (REQ-5.24): how many lessons are finished, the lesson they are on
// (the first one not finished), and whether they have started it.
export function coursePosition(order, progressOf) {
  const done = order.filter((id) => progressOf(id)?.finished).length
  const current = order.find((id) => !progressOf(id)?.finished) || null
  return { done, current, working: current ? !!progressOf(current) : false }
}

// The status colour and word (REQ-5.10): red (open red flag), orange (more than BEHIND_BY lessons
// behind the middle of the class in a course), yellow (an assignment past its due date and
// unfinished: due dates come with REQ-5.9, so never yet), green otherwise. The most serious wins.
// A star marks a student more than BEHIND_BY lessons ahead of the middle in some course.
// `courses` is a list of { mine, middle } lesson counts, one per course given to the student.
export function studentStatus({ openFlags, courses, pastDue = false }) {
  const behind = courses.some((c) => c.middle - c.mine > BEHIND_BY)
  const ahead = courses.some((c) => c.mine - c.middle > BEHIND_BY)
  const status = openFlags > 0 ? 'red' : behind ? 'orange' : pastDue ? 'yellow' : 'green'
  return { status, star: ahead }
}

// Open answers waiting for the teacher in a student's lesson work.
export function waitingAnswers(progress) {
  return Object.entries(progress?.questions || {})
    .filter(([, st]) => st && st.result === 'pending' && !st.graded)
    .map(([id]) => id)
}

// Makes a CSV file (REQ-5.11) that spreadsheet programs open correctly, Hebrew and Arabic included:
// a byte-order mark first, and every value quoted when it needs to be.
export function toCsv(rows) {
  const cell = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\r\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"` : s
  }
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

// Whether students see the grade of a lesson in an assignment (REQ-5.22, D-59).
// grades: 'usual' (teaching hidden; practice and exams shown), 'show' or 'hide'.
export function gradesShown(grades, lessonType) {
  if (grades === 'show') return true
  if (grades === 'hide') return false
  return lessonType !== 'teaching'
}

// The "not yet mastered" list (REQ-5.25, D-59): level 1 questions that ended wrong, whose
// check-again question wasn't answered correctly, and whose red flag (if any) isn't cleared.
// `questions`: [{ id, level }], `states`: the student's question states, `flags`: their flags
// for this lesson ({ questionId, open }).
export function notMastered(questions, states, flags) {
  return questions.filter((q) => {
    if (q.level !== 1) return false
    const st = states[q.id]
    if (!st || st.result !== 'wrong') return false
    if (st.checkAgain && (st.checkAgain.result === 'correct1' || st.checkAgain.result === 'correct2')) return false
    const qFlags = flags.filter((f) => f.questionId === q.id)
    return !(qFlags.length && qFlags.every((f) => !f.open))
  })
}

// Due dates (REQ-5.9, D-60). The same rules as web/src/courseOrder.ts, which is tested in order.test.js.
export function dueFor(rule, uid) {
  return rule.extensions?.[uid] ?? rule.due ?? null
}

export function lateGrade(percent, rule, due, finishedAt) {
  if (percent == null || rule.afterDue !== 'reduce' || !due || !finishedAt || finishedAt <= due) return percent
  return Math.max(0, percent - (rule.reduceBy || 0))
}

// Level suggestions (REQ-5.18): from each student's average over lessons finished and graded in the
// class in the last 4 weeks, once they have at least 5 such lessons. The weakest 10% of those
// students are suggested level 1, the strongest 10% level 3 (only when it is a change). Nothing
// changes until the teacher accepts. `students`: [{ id, level, graded: [{ percent, finishedAt }] }].
export const SUGGEST_MIN_LESSONS = 5
export const SUGGEST_WINDOW_MS = 28 * 24 * 3600 * 1000

export function levelSuggestions(students, now) {
  const eligible = students
    .map((s) => {
      const recent = s.graded.filter((g) => g.percent != null && g.finishedAt && now - g.finishedAt <= SUGGEST_WINDOW_MS)
      return { id: s.id, level: s.level, count: recent.length, average: recent.length ? recent.reduce((a, g) => a + g.percent, 0) / recent.length : null }
    })
    .filter((s) => s.count >= SUGGEST_MIN_LESSONS)
    .sort((a, b) => a.average - b.average)
  const out = {}
  if (!eligible.length) return out
  const tenth = Math.max(1, Math.round(eligible.length * 0.1))
  for (const s of eligible.slice(0, tenth)) if (s.level !== 1) out[s.id] = 1
  for (const s of eligible.slice(-tenth)) if (s.level !== 3 && !(s.id in out)) out[s.id] = 3
  return out
}

// The grade that counts for a lesson (REQ-6.5): while a redo is going on, or when redos don't count,
// the kept grade (the one before the redo); otherwise the latest.
export function effectiveGrade(progress) {
  if (!progress) return null
  if (progress.keptGrade) return progress.keptGrade
  if (progress.redo?.active) return progress.redos?.[progress.redos.length - 1]?.grade || progress.grade || null
  return progress.grade || null
}

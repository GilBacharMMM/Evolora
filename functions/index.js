// Evolora checking service (system-design 5, D-17). Runs in Google Cloud, in Israel (me-west1).
// Students' browsers never hold a correct answer, hint or solution before they have earned it.
//
// Callable functions:
//   answer({ lessonId, questionId, value, checkAgain })   check one answer
//   openTip({ lessonId, questionId, tip })                note that a help tip was opened (REQ-6.15)
//   finishLesson({ lessonId })                            mark a lesson without questions finished (D-55)
//   and the class functions further down (REQ-5.1, 5.2, 5.4, 5.7)

import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getStorage } from 'firebase-admin/storage'
import { randomUUID } from 'node:crypto'
import { answerCheckAgain, answerMain, isFinished, judge, lessonFinished, lessonGrade, receives, sendBackForCorrections, teacherScore } from './check.js'
import { averageGrade, coursePosition, dueFor, lateGrade, lessonCell, levelSuggestions, median, notMastered, sentBackLimit, sentBackTotals, studentStatus, toCsv, waitingAnswers } from './dashboard.js'
import { CLASS_COLORS, WAIT_MS, afterWrong, makeCode, normalizeCode, validateCode, waitLeft } from './classcode.js'

// "public" lets the website reach the service; every call still checks who is signed in.
setGlobalOptions({ region: 'me-west1', maxInstances: 10, invoker: 'public' })
initializeApp()
const db = getFirestore()

const progressId = (uid, lessonId) => `${uid}__${lessonId}`

// The student's level for a lesson (REQ-5.18, 6.10): their level in the classes the lesson is
// given to (the highest, if several); level 2 when the teacher hasn't set one. Teachers: all (3).
// The minimum questions per topic for this student (REQ-4.21, 5.9): the teacher's choice in the
// latest assignment that gives them the lesson and sets one; otherwise the lesson's default.
async function minimumFor(uid, classIds, lessonId, lesson) {
  let best = null
  for (const c of classIds) {
    const given = await db.collection(`classes/${c}/assignments`).where('lessonIds', 'array-contains', lessonId).get()
    for (const d of given.docs) {
      const a = d.data()
      if (!(a.everyone || (a.studentIds || []).includes(uid)) || !Number.isInteger(a.minimumPerTopic)) continue
      const at = a.createdAt?.toMillis?.() ?? 0
      if (!best || at > best.at) best = { at, value: a.minimumPerTopic }
    }
  }
  return best ? best.value : lesson.minimumPerTopic || 0
}

async function levelFor(uid, classIds) {
  if (!classIds.length) return 3
  const snaps = await db.getAll(...classIds.map((c) => db.doc(`classes/${c}/levels/${uid}`)))
  return Math.max(...snaps.map((s) => (s.exists && [1, 2, 3].includes(s.data().level) ? s.data().level : 2)))
}

// May this person take this lesson? Teachers may take any lesson; students only lessons open to
// one of their classes (REQ-3.4). Returns the class IDs the lesson is open to for this student.
async function access(auth, lesson) {
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in first.')
  const membership = await db.doc(`memberships/${auth.uid}`).get()
  const mine = membership.exists ? membership.data().classIds || [] : []
  const shared = (lesson.classIds || []).filter((c) => mine.includes(c))
  if (shared.length) return shared
  const email = auth.token.email
  if (email && auth.token.email_verified) {
    const staff = await db.doc(`staff/${email.toLowerCase()}`).get()
    if (staff.exists && ['teacher', 'admin'].includes(staff.data().role)) return []
  }
  throw new HttpsError('permission-denied', 'This lesson is not open to you.')
}

function findQuestion(version, questionId) {
  for (const topic of version.topics) {
    for (const block of topic.blocks) {
      if (block.type === 'question' && block.id === questionId) return { q: block, topic }
    }
  }
  return null
}

// The last question that is checked automatically in a topic, used to tell whether a student
// ran out of extra practice questions without reaching the minimum (REQ-4.21).
function lastAutoQuestionId(topic, maxLevel = 3) {
  const auto = topic.blocks.filter((b) => b.type === 'question' && (b.kind === 'choice' || b.kind === 'number') && receives(b, maxLevel))
  return auto.length ? auto[auto.length - 1].id : null
}

export const answer = onCall({ enforceAppCheck: false }, async (request) => {
  const { lessonId, questionId, value, checkAgain } = request.data || {}
  if (typeof lessonId !== 'string' || typeof questionId !== 'string') throw new HttpsError('invalid-argument', 'Missing lesson or question.')
  const lessonRef = db.doc(`lessons/${lessonId}`)
  const lessonSnap = await lessonRef.get()
  if (!lessonSnap.exists) throw new HttpsError('not-found', 'No such lesson.')
  const lesson = lessonSnap.data()
  const classIds = await access(request.auth, lesson)
  const uid = request.auth.uid
  const maxLevel = await levelFor(uid, classIds)
  const topicMinimum = await minimumFor(uid, classIds, lessonId, lesson)
  // Exams are answered with examSave and examSubmit (REQ-4.26).
  if (lesson.type === 'exam') throw new HttpsError('failed-precondition', 'exam')
  const progressRef = db.doc(`progress/${progressId(uid, lessonId)}`)

  // A sent recording gets its private link (REQ-6.6, D-67).
  const { value: sentValue } = request.data
  const audioUrl = typeof sentValue === 'string' && sentValue.startsWith(`recordings/${uid}/${lessonId}/${questionId}/`) && !sentValue.includes('..') ? await recordingLink(sentValue) : null

  let flagToRaise = null
  const result = await db.runTransaction(async (tx) => {
    flagToRaise = null
    const pSnap = await tx.get(progressRef)
    const progress = pSnap.exists ? pSnap.data() : null
    // A student keeps the version they started (REQ-4.7, system-design 3.2).
    const version = progress?.version || lesson.currentVersion
    const vRef = lessonRef.collection('versions').doc(String(version))
    const [vSnap, sSnap] = await Promise.all([tx.get(vRef), tx.get(vRef.collection('secret').doc('answers'))])
    const found = findQuestion(vSnap.data(), questionId)
    if (!found) throw new HttpsError('not-found', 'No such question.')
    const { q, topic } = found
    // A recorded answer is a file the student uploaded to their own place in file storage (REQ-6.6).
    if (q.kind === 'audio' && !checkAgain && !(typeof value === 'string' && value.startsWith(`recordings/${uid}/${lessonId}/${questionId}/`) && !value.includes('..'))) throw new HttpsError('invalid-argument', 'invalid-answer')
    if (!receives(q, maxLevel)) throw new HttpsError('failed-precondition', 'Not one of your questions.')
    const secret = sSnap.data().questions[questionId] || {}
    const questions = progress?.questions || {}
    const before = questions[questionId]

    const outcome = checkAgain ? answerCheckAgain(before, secret, value) : answerMain(before, q, secret, value, (bank) => bank[Math.floor(Math.random() * bank.length)])
    if (outcome.invalid) throw new HttpsError('invalid-argument', 'invalid-answer')
    if (outcome.reply.already) return { reply: outcome.reply, state: before }

    const topics = progress?.topics || {}
    const t = { correct: 0, flagged: false, ...(topics[topic.number] || {}) }
    if (outcome.countsCorrect) t.correct += 1
    if (outcome.flag) flagToRaise = { kind: 'checkAgainWrong', questionId, topicNumber: topic.number, topicName: topic.name }

    const newState = outcome.state
    if (q.kind === 'audio' && audioUrl) newState.audioUrl = audioUrl
    // The time of every attempt, so time on the lesson can be worked out later (REQ-5.33, D-75).
    newState.answeredAt = [...(before?.answeredAt || []), Date.now()]
    const minimum = topicMinimum
    if (minimum && isFinished(newState) && lastAutoQuestionId(topic, maxLevel) === questionId && t.correct < minimum && !t.flagged) {
      t.flagged = true
      flagToRaise = flagToRaise || { kind: 'minimumNotReached', questionId, topicNumber: topic.number, topicName: topic.name }
      if (outcome.flag) flagToRaise.alsoMinimum = true
    }

    const nextQuestions = { ...questions, [questionId]: newState }
    const grade = lessonGrade(nextQuestions)
    const update = {
      uid,
      lessonId,
      version,
      classIds,
      questions: nextQuestions,
      topics: { ...topics, [topic.number]: t },
      grade,
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (!progress) update.startedAt = FieldValue.serverTimestamp()
    // Finished when every question the student received is answered (D-55).
    const nextTopics = update.topics
    const redoing = progress?.redo?.active === true
    if ((!progress?.finished || redoing) && lessonFinished(vSnap.data(), nextQuestions, nextTopics, minimum, maxLevel)) {
      update.finished = true
      update.finishedAt = FieldValue.serverTimestamp()
      // A redo is finished (REQ-6.5).
      if (redoing) update.redo = { ...progress.redo, active: false }
      // Questions sent back for corrections are all answered again (REQ-5.14).
      if (progress?.sentBack && progress.sentBack.mode === 'corrections' && !progress.sentBack.done) update.sentBack = { ...progress.sentBack, done: true, doneAt: Date.now() }
    }
    tx.set(progressRef, update, { merge: true })
    return { reply: outcome.reply, state: newState, topicCorrect: t.correct }
  })

  // Red flags for the class's teachers (REQ-4.17, 4.21, 1.3).
  if (flagToRaise && classIds.length) {
    const user = await db.doc(`users/${uid}`).get()
    const batch = db.batch()
    for (const classId of classIds) {
      batch.set(db.collection('flags').doc(), {
        classId,
        uid,
        studentName: user.exists ? user.data().name || '' : '',
        lessonId,
        lessonTitle: lesson.title,
        ...flagToRaise,
        open: true,
        createdAt: FieldValue.serverTimestamp(),
      })
    }
    await batch.commit()
  }
  return result
})

export const openTip = onCall(async (request) => {
  const { lessonId, questionId, tip } = request.data || {}
  if (typeof lessonId !== 'string' || typeof questionId !== 'string' || !Number.isInteger(tip)) throw new HttpsError('invalid-argument', 'Missing details.')
  const lessonSnap = await db.doc(`lessons/${lessonId}`).get()
  if (!lessonSnap.exists) throw new HttpsError('not-found', 'No such lesson.')
  await access(request.auth, lessonSnap.data())
  const ref = db.doc(`progress/${progressId(request.auth.uid, lessonId)}`)
  await ref.set(
    { uid: request.auth.uid, lessonId, tipsOpened: { [questionId]: FieldValue.increment(1) }, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  )
  return { ok: true }
})

// A lesson without questions is finished when the student reaches its end (D-55).
// The lesson player asks for this; the service checks it again itself.
export const finishLesson = onCall(async (request) => {
  const { lessonId } = request.data || {}
  if (typeof lessonId !== 'string') throw new HttpsError('invalid-argument', 'Missing lesson.')
  const lessonRef = db.doc(`lessons/${lessonId}`)
  const lessonSnap = await lessonRef.get()
  if (!lessonSnap.exists) throw new HttpsError('not-found', 'No such lesson.')
  const lesson = lessonSnap.data()
  const classIds = await access(request.auth, lesson)
  const ref = db.doc(`progress/${progressId(request.auth.uid, lessonId)}`)
  const snap = await ref.get()
  const progress = snap.exists ? snap.data() : null
  if (progress?.finished) return { finished: true }
  const version = progress?.version || lesson.currentVersion
  const v = await lessonRef.collection('versions').doc(String(version)).get()
  if (!lessonFinished(v.data(), progress?.questions || {}, progress?.topics || {}, await minimumFor(request.auth.uid, classIds, lessonId, lesson), await levelFor(request.auth.uid, classIds))) return { finished: false }
  const update = { uid: request.auth.uid, lessonId, version, classIds, finished: true, finishedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }
  if (!progress) update.startedAt = FieldValue.serverTimestamp()
  await ref.set(update, { merge: true })
  return { finished: true }
})

// ---------------------------------------------------------------------------------------------
// Classes, class codes and assignments (REQ-5.1, 5.2, 5.4, 5.7, system-design 2.6).
// Nobody's browser writes these records; only these functions do, after checking who asks.
//
//   createClass({ name })                                   a teacher creates a class
//   joinClass({ code })                                     a student joins with a class code
//   newClassCode({ classId })                               the teacher makes a new code
//   setJoining({ classId, open })                           the teacher turns joining on or off
//   removeStudent({ classId, studentId })                   the teacher removes a student
//   assign({ classId, courseId | lessonIds, studentIds })   the teacher gives lessons or a course

async function requireTeacher(auth) {
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in first.')
  const email = auth.token.email
  const staff = email && auth.token.email_verified ? await db.doc(`staff/${email.toLowerCase()}`).get() : null
  if (!staff?.exists || !['teacher', 'admin'].includes(staff.data().role)) throw new HttpsError('permission-denied', 'For teachers only.')
  return staff.data()
}

// The class, if this person is one of its teachers.
async function requireClassTeacher(auth, classId) {
  await requireTeacher(auth)
  if (typeof classId !== 'string' || !classId || classId.includes('/')) throw new HttpsError('invalid-argument', 'Missing class.')
  const ref = db.doc(`classes/${classId}`)
  const snap = await ref.get()
  if (!snap.exists || !(snap.data().teacherIds || []).includes(auth.uid)) throw new HttpsError('permission-denied', 'Not your class.')
  return { ref, data: snap.data() }
}

async function personName(auth) {
  const user = await db.doc(`users/${auth.uid}`).get()
  return (user.exists && user.data().name) || auth.token.name || auth.token.email || ''
}

// Saves a new, unused code for the class; the old one stops working. Returns the new code.
async function saveNewCode(classId, oldCode) {
  for (let tries = 0; tries < 10; tries++) {
    const code = makeCode()
    const ok = await db.runTransaction(async (tx) => {
      const ref = db.doc(`classCodes/${code}`)
      if ((await tx.get(ref)).exists) return false
      tx.set(ref, { classId, createdAt: FieldValue.serverTimestamp() })
      if (oldCode) tx.delete(db.doc(`classCodes/${oldCode}`))
      tx.set(db.doc(`classes/${classId}`), { code, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      return true
    })
    if (ok) return code
  }
  throw new HttpsError('internal', 'Could not make a code. Please try again.')
}

export const createClass = onCall(async (request) => {
  const me = await requireTeacher(request.auth)
  const name = typeof request.data?.name === 'string' ? request.data.name.trim().replace(/\s+/g, ' ') : ''
  if (!name || name.length > 80) throw new HttpsError('invalid-argument', 'class-name')
  const ref = db.collection('classes').doc()
  const count = (await db.collection('classes').count().get()).data().count
  await ref.set({
    name,
    teacherIds: [request.auth.uid],
    teacherNames: [await personName(request.auth)],
    color: CLASS_COLORS[count % CLASS_COLORS.length],
    courseIds: [],
    joiningOpen: true,
    // The school of the teacher who created it (D-69).
    schoolId: me.schoolId || null,
    createdAt: FieldValue.serverTimestamp(),
  })
  const code = await saveNewCode(ref.id, null)
  return { classId: ref.id, code }
})

// Results: joined | already | closed | checkCode | noClass | wait (with minutes).
export const joinClass = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.')
  const uid = request.auth.uid
  const attemptsRef = db.doc(`joinAttempts/${uid}`)
  const now = Date.now()
  const attempts = (await attemptsRef.get()).data()
  const left = waitLeft(attempts, now)
  if (left) return { result: 'wait', minutes: Math.ceil(left / 60000) }

  const wrong = async (result) => {
    const after = afterWrong(attempts, now)
    await attemptsRef.set({ ...after.state, lastWrongAt: FieldValue.serverTimestamp() })
    return after.mustWait ? { result: 'wait', minutes: Math.ceil(WAIT_MS / 60000) } : { result }
  }

  const code = normalizeCode(request.data?.code)
  if (validateCode(code) !== 'ok') return wrong('checkCode')
  const codeSnap = await db.doc(`classCodes/${code}`).get()
  if (!codeSnap.exists) return wrong('noClass')
  const classId = codeSnap.data().classId
  const classRef = db.doc(`classes/${classId}`)
  const cls = await classRef.get()
  if (!cls.exists) return wrong('noClass')
  // A right code: the count of wrong codes starts again.
  if (attempts) await attemptsRef.delete()
  const className = cls.data().name
  if (cls.data().joiningOpen === false) return { result: 'closed', className }

  const membershipRef = db.doc(`memberships/${uid}`)
  const membership = await membershipRef.get()
  if ((membership.exists ? membership.data().classIds || [] : []).includes(classId)) return { result: 'already', classId, className }
  const batch = db.batch()
  batch.set(membershipRef, { classIds: FieldValue.arrayUnion(classId) }, { merge: true })
  batch.set(
    classRef.collection('students').doc(uid),
    { name: await personName(request.auth), email: request.auth.token.email || '', joinedAt: FieldValue.serverTimestamp(), removed: FieldValue.delete(), removedAt: FieldValue.delete() },
    { merge: true },
  )
  await batch.commit()
  return { result: 'joined', classId, className }
})

export const newClassCode = onCall(async (request) => {
  const { data } = await requireClassTeacher(request.auth, request.data?.classId)
  const code = await saveNewCode(request.data.classId, data.code || null)
  return { code }
})

export const setJoining = onCall(async (request) => {
  const { ref } = await requireClassTeacher(request.auth, request.data?.classId)
  const open = request.data?.open === true
  await ref.update({ joiningOpen: open, updatedAt: FieldValue.serverTimestamp() })
  return { joiningOpen: open }
})

// The number of answers sent back for corrections, in one course, at which the dashboard warns
// (REQ-5.34, D-75). Default 10.
export const setSentBackLimit = onCall(async (request) => {
  const { ref } = await requireClassTeacher(request.auth, request.data?.classId)
  const limit = request.data?.limit
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpsError('invalid-argument', 'A number from 1 to 100.')
  await ref.update({ sentBackWarnAt: limit, updatedAt: FieldValue.serverTimestamp() })
  return { limit }
})

// The student no longer sees the class; their work is kept for the teacher (REQ-5.4).
export const removeStudent = onCall(async (request) => {
  const { classId, studentId } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  if (typeof studentId !== 'string' || !studentId || studentId.includes('/')) throw new HttpsError('invalid-argument', 'Missing student.')
  const studentRef = ref.collection('students').doc(studentId)
  if (!(await studentRef.get()).exists) throw new HttpsError('not-found', 'Not in this class.')
  const batch = db.batch()
  batch.set(db.doc(`memberships/${studentId}`), { classIds: FieldValue.arrayRemove(classId) }, { merge: true })
  batch.update(studentRef, { removed: true, removedAt: FieldValue.serverTimestamp() })
  await batch.commit()
  return { ok: true }
})

// Gives a course, or one or more lessons, to the whole class or to chosen students (REQ-5.7).
// studentIds: null for the whole class (including students who join later), or a list.
export const assign = onCall(async (request) => {
  const { classId, courseId, lessonIds, studentIds, grades = 'usual', order = 'paired', due = null, afterDue = 'reduce', reduceBy = 10, redoCounts = false, minimumPerTopic = null, examStart = null, examEnd = null, examTimer = true, examLock = 'none' } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  if (!['usual', 'show', 'hide'].includes(grades)) throw new HttpsError('invalid-argument', 'Grades: usual, show or hide.')
  if (!['oneByOne', 'paired', 'any'].includes(order)) throw new HttpsError('invalid-argument', 'Order: oneByOne, paired or any.')
  if (due !== null && (!Number.isFinite(due) || due < 0)) throw new HttpsError('invalid-argument', 'Due date.')
  if ((examStart !== null || examEnd !== null) && !(Number.isFinite(examStart) && Number.isFinite(examEnd) && examEnd > examStart)) throw new HttpsError('invalid-argument', 'Exam window: a start before the end.')
  if (!['none', 'class', 'all'].includes(examLock)) throw new HttpsError('invalid-argument', 'Exam lock: none, class or all.')
  if (!['reduce', 'lock'].includes(afterDue) || !Number.isInteger(reduceBy) || reduceBy < 0 || reduceBy > 100) throw new HttpsError('invalid-argument', 'After the due date: reduce (0 to 100 points) or lock.')
  const validId = (s) => typeof s === 'string' && s.length > 0 && !s.includes('/')
  let ids
  let course = null
  if (courseId != null) {
    if (!validId(courseId)) throw new HttpsError('invalid-argument', 'Missing course.')
    const c = await db.doc(`courses/${courseId}`).get()
    if (!c.exists) throw new HttpsError('not-found', 'No such course.')
    course = c
    ids = c.data().lessonIds || []
  } else {
    if (!Array.isArray(lessonIds) || lessonIds.length === 0 || lessonIds.length > 50 || !lessonIds.every(validId)) {
      throw new HttpsError('invalid-argument', 'Choose a course or lessons.')
    }
    ids = [...new Set(lessonIds)]
    const snaps = await db.getAll(...ids.map((l) => db.doc(`lessons/${l}`)))
    if (snaps.some((s) => !s.exists)) throw new HttpsError('not-found', 'No such lesson.')
  }
  const everyone = studentIds == null
  let chosen = []
  if (!everyone) {
    if (!Array.isArray(studentIds) || studentIds.length === 0 || studentIds.length > 500 || !studentIds.every(validId)) {
      throw new HttpsError('invalid-argument', 'Choose students.')
    }
    chosen = [...new Set(studentIds)]
    const snaps = await db.getAll(...chosen.map((s) => ref.collection('students').doc(s)))
    if (snaps.some((s) => !s.exists || s.data().removed)) throw new HttpsError('invalid-argument', 'A chosen student is not in the class.')
  }
  const assignmentRef = ref.collection('assignments').doc()
  const batch = db.batch()
  batch.set(assignmentRef, {
    kind: course ? 'course' : 'lessons',
    courseId: course ? course.id : null,
    lessonIds: ids,
    everyone,
    studentIds: chosen,
    // Whether students see grades (REQ-5.22, D-59): usual (teaching hidden), show or hide.
    grades,
    // Course order (REQ-5.8) and due date with what happens after it (REQ-5.9, D-60).
    order,
    due,
    afterDue,
    reduceBy,
    extensions: {},
    // Whether the latest redo's grade replaces the old one (REQ-5.9, 6.5).
    redoCounts: redoCounts === true,
    // The minimum questions per topic, when the teacher changes the lesson's default (REQ-4.21, 5.9).
    minimumPerTopic: Number.isInteger(minimumPerTopic) && minimumPerTopic >= 0 && minimumPerTopic <= 20 ? minimumPerTopic : null,
    // Exams (REQ-5.23): the time window, the timer, and locking the rest during the window.
    examStart,
    examEnd,
    examTimer: examTimer !== false,
    examLock,
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  })
  // Opening the lessons (and the course) to the class lets its students read them (system-design 4.3).
  if (course) batch.update(course.ref, { classIds: FieldValue.arrayUnion(classId) })
  for (const l of ids) batch.update(db.doc(`lessons/${l}`), { classIds: FieldValue.arrayUnion(classId) })
  await batch.commit()
  return { assignmentId: assignmentRef.id }
})

// ---------------------------------------------------------------------------------------------
// Following and grading (stage 1, part 4: REQ-5.27, 5.10, 5.24, 5.19, 5.20, 5.12, 5.13, 5.11,
// system-design 2.7). Teachers read their class's work through these, after the same check.
//
//   teacherHome()                                                  counts and "To do" for all classes
//   classOverview({ classId })                                     dashboard, progress map, grade table, CSV
//   lessonResults({ classId, lessonId })                           each student's answers in one lesson
//   gradeAnswer({ classId, lessonId, studentId, questionId, score, comment })   grade an open answer
//   clearFlag({ flagId, note })                                    clear a red flag
//   openEarly({ classId, lessonId, studentIds })                   open a course lesson early
//   setLevel({ classId, studentId, level })                        change a student's level

const toMillis = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : null)
const validId = (s) => typeof s === 'string' && s.length > 0 && !s.includes('/')

// What the class was given, read once: courses (in course order, D-55), single lessons, openings.
async function classWork(classRef) {
  const [assignSnap, openSnap] = await Promise.all([classRef.collection('assignments').get(), classRef.collection('openings').get()])
  const assignments = assignSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (toMillis(a.createdAt) || 0) - (toMillis(b.createdAt) || 0))
  const courseIds = [...new Set(assignments.filter((a) => a.kind === 'course' && a.courseId).map((a) => a.courseId))]
  const courseSnaps = courseIds.length ? await db.getAll(...courseIds.map((c) => db.doc(`courses/${c}`))) : []
  const courses = courseSnaps
    .filter((s) => s.exists)
    .map((s) => {
      const c = s.data()
      return {
        courseId: s.id,
        title: c.title,
        language: c.language,
        items: c.items,
        order: c.items.flatMap((it) => [it.lessonId, ...it.practice.map((p) => p.lessonId)]),
        // Archived when every assignment of this course in the class is archived (REQ-5.21).
        archived: assignments.filter((a) => a.kind === 'course' && a.courseId === s.id).every((a) => a.archived === true),
      }
    })
  const lessonIds = [...new Set(assignments.flatMap((a) => a.lessonIds || []))]
  const lessonSnaps = lessonIds.length ? await db.getAll(...lessonIds.map((l) => db.doc(`lessons/${l}`))) : []
  const lessons = Object.fromEntries(lessonSnaps.filter((s) => s.exists).map((s) => [s.id, { title: s.data().title, type: s.data().type, language: s.data().language }]))
  const openings = openSnap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toMillis(d.data().createdAt) }))
  // The lessons each student was given: whole-class assignments, and those that name them.
  const givenTo = (uid) => {
    const mine = assignments.filter((a) => a.everyone || (a.studentIds || []).includes(uid))
    return {
      courseIds: [...new Set(mine.filter((a) => a.kind === 'course').map((a) => a.courseId))].filter((c) => courses.some((k) => k.courseId === c)),
      lessonIds: [...new Set(mine.flatMap((a) => a.lessonIds || []))].filter((l) => lessons[l]),
    }
  }
  return { assignments, courses, lessons, openings, givenTo }
}

async function classStudents(classRef) {
  const [list, levels] = await Promise.all([classRef.collection('students').get(), classRef.collection('levels').get()])
  const levelOf = Object.fromEntries(levels.docs.map((d) => [d.id, d.data().level]))
  return list.docs
    .map((d) => ({ id: d.id, name: d.data().name || '', email: d.data().email || '', removed: d.data().removed === true, level: levelOf[d.id] ?? 2 }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Students' work, as the teacher sees it. For exams, the graded results (kept apart until they
// are released, REQ-4.26) are laid over the student's saved answers.
async function progressMap(pairs, examLessons = new Set()) {
  if (!pairs.length) return {}
  const snaps = await db.getAll(...pairs.map(([uid, l]) => db.doc(`progress/${progressId(uid, l)}`)))
  const out = Object.fromEntries(snaps.filter((s) => s.exists).map((s) => [s.id, s.data()]))
  const examPairs = pairs.filter(([, l]) => examLessons.has(l))
  if (examPairs.length) {
    const results = await db.getAll(...examPairs.map(([uid, l]) => db.doc(`examResults/${progressId(uid, l)}`)))
    for (const r of results) if (r.exists && r.data().finished && out[r.id]) out[r.id] = { ...out[r.id], ...r.data(), updatedAt: out[r.id].updatedAt }
  }
  return out
}

export const classOverview = onCall(async (request) => {
  const classId = request.data?.classId
  const { ref, data } = await requireClassTeacher(request.auth, classId)
  const [work, students] = await Promise.all([classWork(ref), classStudents(ref)])
  // Exams whose time window has ended are submitted for the students still working (REQ-5.23).
  await submitExpired(classId, work, students)
  const flagSnap = await db.collection('flags').where('classId', '==', classId).get()
  const current = students.filter((s) => !s.removed)
  // Removed students too: their page stays open to the teacher, with their work (REQ-5.4).
  const given = Object.fromEntries(students.map((s) => [s.id, work.givenTo(s.id)]))
  const exams = new Set(Object.keys(work.lessons).filter((l) => work.lessons[l].type === 'exam'))
  const progress = await progressMap(students.flatMap((s) => given[s.id].lessonIds.map((l) => [s.id, l])), exams)
  const p = (uid, l) => progress[progressId(uid, l)]
  const flags = flagSnap.docs
    .map((d) => {
      const f = d.data()
      return {
        id: d.id,
        uid: f.uid,
        studentName: f.studentName,
        lessonId: f.lessonId,
        lessonTitle: f.lessonTitle,
        questionId: f.questionId,
        topicName: f.topicName || null,
        kind: f.kind,
        alsoMinimum: !!f.alsoMinimum,
        open: f.open !== false,
        createdAt: toMillis(f.createdAt),
        clearedAt: toMillis(f.clearedAt),
        clearNote: f.clearNote || null,
      }
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  // The middle of the class in each course (REQ-5.10): the median number of finished lessons.
  const middles = Object.fromEntries(
    work.courses.map((c) => {
      const counts = current.filter((s) => given[s.id].courseIds.includes(c.courseId)).map((s) => coursePosition(c.order, (l) => p(s.id, l)).done)
      return [c.courseId, median(counts)]
    }),
  )

  const now = Date.now()
  const warnAt = sentBackLimit(data)
  // The assignment that sets a lesson's due date for a student (D-60): the latest one given to them
  // that includes the lesson and has a due date; otherwise the latest one that includes it.
  const ruleFor = (uid, l) => {
    const mine = work.assignments.filter((a) => (a.everyone || (a.studentIds || []).includes(uid)) && (a.lessonIds || []).includes(l)).reverse()
    return mine.find((a) => a.due || Object.keys(a.extensions || {}).length) || mine[0]
  }
  const allRows = students.map((s) => {
    const mine = given[s.id]
    let pastDue = false
    const cells = Object.fromEntries(
      mine.lessonIds.map((l) => {
        const pr = p(s.id, l)
        const rule = ruleFor(s.id, l) || {}
        const due = dueFor(rule, s.id)
        const finishedAt = toMillis(pr?.finishedAt)
        const base = lessonCell(pr)
        if (due && !pr?.finished && now > due) pastDue = true
        const late = !!due && (finishedAt ? finishedAt > due : now > due)
        const cell = base.kind === 'grade' ? { ...base, percent: lateGrade(base.percent, rule, due, finishedAt) } : base
        return [l, { ...cell, due, late, finishedAt, started: !!pr, sentBack: pr?.sentBack && !pr.sentBack.done ? pr.sentBack.mode : null, sentBackCount: pr?.sentBackCount || 0, waiting: waitingAnswers(pr).length, tips: Object.values(pr?.tipsOpened || {}).reduce((a, b) => a + b, 0) }]
      }),
    )
    const positions = Object.fromEntries(mine.courseIds.map((c) => [c, coursePosition(work.courses.find((k) => k.courseId === c).order, (l) => p(s.id, l))]))
    const openFlags = flags.filter((f) => f.uid === s.id && f.open).length
    const sentBack = sentBackTotals(work.courses.filter((c) => mine.courseIds.includes(c.courseId)), (l) => cells[l]?.sentBackCount, warnAt)
    const active = (c) => !work.courses.find((k) => k.courseId === c)?.archived
    const { status, star } = studentStatus({ openFlags, pastDue, courses: mine.courseIds.filter(active).map((c) => ({ mine: positions[c].done, middle: middles[c] })) })
    const times = mine.lessonIds.map((l) => toMillis(p(s.id, l)?.updatedAt)).filter(Boolean)
    return {
      ...s,
      courseIds: mine.courseIds,
      lessonIds: mine.lessonIds,
      cells,
      positions,
      average: averageGrade(Object.values(cells)),
      openFlags,
      sentBackTotals: sentBack.totals,
      sentBackWarnings: sentBack.warnings,
      lastWorked: times.length ? Math.max(...times) : null,
      status,
      star,
    }
  })

  const rows = allRows.filter((r) => !r.removed)
  const removedRows = allRows.filter((r) => r.removed)

  // Level suggestions (REQ-5.18), shown on the dashboard until the teacher accepts or ignores them.
  const suggestions = levelSuggestions(
    rows.map((r) => ({ id: r.id, level: r.level, graded: Object.values(r.cells).filter((c) => c.kind === 'grade').map((c) => ({ percent: c.percent, finishedAt: c.finishedAt })) })),
    now,
  )
  for (const r of rows) r.suggestion = suggestions[r.id] ?? null

  // The grade table as a CSV file (REQ-5.11): a row per student, a column per lesson.
  const columns = [...work.courses.flatMap((c) => c.order), ...Object.keys(work.lessons)].filter((l, i, all) => all.indexOf(l) === i && work.lessons[l])
  const csv = toCsv([
    ['Student', 'Email', 'Average', ...columns.map((l) => work.lessons[l].title)],
    ...rows.map((r) => [
      r.name,
      r.email,
      r.average ?? '',
      ...columns.map((l) => {
        const c = r.cells[l]
        if (!c) return ''
        return c.kind === 'notDone' ? 'not done (0)' : c.kind === 'pending' ? 'pending' : c.kind === 'doneNoGrade' ? 'done' : c.percent
      }),
    ]),
  ])

  return {
    name: data.name,
    color: data.color || '#0E6B73',
    teacherNames: data.teacherNames || [],
    sentBackWarnAt: warnAt,
    courses: work.courses.map((c) => ({ ...c, middle: middles[c.courseId] })),
    lessons: work.lessons,
    columns,
    openings: work.openings,
    students: rows,
    removedStudents: removedRows,
    flags,
    csv,
  }
})

export const teacherHome = onCall(async (request) => {
  await requireTeacher(request.auth)
  const classes = await db.collection('classes').where('teacherIds', 'array-contains', request.auth.uid).get()
  const out = []
  const todo = []
  for (const c of classes.docs) {
    const [flags, work, students] = await Promise.all([
      db.collection('flags').where('classId', '==', c.id).where('open', '==', true).get(),
      db.collection('progress').where('classIds', 'array-contains', c.id).get().then(async (p) => ({ docs: [...p.docs, ...(await db.collection('examResults').where('classIds', 'array-contains', c.id).get()).docs] })),
      classStudents(c.ref),
    ])
    const removed = new Set(students.filter((s) => s.removed).map((s) => s.id))
    const openFlags = flags.docs.filter((f) => !removed.has(f.data().uid))
    for (const f of openFlags) {
      const d = f.data()
      todo.push({ kind: 'flag', classId: c.id, className: c.data().name, flagId: f.id, studentId: d.uid, studentName: d.studentName, lessonTitle: d.lessonTitle, flagKind: d.kind, topicName: d.topicName || null, at: toMillis(d.createdAt) })
    }
    const waitingByLesson = {}
    let waiting = 0
    for (const w of work.docs) {
      const n = waitingAnswers(w.data()).length
      if (!n) continue
      waiting += n
      const l = w.data().lessonId
      waitingByLesson[l] = waitingByLesson[l] || { count: 0, at: 0 }
      waitingByLesson[l].count += n
      waitingByLesson[l].at = Math.max(waitingByLesson[l].at, toMillis(w.data().updatedAt) || 0)
    }
    const lessonIds = Object.keys(waitingByLesson)
    const titles = lessonIds.length ? await db.getAll(...lessonIds.map((l) => db.doc(`lessons/${l}`))) : []
    for (const s of titles) {
      todo.push({ kind: 'grade', classId: c.id, className: c.data().name, lessonId: s.id, lessonTitle: s.exists ? s.data().title : s.id, count: waitingByLesson[s.id].count, at: waitingByLesson[s.id].at })
    }
    // Unread messages from students (REQ-5.16, 5.27)
    const unread = (await db.collection('conversations').where('classId', '==', c.id).where('unreadByTeacher', '==', true).get()).docs.filter((d) => !removed.has(d.data().uid))
    for (const d of unread) todo.push({ kind: 'message', classId: c.id, className: c.data().name, studentId: d.data().uid, studentName: d.data().studentName, at: toMillis(d.data().lastAt) })
    out.push({ id: c.id, name: c.data().name, color: c.data().color || '#0E6B73', students: students.filter((s) => !s.removed).length, openFlags: openFlags.length, waiting, unread: unread.length })
  }
  todo.sort((a, b) => (a.at || 0) - (b.at || 0))
  return { classes: out, todo }
})

export const lessonResults = onCall(async (request) => {
  const { classId, lessonId } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  if (!validId(lessonId)) throw new HttpsError('invalid-argument', 'Missing lesson.')
  const lessonRef = db.doc(`lessons/${lessonId}`)
  const lessonSnap = await lessonRef.get()
  if (!lessonSnap.exists || !(lessonSnap.data().classIds || []).includes(classId)) throw new HttpsError('not-found', 'This lesson was not given to the class.')
  const lesson = lessonSnap.data()
  const [work, students] = await Promise.all([classWork(ref), classStudents(ref)])
  const withLesson = students.filter((s) => !s.removed && work.givenTo(s.id).lessonIds.includes(lessonId))
  const isExam = lesson.type === 'exam'
  if (isExam) await submitExpired(classId, work, students)
  const progress = await progressMap(withLesson.map((s) => [s.id, lessonId]), new Set(isExam ? [lessonId] : []))
  // The questions of every version the students have, with the grading instructions (REQ-5.12).
  const versions = [...new Set([lesson.currentVersion, ...Object.values(progress).map((p) => p.version).filter(Boolean)])]
  const questions = []
  for (const v of versions) {
    const vRef = lessonRef.collection('versions').doc(String(v))
    const [vs, ss] = await Promise.all([vRef.get(), vRef.collection('secret').doc('answers').get()])
    if (!vs.exists) continue
    const secret = ss.exists ? ss.data().questions || {} : {}
    for (const topic of vs.data().topics) {
      for (const b of topic.blocks) {
        if (b.type !== 'question' || questions.some((q) => q.id === b.id)) continue
        questions.push({
          id: b.id,
          kind: b.kind,
          prompt: b.prompt,
          extra: !!b.extra,
          level: b.level ?? null,
          choices: b.choices || [],
          unit: b.unit || null,
          topic: topic.number,
          topicName: topic.name || null,
          gradingInstructions: secret[b.id]?.gradingInstructions || null,
        })
      }
    }
  }
  return {
    lessonId,
    title: lesson.title,
    language: lesson.language,
    type: lesson.type,
    isExam,
    questions,
    students: withLesson.map((s) => {
      const pr = progress[progressId(s.id, lessonId)]
      const states = Object.fromEntries(
        Object.entries(pr?.questions || {}).map(([id, st]) => [
          id,
          { attempts: st.attempts || [], result: st.result, score: st.score, graded: !!st.graded, changedByTeacher: !!st.changedByTeacher, teacherComment: st.teacherComment || null, markup: st.markup || null, teacherAudio: st.teacherAudio || null, audioUrl: st.audioUrl || null, checkAgain: st.checkAgain ? { result: st.checkAgain.result } : null },
        ]),
      )
      return { id: s.id, name: s.name, cell: lessonCell(pr), states, submitted: !!pr?.submitted, released: !!pr?.released, sentBack: pr?.sentBack || null, earlier: Object.fromEntries(Object.entries(pr?.history || {}).map(([q, h]) => [q, h.length])) }
    }),
  }
})

export const gradeAnswer = onCall(async (request) => {
  const { classId, lessonId, studentId, questionId, score, comment, markup, audioData } = request.data || {}
  await requireClassTeacher(request.auth, classId)
  if (![lessonId, studentId, questionId].every(validId)) throw new HttpsError('invalid-argument', 'Missing details.')
  // Exam answers are graded in the exam results (REQ-4.26).
  const isExam = (await db.doc(`lessons/${lessonId}`).get()).data()?.type === 'exam'
  const ref = db.doc(`${isExam ? 'examResults' : 'progress'}/${progressId(studentId, lessonId)}`)
  // A recorded comment (REQ-5.13, D-67) is saved first; '' removes the one saved before.
  const teacherAudio = typeof audioData === 'string' && audioData ? await saveComment(studentId, lessonId, questionId, audioData) : audioData === '' ? '' : undefined
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists || !(snap.data().classIds || []).includes(classId)) throw new HttpsError('not-found', 'No such answer in this class.')
    const p = snap.data()
    const outcome = teacherScore(p.questions?.[questionId], score, comment, markup)
    if (outcome.invalid) throw new HttpsError('invalid-argument', 'invalid-grade')
    if (teacherAudio) outcome.state.teacherAudio = teacherAudio
    else if (teacherAudio === '') delete outcome.state.teacherAudio
    outcome.state.gradedBy = request.auth.uid
    outcome.state.gradedAt = Date.now()
    const questions = { ...p.questions, [questionId]: outcome.state }
    const grade = lessonGrade(questions)
    tx.update(ref, { questions, grade, updatedAt: FieldValue.serverTimestamp() })
    return { state: outcome.state, grade }
  })
})

export const clearFlag = onCall(async (request) => {
  const { flagId, note } = request.data || {}
  if (!validId(flagId)) throw new HttpsError('invalid-argument', 'Missing flag.')
  const ref = db.doc(`flags/${flagId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'No such flag.')
  await requireClassTeacher(request.auth, snap.data().classId)
  const text = typeof note === 'string' ? note.trim().slice(0, 1000) : ''
  await ref.update({ open: false, clearedAt: FieldValue.serverTimestamp(), clearedBy: request.auth.uid, clearNote: text || null })
  return { ok: true }
})

// Opens one lesson of a course given to the class early, for the whole class or chosen students
// (REQ-5.20). It is open whatever comes before it (D-55).
export const openEarly = onCall(async (request) => {
  const { classId, lessonId, studentIds } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  if (!validId(lessonId)) throw new HttpsError('invalid-argument', 'Missing lesson.')
  const work = await classWork(ref)
  if (!work.courses.some((c) => c.order.includes(lessonId)) && !work.assignments.some((a) => (a.lessonIds || []).includes(lessonId))) throw new HttpsError('invalid-argument', 'The lesson was not given to the class.')
  const everyone = studentIds == null
  let chosen = []
  if (!everyone) {
    if (!Array.isArray(studentIds) || !studentIds.length || studentIds.length > 500 || !studentIds.every(validId)) throw new HttpsError('invalid-argument', 'Choose students.')
    chosen = [...new Set(studentIds)]
    const snaps = await db.getAll(...chosen.map((s) => ref.collection('students').doc(s)))
    if (snaps.some((s) => !s.exists || s.data().removed)) throw new HttpsError('invalid-argument', 'A chosen student is not in the class.')
  }
  const opening = ref.collection('openings').doc()
  await opening.set({ lessonId, everyone, studentIds: chosen, createdBy: request.auth.uid, createdAt: FieldValue.serverTimestamp() })
  return { openingId: opening.id }
})

export const setLevel = onCall(async (request) => {
  const { classId, studentId, level } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  if (!validId(studentId) || ![1, 2, 3].includes(level)) throw new HttpsError('invalid-argument', 'Level 1 to 3.')
  if (!(await ref.collection('students').doc(studentId).get()).exists) throw new HttpsError('not-found', 'Not in this class.')
  await ref.collection('levels').doc(studentId).set({ level, setBy: request.auth.uid, setAt: FieldValue.serverTimestamp() })
  return { level }
})

// ---------------------------------------------------------------------------------------------
// Priority 2: sending back, teacher notes, the full student page (REQ-5.14, 5.25, 5.28, D-59).
//
//   sendBack({ classId, lessonId, studentId, mode, questionIds, note })   for review or corrections
//   readComments({ lessonId })                                          the student has read them
//   addNote({ classId, studentId, text })                               a private teacher note
//   studentDetails({ classId, studentId })                              not yet mastered, notes

export const sendBack = onCall(async (request) => {
  const { classId, lessonId, studentId, mode, questionIds, note, mustReturn = true } = request.data || {}
  await requireClassTeacher(request.auth, classId)
  if (![lessonId, studentId].every(validId) || !['review', 'corrections'].includes(mode)) throw new HttpsError('invalid-argument', 'Missing details.')
  const ids = mode === 'corrections' ? questionIds : []
  if (mode === 'corrections' && (!Array.isArray(ids) || !ids.length || !ids.every(validId))) throw new HttpsError('invalid-argument', 'Choose questions.')
  const ref = db.doc(`progress/${progressId(studentId, lessonId)}`)
  const text = typeof note === 'string' ? note.trim().slice(0, 5000) : ''
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists || !(snap.data().classIds || []).includes(classId)) throw new HttpsError('not-found', 'No work in this class.')
    const p = snap.data()
    // mustReturn (Gil, D-68): the student must go over it before going on in the course; otherwise
    // at their own time. Either way, a lesson they are in the middle of isn't stopped.
    const sentBackNow = { mode, questionIds: [], note: text || null, mustReturn: mustReturn !== false, by: request.auth.uid, at: Date.now(), done: false }
    if (mode === 'review') {
      if (!p.finished) throw new HttpsError('failed-precondition', 'not-finished')
      tx.update(ref, { sentBack: sentBackNow, updatedAt: FieldValue.serverTimestamp() })
      return { sent: [] }
    }
    const version = (await tx.get(db.doc(`lessons/${lessonId}/versions/${p.version}`))).data()
    const topicOf = (id) => version.topics.find((t) => t.blocks.some((b) => b.type === 'question' && b.id === id))?.number ?? null
    const r = sendBackForCorrections(p, ids, topicOf)
    if (!r.sent.length) throw new HttpsError('invalid-argument', 'None of these questions were answered.')
    sentBackNow.questionIds = r.sent
    tx.update(ref, {
      questions: r.questions,
      topics: r.topics,
      history: r.history,
      grade: lessonGrade(r.questions),
      finished: false,
      sentBack: sentBackNow,
      // Every sending back for corrections is counted (REQ-5.34, D-75).
      sentBackCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { sent: r.sent }
  })
})

// "I've read the comments" (REQ-5.14, D-59): the lesson sent back for review is gone over.
export const readComments = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.')
  const { lessonId } = request.data || {}
  if (!validId(lessonId)) throw new HttpsError('invalid-argument', 'Missing lesson.')
  const ref = db.doc(`progress/${progressId(request.auth.uid, lessonId)}`)
  const snap = await ref.get()
  const sb = snap.exists ? snap.data().sentBack : null
  if (!sb || sb.mode !== 'review' || sb.done) return { ok: true }
  await ref.update({ 'sentBack.done': true, 'sentBack.doneAt': Date.now(), updatedAt: FieldValue.serverTimestamp() })
  return { ok: true }
})

// Private notes about a student, seen only by the class's teachers (REQ-5.28).
export const addNote = onCall(async (request) => {
  const { classId, studentId, text } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  const body = typeof text === 'string' ? text.trim().slice(0, 5000) : ''
  if (!validId(studentId) || !body) throw new HttpsError('invalid-argument', 'Write a note.')
  if (!(await ref.collection('students').doc(studentId).get()).exists) throw new HttpsError('not-found', 'Not in this class.')
  const note = ref.collection('notes').doc()
  await note.set({ studentId, text: body, by: request.auth.uid, byName: await personName(request.auth), createdAt: FieldValue.serverTimestamp() })
  return { noteId: note.id }
})

// For the student page (REQ-5.28): the "not yet mastered" list (REQ-5.25) and the teacher notes.
export const studentDetails = onCall(async (request) => {
  const { classId, studentId } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  if (!validId(studentId)) throw new HttpsError('invalid-argument', 'Missing student.')
  const [work, notesSnap, flagSnap] = await Promise.all([
    classWork(ref),
    ref.collection('notes').where('studentId', '==', studentId).get(),
    db.collection('flags').where('classId', '==', classId).where('uid', '==', studentId).get(),
  ])
  const lessonIds = work.givenTo(studentId).lessonIds
  const progress = await progressMap(lessonIds.map((l) => [studentId, l]))
  const flags = flagSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const list = []
  for (const l of lessonIds) {
    const p = progress[progressId(studentId, l)]
    if (!p?.version) continue
    const v = (await db.doc(`lessons/${l}/versions/${p.version}`).get()).data()
    const questions = v.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question'))
    const number = Object.fromEntries(questions.map((q, i) => [q.id, i + 1]))
    for (const q of notMastered(questions, p.questions || {}, flags.filter((f) => f.lessonId === l))) {
      const flag = flags.find((f) => f.lessonId === l && f.questionId === q.id && f.open !== false)
      list.push({ lessonId: l, lessonTitle: work.lessons[l]?.title || l, questionId: q.id, number: number[q.id], prompt: q.prompt, flagId: flag ? flag.id : null })
    }
  }
  const notes = notesSnap.docs
    .map((d) => ({ id: d.id, text: d.data().text, byName: d.data().byName || '', createdAt: toMillis(d.data().createdAt) }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return { notMastered: list, notes }
})

// Changing a due date (REQ-5.9): for the whole class, or extended for one student.
export const setDue = onCall(async (request) => {
  const { classId, assignmentId, due, studentId } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  if (!validId(assignmentId) || (due !== null && (!Number.isFinite(due) || due < 0))) throw new HttpsError('invalid-argument', 'Due date.')
  const a = ref.collection('assignments').doc(assignmentId)
  if (!(await a.get()).exists) throw new HttpsError('not-found', 'No such assignment.')
  if (studentId != null) {
    if (!validId(studentId)) throw new HttpsError('invalid-argument', 'Missing student.')
    await a.update({ [`extensions.${studentId}`]: due === null ? FieldValue.delete() : due })
  } else {
    await a.update({ due })
  }
  return { ok: true }
})

// Which questions this student doesn't receive, because they are above the student's level
// (REQ-6.10). The lesson player leaves them out without saying so.
export const lessonView = onCall(async (request) => {
  const { lessonId } = request.data || {}
  if (!validId(lessonId)) throw new HttpsError('invalid-argument', 'Missing lesson.')
  const lessonRef = db.doc(`lessons/${lessonId}`)
  const lessonSnap = await lessonRef.get()
  if (!lessonSnap.exists) throw new HttpsError('not-found', 'No such lesson.')
  const lesson = lessonSnap.data()
  const classIds = await access(request.auth, lesson)
  const maxLevel = await levelFor(request.auth.uid, classIds)
  // Levels don't apply in exams: everyone gets the same questions (REQ-4.26).
  const minimum = await minimumFor(request.auth.uid, classIds, lessonId, lesson)
  if (maxLevel >= 3 || lesson.type === 'exam') return { hidden: [], minimum }
  const p = await db.doc(`progress/${progressId(request.auth.uid, lessonId)}`).get()
  const version = (p.exists && p.data().version) || lesson.currentVersion
  const v = (await lessonRef.collection('versions').doc(String(version)).get()).data()
  const answered = p.exists ? p.data().questions || {} : {}
  // A question already answered stays (a level lowered later applies from the next question).
  const hidden = v.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question' && !receives(b, maxLevel) && !answered[b.id]).map((b) => b.id))
  return { hidden, minimum }
})

// Trying a lesson as a teacher (REQ-5.32): answers are checked as for a student, but nothing is
// saved; the website keeps the state. With show: true, the correct answer and full solution.
export const tryAnswer = onCall(async (request) => {
  await requireTeacher(request.auth)
  const { lessonId, questionId, value, checkAgain, before, show } = request.data || {}
  if (!validId(lessonId) || !validId(questionId)) throw new HttpsError('invalid-argument', 'Missing lesson or question.')
  const lessonRef = db.doc(`lessons/${lessonId}`)
  const lesson = (await lessonRef.get()).data()
  if (!lesson) throw new HttpsError('not-found', 'No such lesson.')
  const vRef = lessonRef.collection('versions').doc(String(lesson.currentVersion))
  const [vSnap, sSnap] = await Promise.all([vRef.get(), vRef.collection('secret').doc('answers').get()])
  const found = findQuestion(vSnap.data(), questionId)
  if (!found) throw new HttpsError('not-found', 'No such question.')
  const secret = sSnap.data().questions[questionId] || {}
  if (show) {
    const correct = found.q.kind === 'number' ? { number: secret.answer } : found.q.kind === 'choice' ? { choices: secret.correct } : found.q.kind === 'drag' ? { cards: secret.correct } : null
    return { correct, solution: secret.solution || null, gradingInstructions: secret.gradingInstructions || null }
  }
  const state = before && typeof before === 'object' ? before : undefined
  const outcome = checkAgain ? answerCheckAgain(state, secret, value) : answerMain(state, found.q, secret, value, (bank) => bank[Math.floor(Math.random() * bank.length)])
  if (outcome.invalid) throw new HttpsError('invalid-argument', 'invalid-answer')
  return { reply: outcome.reply, state: outcome.state }
})

// Archiving a course in a class, or bringing it back (REQ-5.21). Students see it under
// "Archived courses"; its lessons and grades stay.
export const archiveCourse = onCall(async (request) => {
  const { classId, courseId, archived } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  if (!validId(courseId) || typeof archived !== 'boolean') throw new HttpsError('invalid-argument', 'Missing course.')
  const snap = await ref.collection('assignments').where('courseId', '==', courseId).get()
  if (snap.empty) throw new HttpsError('not-found', 'The course was not given to this class.')
  const batch = db.batch()
  for (const d of snap.docs) batch.update(d.ref, { archived })
  await batch.commit()
  return { archived }
})

// A teacher changes a student's interface language (REQ-9.6); it applies the next time the student
// opens Evolora (the website reads the saved language when they sign in, REQ-9.4).
export const setStudentLanguage = onCall(async (request) => {
  const { classId, studentId, language } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  if (!validId(studentId) || !['he', 'ar', 'en'].includes(language)) throw new HttpsError('invalid-argument', 'Language: he, ar or en.')
  const s = await ref.collection('students').doc(studentId).get()
  if (!s.exists || s.data().removed) throw new HttpsError('not-found', 'Not in this class.')
  await db.doc(`users/${studentId}`).set({ language }, { merge: true })
  return { language }
})

// Co-teachers (REQ-5.5): a teacher of the class adds another teacher by email. The other teacher
// must be on the staff list and have signed in once. All teachers of a class can do the same things.
export const addTeacher = onCall(async (request) => {
  const { classId, email } = request.data || {}
  const { ref, data } = await requireClassTeacher(request.auth, classId)
  const key = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!key || !key.includes('@')) throw new HttpsError('invalid-argument', 'email')
  const staff = await db.doc(`staff/${key}`).get()
  if (!staff.exists || !['teacher', 'admin'].includes(staff.data().role)) return { result: 'notTeacher' }
  // Only teachers of the same school can be added (Gil, D-69). The system admin assigns schools.
  const me = await requireTeacher(request.auth)
  if (!me.schoolId || me.schoolId !== staff.data().schoolId) return { result: 'otherSchool' }
  const users = await db.collection('users').where('email', '==', key).limit(1).get()
  if (users.empty) {
    const any = await db.collection('users').get()
    const match = any.docs.find((d) => String(d.data().email || '').toLowerCase() === key)
    if (!match) return { result: 'notSignedIn' }
    users.docs.push(match)
  }
  const user = users.docs[0]
  if ((data.teacherIds || []).includes(user.id)) return { result: 'already' }
  await ref.update({
    teacherIds: FieldValue.arrayUnion(user.id),
    teacherNames: FieldValue.arrayUnion(user.data().name || staff.data().name || key),
    updatedAt: FieldValue.serverTimestamp(),
  })
  return { result: 'added', name: user.data().name || key }
})

// Messages (REQ-5.16, 10.2): each student has one private conversation with the teachers of each
// class. All the class's teachers share it; nobody else can read it; students can't message each
// other. Stored in conversations/{classId}__{studentId}, with its messages under it.
const conversationId = (classId, studentId) => `${classId}__${studentId}`

// Who is writing: a teacher of the class (for a given student), or the student themself.
async function conversationSide(auth, classId, studentId) {
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in first.')
  if (!validId(classId)) throw new HttpsError('invalid-argument', 'Missing class.')
  const cls = await db.doc(`classes/${classId}`).get()
  if (!cls.exists) throw new HttpsError('not-found', 'No such class.')
  if ((cls.data().teacherIds || []).includes(auth.uid) && studentId) {
    await requireClassTeacher(auth, classId)
    if (!validId(studentId)) throw new HttpsError('invalid-argument', 'Missing student.')
    const s = await db.doc(`classes/${classId}/students/${studentId}`).get()
    if (!s.exists) throw new HttpsError('not-found', 'Not in this class.')
    return { from: 'teacher', studentId, studentName: s.data().name || '' }
  }
  const m = await db.doc(`memberships/${auth.uid}`).get()
  if (!(m.exists && (m.data().classIds || []).includes(classId))) throw new HttpsError('permission-denied', 'Not your class.')
  return { from: 'student', studentId: auth.uid, studentName: await personName(auth) }
}

export const sendMessage = onCall(async (request) => {
  const { classId, studentId, text } = request.data || {}
  const body = typeof text === 'string' ? text.trim().slice(0, 5000) : ''
  if (!body) throw new HttpsError('invalid-argument', 'Write a message.')
  const side = await conversationSide(request.auth, classId, studentId)
  const ref = db.doc(`conversations/${conversationId(classId, side.studentId)}`)
  const batch = db.batch()
  batch.set(ref.collection('messages').doc(), { from: side.from, byUid: request.auth.uid, byName: await personName(request.auth), text: body, at: FieldValue.serverTimestamp() })
  batch.set(
    ref,
    {
      classId,
      uid: side.studentId,
      studentName: side.studentName,
      lastAt: FieldValue.serverTimestamp(),
      lastFrom: side.from,
      unreadByStudent: side.from === 'teacher',
      unreadByTeacher: side.from === 'student',
    },
    { merge: true },
  )
  await batch.commit()
  return { ok: true }
})

// Opening the conversation marks the other side's messages as read.
export const markRead = onCall(async (request) => {
  const { classId, studentId } = request.data || {}
  const side = await conversationSide(request.auth, classId, studentId)
  const ref = db.doc(`conversations/${conversationId(classId, side.studentId)}`)
  if ((await ref.get()).exists) await ref.update(side.from === 'teacher' ? { unreadByTeacher: false } : { unreadByStudent: false })
  return { ok: true }
})

// Redo a finished lesson (REQ-6.5). If the teacher allowed it when giving the lesson ("redo
// counts", REQ-5.9), the latest redo's grade replaces the old one, even if lower; otherwise the
// redo is practice only and the earlier grade is kept. Earlier answers are kept in `redos`.
export const startRedo = onCall(async (request) => {
  const { lessonId } = request.data || {}
  if (!validId(lessonId)) throw new HttpsError('invalid-argument', 'Missing lesson.')
  const lessonSnap = await db.doc(`lessons/${lessonId}`).get()
  if (!lessonSnap.exists) throw new HttpsError('not-found', 'No such lesson.')
  const classIds = await access(request.auth, lessonSnap.data())
  const uid = request.auth.uid
  let counts = false
  for (const c of classIds) {
    const given = await db.collection(`classes/${c}/assignments`).where('lessonIds', 'array-contains', lessonId).get()
    if (given.docs.some((d) => d.data().redoCounts === true && (d.data().everyone || (d.data().studentIds || []).includes(uid)))) counts = true
  }
  const ref = db.doc(`progress/${progressId(uid, lessonId)}`)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const p = snap.exists ? snap.data() : null
    if (!p?.finished || p.redo?.active) throw new HttpsError('failed-precondition', 'not-finished')
    if (p.sentBack && !p.sentBack.done) throw new HttpsError('failed-precondition', 'sent-back')
    const redos = [...(p.redos || []), { questions: p.questions || {}, topics: p.topics || {}, grade: p.grade || null, finishedAt: p.finishedAt || null }]
    tx.update(ref, {
      redos,
      questions: {},
      topics: {},
      grade: lessonGrade({}),
      keptGrade: counts ? null : p.keptGrade || p.grade || null,
      redo: { active: true, counts, n: redos.length },
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { counts }
  })
})

// ---------------------------------------------------------------------------------------------
// Exams (REQ-4.26, 5.23, D-65). One attempt per question, no hints, solutions or check-again
// questions; the same questions for everyone; students move between questions and change answers
// until "Submit exam". The results are kept apart, in examResults/{uid}__{lessonId}, which the
// student can read only after the teacher releases them, so nobody can pass on right answers
// while others are still taking the exam.
//
//   examSave({ lessonId, questionId, value })       save one answer while the exam is open
//   examSubmit({ lessonId })                        submit (also done for the student when the window ends)
//   releaseResults({ classId, lessonId })           the teacher releases the results
//   allowRetake({ classId, lessonId, studentId })   the teacher lets a student take the exam again

// Is the exam open for this student now? From the assignments that give it to them: opened early
// by the teacher (REQ-5.20), or inside its time window (REQ-5.23). Returns { open, end }.
async function examWindow(uid, classIds, lessonId, now = Date.now()) {
  let open = false
  let end = null
  for (const c of classIds) {
    const [given, openings] = await Promise.all([
      db.collection(`classes/${c}/assignments`).where('lessonIds', 'array-contains', lessonId).get(),
      db.collection(`classes/${c}/openings`).where('lessonId', '==', lessonId).get(),
    ])
    const mine = (d) => d.data().everyone || (d.data().studentIds || []).includes(uid)
    if (openings.docs.some(mine)) open = true
    for (const a of given.docs.filter(mine)) {
      const { examStart, examEnd } = a.data()
      if (examStart && examEnd && now >= examStart && now < examEnd) {
        open = true
        end = Math.max(end || 0, examEnd)
      }
    }
  }
  return { open, end }
}

function examValue(q, value) {
  if (q.kind === 'choice') return Array.isArray(value) && value.every((v) => typeof v === 'string') ? value.slice(0, 20) : null
  if (q.kind === 'number' || q.kind === 'open') return typeof value === 'string' ? value.slice(0, 20000) : null
  return null
}

export const examSave = onCall(async (request) => {
  const { lessonId, questionId, value } = request.data || {}
  if (!validId(lessonId) || !validId(questionId)) throw new HttpsError('invalid-argument', 'Missing details.')
  const lessonRef = db.doc(`lessons/${lessonId}`)
  const lesson = (await lessonRef.get()).data()
  if (!lesson || lesson.type !== 'exam') throw new HttpsError('not-found', 'No such exam.')
  const classIds = await access(request.auth, lesson)
  const uid = request.auth.uid
  const ref = db.doc(`progress/${progressId(uid, lessonId)}`)
  const p = (await ref.get()).data()
  if (p?.submitted) throw new HttpsError('failed-precondition', 'submitted')
  if (!(await examWindow(uid, classIds, lessonId)).open) throw new HttpsError('failed-precondition', 'closed')
  const version = p?.version || lesson.currentVersion
  const v = (await lessonRef.collection('versions').doc(String(version)).get()).data()
  const found = findQuestion(v, questionId)
  const clean = found && examValue(found.q, value)
  if (clean === null || !found) throw new HttpsError('invalid-argument', 'invalid-answer')
  await ref.set(
    { uid, lessonId, version, classIds, exam: true, examAnswers: { [questionId]: clean }, updatedAt: FieldValue.serverTimestamp(), ...(p ? {} : { startedAt: FieldValue.serverTimestamp() }) },
    { merge: true },
  )
  return { ok: true }
})

// Grades a submitted exam into examResults and raises red flags for wrong level 1 answers (REQ-1.3).
async function submitExam(uid, lessonId, lesson, classIds, studentName) {
  const ref = db.doc(`progress/${progressId(uid, lessonId)}`)
  const resultRef = db.doc(`examResults/${progressId(uid, lessonId)}`)
  const p = (await ref.get()).data() || {}
  if (p.submitted) return false
  const version = p.version || lesson.currentVersion
  const vRef = db.doc(`lessons/${lessonId}/versions/${version}`)
  const [vs, ss] = await Promise.all([vRef.get(), vRef.collection('secret').doc('answers').get()])
  const secret = ss.data().questions || {}
  const answers = p.examAnswers || {}
  const questions = {}
  const flags = []
  for (const topic of vs.data().topics) {
    for (const b of topic.blocks) {
      if (b.type !== 'question' || b.kind === 'audio') continue
      const given = answers[b.id]
      if (b.kind === 'open') {
        questions[b.id] = given && given.trim() ? { attempts: [given.trim()], result: 'pending', score: null } : { attempts: [], result: 'wrong', score: 0 }
        continue
      }
      const ok = given === undefined ? false : judge(b.kind, secret[b.id] || {}, given)
      const right = ok === true
      questions[b.id] = { attempts: given === undefined ? [] : [given], result: right ? 'correct1' : 'wrong', score: right ? 1 : 0, solution: secret[b.id]?.solution || null, correct: b.kind === 'number' ? { number: secret[b.id]?.answer } : { choices: secret[b.id]?.correct || [] } }
      if (!right && (b.level ?? 1) === 1) flags.push({ questionId: b.id, topicNumber: topic.number, topicName: topic.name || null })
    }
  }
  // Open answers' solutions are shown with the results too.
  for (const [id, st] of Object.entries(questions)) if (st.result === 'pending' || !st.solution) st.solution = secret[id]?.solution || null
  const batch = db.batch()
  batch.set(resultRef, { uid, lessonId, version, classIds, questions, grade: lessonGrade(questions), finished: true, finishedAt: FieldValue.serverTimestamp(), released: false, updatedAt: FieldValue.serverTimestamp() })
  batch.set(ref, { uid, lessonId, version, classIds, exam: true, submitted: true, finished: true, finishedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  for (const f of flags) {
    for (const classId of classIds) {
      batch.set(db.collection('flags').doc(), { classId, uid, studentName, lessonId, lessonTitle: lesson.title, kind: 'examWrong', ...f, open: true, createdAt: FieldValue.serverTimestamp() })
    }
  }
  await batch.commit()
  return true
}

export const examSubmit = onCall(async (request) => {
  const { lessonId } = request.data || {}
  if (!validId(lessonId)) throw new HttpsError('invalid-argument', 'Missing lesson.')
  const lesson = (await db.doc(`lessons/${lessonId}`).get()).data()
  if (!lesson || lesson.type !== 'exam') throw new HttpsError('not-found', 'No such exam.')
  const classIds = await access(request.auth, lesson)
  const p = (await db.doc(`progress/${progressId(request.auth.uid, lessonId)}`).get()).data()
  if (!p && !(await examWindow(request.auth.uid, classIds, lessonId)).open) throw new HttpsError('failed-precondition', 'closed')
  await submitExam(request.auth.uid, lessonId, lesson, classIds, await personName(request.auth))
  return { submitted: true }
})

// When an exam's time window has ended, answers not yet submitted are submitted (REQ-5.23).
async function submitExpired(classId, work, students) {
  const now = Date.now()
  for (const a of work.assignments) {
    if (!a.examEnd || now < a.examEnd) continue
    for (const l of a.lessonIds || []) {
      if (work.lessons[l]?.type !== 'exam') continue
      const lesson = (await db.doc(`lessons/${l}`).get()).data()
      for (const s of students) {
        if (s.removed || !(a.everyone || (a.studentIds || []).includes(s.id))) continue
        const p = (await db.doc(`progress/${progressId(s.id, l)}`).get()).data()
        if (p && !p.submitted) await submitExam(s.id, l, lesson, p.classIds || [classId], s.name)
      }
    }
  }
}

export const releaseResults = onCall(async (request) => {
  const { classId, lessonId } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  if (!validId(lessonId)) throw new HttpsError('invalid-argument', 'Missing lesson.')
  const students = await classStudents(ref)
  const snaps = await db.getAll(...students.map((s) => db.doc(`examResults/${progressId(s.id, lessonId)}`)))
  const batch = db.batch()
  let n = 0
  for (const s of snaps) {
    if (!s.exists || !(s.data().classIds || []).includes(classId)) continue
    batch.update(s.ref, { released: true, releasedAt: FieldValue.serverTimestamp() })
    n++
  }
  if (n) await batch.commit()
  return { released: n }
})

export const allowRetake = onCall(async (request) => {
  const { classId, lessonId, studentId } = request.data || {}
  await requireClassTeacher(request.auth, classId)
  if (!validId(lessonId) || !validId(studentId)) throw new HttpsError('invalid-argument', 'Missing details.')
  const resultRef = db.doc(`examResults/${progressId(studentId, lessonId)}`)
  const r = await resultRef.get()
  if (!r.exists || !(r.data().classIds || []).includes(classId)) throw new HttpsError('not-found', 'No submitted exam.')
  const { previous = [], ...last } = r.data()
  const batch = db.batch()
  batch.set(resultRef, { uid: studentId, lessonId, classIds: last.classIds, previous: [...previous, last], finished: false, released: false, questions: {}, grade: lessonGrade({}) })
  batch.update(db.doc(`progress/${progressId(studentId, lessonId)}`), { submitted: false, finished: false, examAnswers: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() })
  await batch.commit()
  return { ok: true }
})

// Removing a co-teacher from a class (REQ-5.5, D-62). A class always keeps at least one teacher.
export const removeTeacher = onCall(async (request) => {
  const { classId, teacherId } = request.data || {}
  const { ref, data } = await requireClassTeacher(request.auth, classId)
  const ids = data.teacherIds || []
  const names = data.teacherNames || []
  const i = ids.indexOf(teacherId)
  if (i < 0) throw new HttpsError('not-found', 'Not a teacher of this class.')
  if (ids.length <= 1) throw new HttpsError('failed-precondition', 'last-teacher')
  // Ids and names are kept in the same order.
  await ref.update({ teacherIds: ids.filter((_, k) => k !== i), teacherNames: names.filter((_, k) => k !== i), updatedAt: FieldValue.serverTimestamp() })
  return { ok: true, self: teacherId === request.auth.uid }
})

// Recordings are kept until the end of the school year (REQ-10.5, D-67): every day at 03:00
// (Israel time), files recorded before the last 31 July are deleted.
export function lastEndOfYear(now = new Date()) {
  const israel = new Date(now.getTime() + 3 * 3600 * 1000) // Israel summer time; precise enough for a daily run
  const y = israel.getUTCMonth() >= 7 ? israel.getUTCFullYear() : israel.getUTCFullYear() - 1
  return Date.UTC(y, 6, 31, 21, 0, 0) // 31 July, midnight in Israel (UTC+3)
}

export const deleteOldRecordings = onSchedule({ schedule: '0 3 * * *', timeZone: 'Asia/Jerusalem' }, async () => {
  const cutoff = lastEndOfYear()
  const bucket = getStorage().bucket()
  for (const prefix of ['recordings/', 'comments/']) {
    const [files] = await bucket.getFiles({ prefix })
    for (const f of files) if (new Date(f.metadata.timeCreated).getTime() < cutoff) await f.delete().catch(() => {})
  }
})

// A private link to a recording (D-67): a long random key in the address, kept only in the
// student's work, which only the student and the class's teachers can read.
async function privateLink(file) {
  const [md] = await file.getMetadata()
  let token = md.metadata?.firebaseStorageDownloadTokens?.split(',')[0]
  if (!token) {
    token = randomUUID()
    await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } })
  }
  return `https://firebasestorage.googleapis.com/v0/b/${file.bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`
}

// Checks a student's sent recording and returns its private link (REQ-6.6).
async function recordingLink(path) {
  const file = getStorage().bucket().file(path)
  const [exists] = await file.exists()
  if (!exists) throw new HttpsError('invalid-argument', 'invalid-answer')
  const [md] = await file.getMetadata()
  if (Number(md.size) > 2 * 1024 * 1024 || !String(md.contentType || '').startsWith('audio/')) throw new HttpsError('invalid-argument', 'invalid-answer')
  return privateLink(file)
}

// Saves a teacher's recorded comment (REQ-5.13), sent as base64, and returns its private link.
async function saveComment(studentId, lessonId, questionId, base64) {
  const data = Buffer.from(base64, 'base64')
  if (!data.length || data.length > 2 * 1024 * 1024) throw new HttpsError('invalid-argument', 'invalid-audio')
  const file = getStorage().bucket().file(`comments/${studentId}/${lessonId}/${questionId}/${Date.now()}.webm`)
  await file.save(data, { contentType: 'audio/webm', metadata: { metadata: { firebaseStorageDownloadTokens: randomUUID() } } })
  return privateLink(file)
}

// Agreeing to the terms of use (REQ-10.8, D-74, D-75). Saved only here, with the version the
// person saw and the time; the database rules don't let anyone write it directly.
export const acceptTerms = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.')
  const current = await db.doc('terms/current').get()
  if (!current.exists) throw new HttpsError('failed-precondition', 'no-terms')
  const version = current.data().version
  if (request.data?.version !== version) throw new HttpsError('failed-precondition', 'old-version')
  await db.doc(`users/${request.auth.uid}`).set({ termsAccepted: { version, at: FieldValue.serverTimestamp() } }, { merge: true })
  return { version }
})

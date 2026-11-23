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
import { answerCheckAgain, answerMain, isFinished, lessonFinished, lessonGrade, receives, sendBackForCorrections, teacherScore } from './check.js'
import { averageGrade, coursePosition, dueFor, lateGrade, lessonCell, levelSuggestions, median, notMastered, studentStatus, toCsv, waitingAnswers } from './dashboard.js'
import { CLASS_COLORS, WAIT_MS, afterWrong, makeCode, normalizeCode, validateCode, waitLeft } from './classcode.js'

// "public" lets the website reach the service; every call still checks who is signed in.
setGlobalOptions({ region: 'me-west1', maxInstances: 10, invoker: 'public' })
initializeApp()
const db = getFirestore()

const progressId = (uid, lessonId) => `${uid}__${lessonId}`

// The student's level for a lesson (REQ-5.18, 6.10): their level in the classes the lesson is
// given to (the highest, if several); level 2 when the teacher hasn't set one. Teachers: all (3).
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
  const progressRef = db.doc(`progress/${progressId(uid, lessonId)}`)

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
    const minimum = lesson.minimumPerTopic || 0
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
  if (!lessonFinished(v.data(), progress?.questions || {}, progress?.topics || {}, lesson.minimumPerTopic || 0, await levelFor(request.auth.uid, classIds))) return { finished: false }
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
  await requireTeacher(request.auth)
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
  const { classId, courseId, lessonIds, studentIds, grades = 'usual', order = 'paired', due = null, afterDue = 'reduce', reduceBy = 10, redoCounts = false } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
  if (!['usual', 'show', 'hide'].includes(grades)) throw new HttpsError('invalid-argument', 'Grades: usual, show or hide.')
  if (!['oneByOne', 'paired', 'any'].includes(order)) throw new HttpsError('invalid-argument', 'Order: oneByOne, paired or any.')
  if (due !== null && (!Number.isFinite(due) || due < 0)) throw new HttpsError('invalid-argument', 'Due date.')
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

async function progressMap(pairs) {
  if (!pairs.length) return {}
  const snaps = await db.getAll(...pairs.map(([uid, l]) => db.doc(`progress/${progressId(uid, l)}`)))
  return Object.fromEntries(snaps.filter((s) => s.exists).map((s) => [s.id, s.data()]))
}

export const classOverview = onCall(async (request) => {
  const classId = request.data?.classId
  const { ref, data } = await requireClassTeacher(request.auth, classId)
  const [work, students, flagSnap] = await Promise.all([classWork(ref), classStudents(ref), db.collection('flags').where('classId', '==', classId).get()])
  const current = students.filter((s) => !s.removed)
  const given = Object.fromEntries(current.map((s) => [s.id, work.givenTo(s.id)]))
  const progress = await progressMap(current.flatMap((s) => given[s.id].lessonIds.map((l) => [s.id, l])))
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
  // The assignment that sets a lesson's due date for a student (D-60): the latest one given to them
  // that includes the lesson and has a due date; otherwise the latest one that includes it.
  const ruleFor = (uid, l) => {
    const mine = work.assignments.filter((a) => (a.everyone || (a.studentIds || []).includes(uid)) && (a.lessonIds || []).includes(l)).reverse()
    return mine.find((a) => a.due || Object.keys(a.extensions || {}).length) || mine[0]
  }
  const rows = current.map((s) => {
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
        return [l, { ...cell, due, late, finishedAt, started: !!pr, sentBack: pr?.sentBack && !pr.sentBack.done ? pr.sentBack.mode : null, waiting: waitingAnswers(pr).length, tips: Object.values(pr?.tipsOpened || {}).reduce((a, b) => a + b, 0) }]
      }),
    )
    const positions = Object.fromEntries(mine.courseIds.map((c) => [c, coursePosition(work.courses.find((k) => k.courseId === c).order, (l) => p(s.id, l))]))
    const openFlags = flags.filter((f) => f.uid === s.id && f.open).length
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
      lastWorked: times.length ? Math.max(...times) : null,
      status,
      star,
    }
  })

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
    courses: work.courses.map((c) => ({ ...c, middle: middles[c.courseId] })),
    lessons: work.lessons,
    columns,
    openings: work.openings,
    students: rows,
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
      db.collection('progress').where('classIds', 'array-contains', c.id).get(),
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
  const progress = await progressMap(withLesson.map((s) => [s.id, lessonId]))
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
    questions,
    students: withLesson.map((s) => {
      const pr = progress[progressId(s.id, lessonId)]
      const states = Object.fromEntries(
        Object.entries(pr?.questions || {}).map(([id, st]) => [
          id,
          { attempts: st.attempts || [], result: st.result, score: st.score, graded: !!st.graded, changedByTeacher: !!st.changedByTeacher, teacherComment: st.teacherComment || null, checkAgain: st.checkAgain ? { result: st.checkAgain.result } : null },
        ]),
      )
      return { id: s.id, name: s.name, cell: lessonCell(pr), states, sentBack: pr?.sentBack || null, earlier: Object.fromEntries(Object.entries(pr?.history || {}).map(([q, h]) => [q, h.length])) }
    }),
  }
})

export const gradeAnswer = onCall(async (request) => {
  const { classId, lessonId, studentId, questionId, score, comment } = request.data || {}
  await requireClassTeacher(request.auth, classId)
  if (![lessonId, studentId, questionId].every(validId)) throw new HttpsError('invalid-argument', 'Missing details.')
  const ref = db.doc(`progress/${progressId(studentId, lessonId)}`)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists || !(snap.data().classIds || []).includes(classId)) throw new HttpsError('not-found', 'No such answer in this class.')
    const p = snap.data()
    const outcome = teacherScore(p.questions?.[questionId], score, comment)
    if (outcome.invalid) throw new HttpsError('invalid-argument', 'invalid-grade')
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
  if (!work.courses.some((c) => c.order.includes(lessonId))) throw new HttpsError('invalid-argument', 'The lesson is not in a course given to the class.')
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
  const { classId, lessonId, studentId, mode, questionIds, note } = request.data || {}
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
    const sentBackNow = { mode, questionIds: [], note: text || null, by: request.auth.uid, at: Date.now(), done: false }
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
  if (maxLevel >= 3) return { hidden: [] }
  const p = await db.doc(`progress/${progressId(request.auth.uid, lessonId)}`).get()
  const version = (p.exists && p.data().version) || lesson.currentVersion
  const v = (await lessonRef.collection('versions').doc(String(version)).get()).data()
  const answered = p.exists ? p.data().questions || {} : {}
  // A question already answered stays (a level lowered later applies from the next question).
  const hidden = v.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question' && !receives(b, maxLevel) && !answered[b.id]).map((b) => b.id))
  return { hidden }
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
    const correct = found.q.kind === 'number' ? { number: secret.answer } : found.q.kind === 'choice' ? { choices: secret.correct } : null
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

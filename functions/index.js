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
import { answerCheckAgain, answerMain, isFinished, lessonFinished, lessonGrade } from './check.js'
import { CLASS_COLORS, WAIT_MS, afterWrong, makeCode, normalizeCode, validateCode, waitLeft } from './classcode.js'

// "public" lets the website reach the service; every call still checks who is signed in.
setGlobalOptions({ region: 'me-west1', maxInstances: 10, invoker: 'public' })
initializeApp()
const db = getFirestore()

const progressId = (uid, lessonId) => `${uid}__${lessonId}`

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
function lastAutoQuestionId(topic) {
  const auto = topic.blocks.filter((b) => b.type === 'question' && (b.kind === 'choice' || b.kind === 'number'))
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
    if (minimum && isFinished(newState) && lastAutoQuestionId(topic) === questionId && t.correct < minimum && !t.flagged) {
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
    if (!progress?.finished && lessonFinished(vSnap.data(), nextQuestions, nextTopics, minimum)) {
      update.finished = true
      update.finishedAt = FieldValue.serverTimestamp()
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
  if (!lessonFinished(v.data(), progress?.questions || {}, progress?.topics || {}, lesson.minimumPerTopic || 0)) return { finished: false }
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
  const { classId, courseId, lessonIds, studentIds } = request.data || {}
  const { ref } = await requireClassTeacher(request.auth, classId)
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
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  })
  // Opening the lessons (and the course) to the class lets its students read them (system-design 4.3).
  if (course) batch.update(course.ref, { classIds: FieldValue.arrayUnion(classId) })
  for (const l of ids) batch.update(db.doc(`lessons/${l}`), { classIds: FieldValue.arrayUnion(classId) })
  await batch.commit()
  return { assignmentId: assignmentRef.id }
})

// Evolora checking service (system-design 5, D-17). Runs in Google Cloud, in Israel (me-west1).
// Students' browsers never hold a correct answer, hint or solution before they have earned it.
//
// Callable functions:
//   answer({ lessonId, questionId, value, checkAgain })   check one answer
//   openTip({ lessonId, questionId, tip })                note that a help tip was opened (REQ-6.15)

import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { answerCheckAgain, answerMain, isFinished, lessonGrade } from './check.js'

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

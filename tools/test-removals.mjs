#!/usr/bin/env node
// End-to-end test of removing questions for a class (REQ-5.36, D-92), on the test site, with two
// test-only lessons (tools/fixtures/removal-test-teaching-1 and removal-test-exam-1). The test loads
// them, opens them to the test class, and removes them and everything it did at the end, so no real
// lesson, student or teacher is affected.
//
//   node tools/test-removals.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'
import { loadAll } from './load.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const CLASS = 'test-class'
const LESSON = 'removal-test-teaching-1'
const EXAM = 'removal-test-exam-1'
const PEOPLE = ['test-student-3', 'test-student-4', 'test-student-5', 'test-student-6']
let failures = 0
let count = 0
function check(label, ok, detail = '') {
  count++
  if (!ok) failures++
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${label}${!ok && detail ? ` (${detail})` : ''}`)
}
async function as(uid, fn) {
  const user = TEST.users.find((u) => u.uid === uid)
  const app = initializeApp(config, `${uid}-${Date.now()}-${Math.random()}`)
  await signInWithEmailAndPassword(getAuth(app), user.email, testPassword(user))
  const db = initializeFirestore(app, {})
  const call = async (name, data) => (await httpsCallable(getFunctions(app, 'me-west1'), name)(data)).data
  try {
    return await fn({ db, call })
  } finally {
    await deleteApp(app)
  }
}
const refused = async (p) => {
  try {
    await p
    return null
  } catch (e) {
    // The reason the service gave, without the status number the website adds ("removed [400]").
    return String(e.message || e.code).replace(/\s*\[\d+\]$/, '')
  }
}

const conn = await connect('test')
const ldb = conn.db
await loadAll(conn, ['tools/fixtures/removal-test-teaching-1', 'tools/fixtures/removal-test-exam-1'], { log: () => {} })
for (const l of [LESSON, EXAM]) await updateDoc(doc(ldb, 'lessons', l), { classIds: arrayUnion(CLASS) })

const lesson = (await getDoc(doc(ldb, 'lessons', LESSON))).data()
const vRef = doc(ldb, 'lessons', LESSON, 'versions', String(lesson.currentVersion))
const version = (await getDoc(vRef)).data()
const secret = (await getDoc(doc(vRef, 'secret', 'answers'))).data().questions
const qs = version.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question'))
const byPrompt = (start) => qs.find((q) => q.prompt.startsWith(start))
const A = byPrompt('שאלה א')
const B = byPrompt('שאלה ב')
const C = byPrompt('שאלה ג')
const D = byPrompt('שאלה ד')
const E = byPrompt('שאלה ה')
const right = (q) => secret[q.id].correct
const wrong = (q) => [q.choices.find((c) => !secret[q.id].correct.includes(c.id)).id]
const examV = (await getDoc(doc(ldb, 'lessons', EXAM, 'versions', String((await getDoc(doc(ldb, 'lessons', EXAM))).data().currentVersion)))).data()
const examQ = examV.topics[0].blocks.filter((b) => b.type === 'question')
const examSecret = (await getDoc(doc(ldb, 'lessons', EXAM, 'versions', String((await getDoc(doc(ldb, 'lessons', EXAM))).data().currentVersion), 'secret', 'answers'))).data().questions
const right2 = (q) => examSecret[q.id].correct
const OPENING = 'removal-test-opening'

const cleanUp = async () => {
  for (const uid of PEOPLE) for (const l of [LESSON, EXAM]) await deleteDoc(doc(ldb, 'progress', `${uid}__${l}`)).catch(() => {})
  for (const l of [LESSON, EXAM]) await deleteDoc(doc(ldb, 'classes', CLASS, 'removals', l)).catch(() => {})
  await deleteDoc(doc(ldb, 'classes', CLASS, 'openings', OPENING)).catch(() => {})
  for (const f of (await getDocs(query(collection(ldb, 'flags'), where('classId', '==', CLASS)))).docs) if ([LESSON, EXAM].includes(f.data().lessonId)) await deleteDoc(f.ref)
}
const removeLessons = async () => {
  for (const l of [LESSON, EXAM]) {
    for (const ver of (await getDocs(collection(ldb, 'lessons', l, 'versions'))).docs) {
      for (const s of (await getDocs(collection(ver.ref, 'secret'))).docs) await deleteDoc(s.ref)
      await deleteDoc(ver.ref)
    }
    await deleteDoc(doc(ldb, 'lessons', l))
  }
}

await cleanUp()
try {
  const teacher = (fn) => as('test-teacher-1', fn)
  const set = (questionId, removed, checkAgainId = null, lessonId = LESSON) => teacher(({ call }) => call('setRemoval', { classId: CLASS, lessonId, questionId, checkAgainId, removed }))

  console.log('What the teacher sees (REQ-5.36)')
  const info0 = await teacher(({ call }) => call('removalInfo', { classId: CLASS, lessonId: LESSON }))
  check('nothing is removed at first, and nobody has answered', info0.questions.length === 0 && Object.values(info0.answered).every((n) => n === 0))
  check('question A shows its 2 replacement questions', info0.checkAgainBank[A.id]?.length === 2)
  check('a teacher of another class cannot remove questions', !!(await refused(as('test-teacher-2', ({ call }) => call('setRemoval', { classId: CLASS, lessonId: LESSON, questionId: B.id, removed: true })))))

  console.log('Removing a question nobody answered')
  await set(B.id, true)
  await as('test-student-3', async ({ call }) => {
    const v = await call('lessonView', { lessonId: LESSON })
    check('the student no longer gets the question', v.hidden.includes(B.id))
    const why = await refused(call('answer', { lessonId: LESSON, questionId: B.id, value: right(B) }))
    check('answering it anyway is refused', why === 'removed', why)
  })
  await as('test-student-3', async ({ db }) => {
    const blocked = await refused(getDoc(doc(db, 'classes', CLASS, 'removals', LESSON)))
    check("a student can't read what was removed directly", !!blocked)
  })

  console.log("A topic's minimum drops when too few questions are left")
  let info = await teacher(({ call }) => call('removalInfo', { classId: CLASS, lessonId: LESSON }))
  check('with B removed, A and the extra question C are left: the minimum stays 2', info.minimumByTopic['1'] === 2 && info.minimum === 2)
  await set(A.id, true)
  info = await teacher(({ call }) => call('removalInfo', { classId: CLASS, lessonId: LESSON }))
  check('with A removed too, only C is left: the minimum drops to 1', info.minimumByTopic['1'] === 1)
  await as('test-student-3', async ({ call }) => {
    const v = await call('lessonView', { lessonId: LESSON })
    check('the student gets the lowered minimum', v.minimumByTopic['1'] === 1)
  })
  await set(A.id, false)
  await set(B.id, false)

  console.log('Answers already given stop counting, and count again when the question comes back')
  await as('test-student-4', async ({ call }) => {
    await call('answer', { lessonId: LESSON, questionId: A.id, value: right(A) })
    await call('answer', { lessonId: LESSON, questionId: B.id, value: wrong(B) })
    await call('answer', { lessonId: LESSON, questionId: B.id, value: wrong(B) })
  })
  const gradeOf = async (uid) => (await getDoc(doc(ldb, 'progress', `${uid}__${LESSON}`))).data().grade
  check('before removing: A right, B wrong, 50%', (await gradeOf('test-student-4')).percent === 50)
  info = await teacher(({ call }) => call('removalInfo', { classId: CLASS, lessonId: LESSON }))
  check('the teacher sees that 1 student answered B', info.answered[B.id] === 1)
  await set(B.id, true)
  check('B removed: the grade counts only A, 100%', (await gradeOf('test-student-4')).percent === 100)
  const progress4 = (await getDoc(doc(ldb, 'progress', `test-student-4__${LESSON}`))).data()
  check('the answer to B is still saved', !!progress4.questions[B.id]?.result)
  await set(B.id, false)
  check('B back: the grade is 50% again', (await gradeOf('test-student-4')).percent === 50)

  console.log('Replacement (check-again) questions')
  const [ca1, ca2] = secret[A.id].checkAgain
  await set(A.id, true, ca1.id)
  await as('test-student-5', async ({ call }) => {
    await call('answer', { lessonId: LESSON, questionId: A.id, value: wrong(A) })
    const r = await call('answer', { lessonId: LESSON, questionId: A.id, value: wrong(A) })
    check('with one replacement removed, the student gets the other one', r.reply.checkAgain?.id === ca2.id, r.reply.checkAgain?.id)
  })
  await set(A.id, true, ca2.id)
  await as('test-student-6', async ({ call }) => {
    await call('answer', { lessonId: LESSON, questionId: A.id, value: wrong(A) })
    const r = await call('answer', { lessonId: LESSON, questionId: A.id, value: wrong(A) })
    check('with every replacement removed, the student sees the solution and moves on', r.reply.result === 'wrong' && !r.reply.checkAgain && !!r.reply.solution)
  })
  info = await teacher(({ call }) => call('removalInfo', { classId: CLASS, lessonId: LESSON }))
  check('the teacher sees both replacements of A removed', (info.checkAgain[A.id] || []).length === 2)
  await set(A.id, false, ca1.id)
  await set(A.id, false, ca2.id)

  console.log('Removing questions finishes the lesson for a student who answered all the rest')
  await as('test-student-3', async ({ call }) => {
    for (const q of [A, B]) await call('answer', { lessonId: LESSON, questionId: q.id, value: right(q) })
    await call('answer', { lessonId: LESSON, questionId: qs.find((q) => q.kind === 'open').id, value: 'חיבור הוא לשים יחד.' })
    await call('answer', { lessonId: LESSON, questionId: D.id, value: right(D) })
  })
  check('E not answered yet: the lesson is not finished', !(await getDoc(doc(ldb, 'progress', `test-student-3__${LESSON}`))).data().finished)
  await set(E.id, true)
  check('E removed: the lesson is finished', (await getDoc(doc(ldb, 'progress', `test-student-3__${LESSON}`))).data().finished === true)
  await set(E.id, false)

  console.log('Exams: only until a student starts')
  await set(examQ[1].id, true, null, EXAM)
  await as('test-student-3', async ({ call }) => {
    const v = await call('lessonView', { lessonId: EXAM })
    check('a question removed from an exam is hidden from the student', v.hidden.includes(examQ[1].id))
  })
  // A student starts the exam, as a student does: it is opened early for them, and they save an answer.
  await setDoc(doc(ldb, 'classes', CLASS, 'openings', OPENING), { lessonId: EXAM, everyone: false, studentIds: ['test-student-4'] })
  await as('test-student-4', ({ call }) => call('examSave', { lessonId: EXAM, questionId: examQ[0].id, value: right2(examQ[0]) }))
  const examInfo = await teacher(({ call }) => call('removalInfo', { classId: CLASS, lessonId: EXAM }))
  check('after a student started, the exam is locked for the teacher', examInfo.locked === true)
  check('removing then is refused', (await refused(set(examQ[0].id, true, null, EXAM))) === 'examStarted')
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
  await removeLessons()
}
console.log(`\n${count - failures} of ${count} question removal tests passed.`)
finish(failures ? 1 : 0)

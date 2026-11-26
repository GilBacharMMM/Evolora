#!/usr/bin/env node
// End-to-end test of exams (REQ-4.26, 5.23) on the test site, with the demo exam circles-exam-1.
// Run after loading it (node tools/load.mjs lessons/circles-exam-1). Cleans up after itself.
//
//   node tools/test-exams.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, query, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const CLASS = 'test-class'
const EXAM = 'circles-exam-1'
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
  const fns = getFunctions(app, 'me-west1')
  const call = async (name, data) => (await httpsCallable(fns, name)(data)).data
  try { return await fn({ db, call }) } finally { await deleteApp(app) }
}
const fails = async (action, code) => { try { await action(); return false } catch (e) { return !code || e.code === code || e.message === code } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const loader = await connect('test')
const ldb = loader.db
const lesson = (await getDoc(doc(ldb, 'lessons', EXAM))).data()
const v = String(lesson.currentVersion)
const version = (await getDoc(doc(ldb, 'lessons', EXAM, 'versions', v))).data()
const secret = (await getDoc(doc(ldb, 'lessons', EXAM, 'versions', v, 'secret', 'answers'))).data().questions
const questions = version.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question'))
// Fill in the blanks (REQ-4.30): 3 of the 4 blanks right, to check credit per blank (D-78).
const right = (q) => (q.kind === 'blanks' ? secret[q.id].correct.map((c, i) => (i === 3 ? 'טעות' : String(c).split('|')[0])) : q.kind === 'choice' ? secret[q.id].correct : q.kind === 'number' ? String(secret[q.id].answer) : 'π is the circumference divided by the diameter.')
const STUDENTS = ['test-student-1', 'test-student-3', 'test-student-4', 'test-student-5']

async function cleanUp() {
  for (const uid of STUDENTS) {
    await deleteDoc(doc(ldb, 'progress', `${uid}__${EXAM}`))
    await deleteDoc(doc(ldb, 'examResults', `${uid}__${EXAM}`))
  }
  for (const a of (await getDocs(collection(ldb, 'classes', CLASS, 'assignments'))).docs) if (a.data().createdBy !== 'evolora-loader') await deleteDoc(a.ref)
  for (const o of (await getDocs(collection(ldb, 'classes', CLASS, 'openings'))).docs) await deleteDoc(o.ref)
  for (const f of (await getDocs(query(collection(ldb, 'flags'), where('lessonId', '==', EXAM)))).docs) await deleteDoc(f.ref)
}

await cleanUp()
try {
  const now = Date.now()
  await as('test-teacher-1', async ({ call }) => {
    check('an exam window that ends before it starts is refused', await fails(() => call('assign', { classId: CLASS, lessonIds: [EXAM], studentIds: null, examStart: now, examEnd: now - 1000 })))
    // Students 1, 3 and 5: a window open now for 40 seconds, locking the class. Student 4: no window.
    await call('assign', { classId: CLASS, lessonIds: [EXAM], studentIds: ['test-student-1', 'test-student-3', 'test-student-5'], examStart: now - 60_000, examEnd: now + 40_000, examTimer: true, examLock: 'class' })
    await call('assign', { classId: CLASS, lessonIds: [EXAM], studentIds: ['test-student-4'] })
  })

  console.log('Taking the exam (REQ-4.26)')
  await as('test-student-1', async ({ db, call }) => {
    check('the exam can\'t be answered like a lesson (no hints, no second attempt)', await fails(() => call('answer', { lessonId: EXAM, questionId: questions[0].id, value: right(questions[0]) }), 'functions/failed-precondition'))
    const wrongNumber = questions.find((q) => q.kind === 'number')
    await call('examSave', { lessonId: EXAM, questionId: wrongNumber.id, value: '1' })
    await call('examSave', { lessonId: EXAM, questionId: wrongNumber.id, value: '2' })
    const p = (await getDoc(doc(db, 'progress', `test-student-1__${EXAM}`))).data()
    check('answers are saved and can be changed before submitting', p.examAnswers[wrongNumber.id] === '2' && !p.submitted)
    for (const q of questions.filter((x) => x.id !== wrongNumber.id)) await call('examSave', { lessonId: EXAM, questionId: q.id, value: right(q) })
    check('the saved answers hold no right or wrong', !JSON.stringify(p).includes('correct'))
    await call('examSubmit', { lessonId: EXAM })
    check('after "Submit exam", answers can\'t be changed', await fails(() => call('examSave', { lessonId: EXAM, questionId: wrongNumber.id, value: '3' }), 'functions/failed-precondition'))
    check('before the results are released, the student can\'t see them', await fails(() => getDoc(doc(db, 'examResults', `test-student-1__${EXAM}`))))
  })
  check('a level 1 and a level 3 student get the same exam questions (levels don\'t apply)', await as('test-student-5', async ({ call }) => (await call('lessonView', { lessonId: EXAM })).hidden.length === 0) && (await as('test-student-1', async ({ call }) => (await call('lessonView', { lessonId: EXAM })).hidden.length === 0)))
  check('an exam without a window stays locked until the teacher opens it', await as('test-student-4', ({ call }) => fails(() => call('examSave', { lessonId: EXAM, questionId: questions[0].id, value: right(questions[0]) }), 'functions/failed-precondition')))
  await as('test-teacher-1', ({ call }) => call('openEarly', { classId: CLASS, lessonId: EXAM, studentIds: ['test-student-4'] }))
  await as('test-student-4', async ({ call }) => {
    await call('examSave', { lessonId: EXAM, questionId: questions[0].id, value: right(questions[0]) })
    check('after the teacher opens it, the student can answer', true)
  })

  console.log('Results and red flags')
  await as('test-teacher-1', async ({ call }) => {
    const r = await call('lessonResults', { classId: CLASS, lessonId: EXAM })
    const s1 = r.students.find((s) => s.id === 'test-student-1')
    check('the teacher sees the submitted exam with each answer checked', r.isExam && s1.submitted && Object.values(s1.states).some((st) => st.result === 'wrong'))
    const flags = (await call('classOverview', { classId: CLASS })).flags.filter((f) => f.lessonId === EXAM && f.uid === 'test-student-1')
    check('a wrong level 1 answer in the exam raises a red flag', flags.some((f) => f.kind === 'examWrong'))
    await call('releaseResults', { classId: CLASS, lessonId: EXAM })
  })
  await as('test-student-1', async ({ db }) => {
    const res = (await getDoc(doc(db, 'examResults', `test-student-1__${EXAM}`))).data()
    const blanksQ = questions.find((q) => q.kind === 'blanks')
    check('fill in the blanks in an exam: 3 of 4 blanks right gives 75% of the question, shown after release (REQ-4.30)', !!blanksQ && res.questions[blanksQ.id]?.score === 0.75 && res.questions[blanksQ.id]?.result === 'partial' && res.questions[blanksQ.id]?.correct?.blanks?.length === 4, JSON.stringify(blanksQ && res.questions[blanksQ.id]))
    check('after release, the student sees the grade, the correct answers and the solutions', res.released && res.grade && Object.values(res.questions).some((st) => st.result === 'wrong' && st.correct && st.solution))
  })

  console.log('Time window and retake (REQ-5.23)')
  await as('test-student-3', ({ call }) => call('examSave', { lessonId: EXAM, questionId: questions[0].id, value: right(questions[0]) }))
  const wait = now + 42_000 - Date.now()
  if (wait > 0) await sleep(wait)
  check('after the window ends, the exam can\'t be answered', await as('test-student-5', ({ call }) => fails(() => call('examSave', { lessonId: EXAM, questionId: questions[0].id, value: right(questions[0]) }), 'functions/failed-precondition')))
  await as('test-teacher-1', async ({ call }) => {
    const r = await call('lessonResults', { classId: CLASS, lessonId: EXAM })
    check('a student still working when the window ended has their answers submitted, and the teacher sees them', r.students.find((s) => s.id === 'test-student-3')?.submitted === true)
    await call('allowRetake', { classId: CLASS, lessonId: EXAM, studentId: 'test-student-1' })
  })
  const p1 = (await getDoc(doc(ldb, 'progress', `test-student-1__${EXAM}`))).data()
  check('after "Allow a retake", the student starts again with no answers', p1.submitted === false && !p1.examAnswers)
  const r1 = (await getDoc(doc(ldb, 'examResults', `test-student-1__${EXAM}`))).data()
  check('the earlier attempt is kept for the teacher', r1.previous?.length === 1)
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
}

console.log(`\n${count - failures} of ${count} exam tests passed.`)
finish(failures ? 1 : 0)

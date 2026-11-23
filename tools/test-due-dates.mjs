#!/usr/bin/env node
// End-to-end test of course orders and due dates on the test site (REQ-5.8, 5.9, D-60).
// Which lessons are open in each order is tested in functions/order.test.js.
// Run after tools/reset-test-site.mjs. It cleans up its own work at the end.
//
//   node tools/test-due-dates.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, query, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig } from './lib/connect.mjs'
import { soloTeacher } from './lib/test-helpers.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const CLASS = 'test-class'
const LESSON = 'circles-practice'
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
  await signInWithEmailAndPassword(getAuth(app), user.email, TEST.password)
  const db = initializeFirestore(app, {})
  const fns = getFunctions(app, 'me-west1')
  const call = async (name, data) => (await httpsCallable(fns, name)(data)).data
  try { return await fn({ db, call }) } finally { await deleteApp(app) }
}

async function refused(action) {
  try { await action(); return false } catch (e) { return ['functions/permission-denied', 'functions/invalid-argument'].includes(e.code) }
}

const loader = await connect('test')
const ldb = loader.db
async function cleanUp() {
  for (const uid of ['test-student-5', 'test-student-6']) await deleteDoc(doc(ldb, 'progress', `${uid}__${LESSON}`))
  for (const a of (await getDocs(collection(ldb, 'classes', CLASS, 'assignments'))).docs) if (a.data().createdBy !== 'evolora-loader') await deleteDoc(a.ref)
  for (const f of (await getDocs(query(collection(ldb, 'flags'), where('classId', '==', CLASS)))).docs) await deleteDoc(f.ref)
}

const restoreTeachers = await soloTeacher(ldb, CLASS)
await cleanUp()
const lesson = (await getDoc(doc(ldb, 'lessons', LESSON))).data()
const v = String(lesson.currentVersion)
const version = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v))).data()
const secret = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v, 'secret', 'answers'))).data().questions
const questions = version.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question' && b.kind !== 'audio'))
const hasOpen = questions.some((q) => q.kind === 'open')
const hourAgo = Date.now() - 3600_000

try {
  let assignmentId
  await as('test-teacher-1', async ({ call }) => {
    check('an unknown course order is refused', await refused(() => call('assign', { classId: CLASS, lessonIds: [LESSON], studentIds: null, order: 'random' })))
    check('taking off more than 100 points is refused', await refused(() => call('assign', { classId: CLASS, lessonIds: [LESSON], studentIds: null, due: hourAgo, afterDue: 'reduce', reduceBy: 150 })))
    assignmentId = (await call('assign', { classId: CLASS, lessonIds: [LESSON], studentIds: ['test-student-5', 'test-student-6'], order: 'paired', due: hourAgo, afterDue: 'reduce', reduceBy: 10 })).assignmentId
    const o = await call('classOverview', { classId: CLASS })
    const s5 = o.students.find((s) => s.id === 'test-student-5')
    check('a student with an unfinished lesson past its due date shows yellow ("late")', s5.status === 'yellow', s5.status)
    check('a student without that lesson does not', o.students.find((s) => s.id === 'test-student-1').status === 'green')
  })
  await as('test-student-5', async ({ db, call }) => {
    const a = (await getDocs(query(collection(db, 'classes', CLASS, 'assignments'), where('studentIds', 'array-contains', 'test-student-5')))).docs.find((d) => d.id === assignmentId)
    check('the student reads the order and the due date', a?.data().order === 'paired' && a.data().due === hourAgo && a.data().afterDue === 'reduce')
    for (const q of questions) await call('answer', { lessonId: LESSON, questionId: q.id, value: q.kind === 'choice' ? secret[q.id].correct : q.kind === 'number' ? String(secret[q.id].answer) : 'My answer.' })
  })
  await as('test-teacher-1', async ({ call }) => {
    const o = await call('classOverview', { classId: CLASS })
    const cell = o.students.find((s) => s.id === 'test-student-5').cells[LESSON]
    if (hasOpen) check('a late lesson with open answers stays pending until graded', cell.kind === 'pending')
    else check('a lesson finished late gets 10 points off (100 → 90)', cell.kind === 'grade' && cell.percent === 90 && cell.late === true, JSON.stringify(cell))
    await call('setDue', { classId: CLASS, assignmentId, due: Date.now() + 7 * 86400_000, studentId: 'test-student-6' })
    const after = await call('classOverview', { classId: CLASS })
    const c6 = after.students.find((s) => s.id === 'test-student-6')
    check('the due date extended for one student: they are no longer late', c6.cells[LESSON].late === false && c6.status !== 'yellow', JSON.stringify(c6.cells[LESSON]))
    check('the others keep the original due date', after.students.find((s) => s.id === 'test-student-5').cells[LESSON].due === hourAgo)
    await call('setDue', { classId: CLASS, assignmentId, due: null })
    const none = await call('classOverview', { classId: CLASS })
    check('removing the due date for the whole class: nothing is late', !none.students.find((s) => s.id === 'test-student-5').cells[LESSON].late)
  })
  check('another teacher cannot change the due date', await as('test-teacher-2', ({ call }) => refused(() => call('setDue', { classId: CLASS, assignmentId: 'x', due: null }))))
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
  await restoreTeachers()
}

console.log(`\n${count - failures} of ${count} order and due date tests passed.`)
finish(failures ? 1 : 0)

#!/usr/bin/env node
// End-to-end test of the count of answers sent back for corrections (REQ-5.34, D-73, D-75), and
// of saving the time of each answer attempt (for REQ-5.33). It cleans up its own work at the end.
//
//   node tools/test-sent-back.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, initializeFirestore, query, updateDoc, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'
import { soloTeacher } from './lib/test-helpers.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const CLASS = 'test-class'
const STUDENT = 'test-student-4'
const LESSONS = ['circles-teaching', 'circles-practice']
const COURSE = 'circles-demo'
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

const loader = await connect('test')
const ldb = loader.db

// A level 1 multiple choice question in each lesson, with its right answer.
async function firstChoice(lessonId) {
  const lesson = (await getDoc(doc(ldb, 'lessons', lessonId))).data()
  const v = String(lesson.currentVersion)
  const version = (await getDoc(doc(ldb, 'lessons', lessonId, 'versions', v))).data()
  const secret = (await getDoc(doc(ldb, 'lessons', lessonId, 'versions', v, 'secret', 'answers'))).data().questions
  const q = version.topics.flatMap((t) => t.blocks).find((b) => b.type === 'question' && b.kind === 'choice' && (b.level ?? 1) === 1)
  return { id: q.id, right: secret[q.id].correct }
}

const classRef = doc(ldb, 'classes', CLASS)
const limitBefore = (await getDoc(classRef)).data().sentBackWarnAt
async function cleanUp() {
  for (const l of LESSONS) await deleteDoc(doc(ldb, 'progress', `${STUDENT}__${l}`))
  for (const f of (await getDocs(query(collection(ldb, 'flags'), where('uid', '==', STUDENT)))).docs) await deleteDoc(f.ref)
}

const restoreTeachers = await soloTeacher(ldb, CLASS)
await cleanUp()
try {
  const qa = await firstChoice(LESSONS[0])
  const qb = await firstChoice(LESSONS[1])
  const answer = (lessonId, q) => as(STUDENT, ({ call }) => call('answer', { lessonId, questionId: q.id, value: q.right }))
  const sendBack = (lessonId, q) => as('test-teacher-1', ({ call }) => call('sendBack', { classId: CLASS, lessonId, studentId: STUDENT, mode: 'corrections', questionIds: [q.id], note: 'Please look again.' }))
  const row = () => as('test-teacher-1', async ({ call }) => (await call('classOverview', { classId: CLASS })).students.find((s) => s.id === STUDENT))

  console.log('Answer times (for REQ-5.33)')
  const first = await answer(LESSONS[0], qa)
  check('an answer attempt saves its time', Array.isArray(first.state.answeredAt) && first.state.answeredAt.length === 1 && Math.abs(first.state.answeredAt[0] - Date.now()) < 120000)

  console.log('Counting (REQ-5.34)')
  await sendBack(LESSONS[0], qa)
  await answer(LESSONS[0], qa)
  await sendBack(LESSONS[0], qa)
  await answer(LESSONS[1], qb)
  await sendBack(LESSONS[1], qb)
  await as('test-teacher-1', ({ call }) => call('sendBack', { classId: CLASS, lessonId: LESSONS[0], studentId: STUDENT, mode: 'review' }).catch(() => null))
  const r = await row()
  check('sent back twice in one lesson: the lesson shows 2', r.cells[LESSONS[0]].sentBackCount === 2, String(r.cells[LESSONS[0]].sentBackCount))
  check('sent back once in another lesson of the course: it shows 1', r.cells[LESSONS[1]].sentBackCount === 1)
  check('the course total is 3', r.sentBackTotals[COURSE] === 3, JSON.stringify(r.sentBackTotals))

  console.log('The warning (REQ-5.34)')
  await updateDoc(classRef, { sentBackWarnAt: deleteField() })
  const d = await as('test-teacher-1', ({ call }) => call('classOverview', { classId: CLASS }))
  check('the default warning number is 10', d.sentBackWarnAt === 10)
  check('with 3 in the course and the default of 10, there is no warning', !d.students.find((s) => s.id === STUDENT).sentBackWarnings.includes(COURSE))
  await as('test-teacher-1', async ({ call }) => {
    let bad = false
    try { await call('setSentBackLimit', { classId: CLASS, limit: 0 }) } catch (e) { bad = e.code === 'functions/invalid-argument' }
    check('a warning number below 1 is refused', bad)
    await call('setSentBackLimit', { classId: CLASS, limit: 3 })
  })
  const after = await row()
  check('after the teacher changes the number to 3, the warning shows at once', after.sentBackWarnings.includes(COURSE))
  await as('test-teacher-1', ({ call }) => call('setSentBackLimit', { classId: CLASS, limit: 4 }))
  check('at 4, it doesn\'t show for 3', !(await row()).sentBackWarnings.includes(COURSE))
  const other = await as('test-teacher-2', async ({ call }) => { try { await call('setSentBackLimit', { classId: CLASS, limit: 5 }); return false } catch (e) { return e.code === 'functions/permission-denied' } })
  check('a teacher of another class cannot change the number', other)
  const student = await as(STUDENT, async ({ call }) => { try { await call('setSentBackLimit', { classId: CLASS, limit: 5 }); return false } catch (e) { return ['functions/permission-denied', 'functions/unauthenticated'].includes(e.code) } })
  check('a student cannot change the number', student)
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
  await updateDoc(classRef, { sentBackWarnAt: limitBefore ?? deleteField() })
  await restoreTeachers()
}

console.log(`\n${count - failures} of ${count} sent-back count tests passed.`)
finish(failures ? 1 : 0)

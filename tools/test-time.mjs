#!/usr/bin/env node
// End-to-end test of time on lessons and time away (REQ-5.33, D-73, D-76), and of the class
// language (REQ-9.5, D-76). The browser's own rules for "away" are tested in functions/time.test.js.
// It cleans up its own work at the end.
//
//   node tools/test-time.mjs

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
const STUDENT = 'test-student-5'
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
  await signInWithEmailAndPassword(getAuth(app), user.email, testPassword(user))
  const db = initializeFirestore(app, {})
  const fns = getFunctions(app, 'me-west1')
  const call = async (name, data) => (await httpsCallable(fns, name)(data)).data
  try { return await fn({ db, call }) } finally { await deleteApp(app) }
}
const refusedWith = async (codes, action) => { try { await action(); return false } catch (e) { return codes.includes(e.code) } }

const loader = await connect('test')
const ldb = loader.db
const classRef = doc(ldb, 'classes', CLASS)
const before = (await getDoc(classRef)).data()
const timeRef = doc(ldb, 'lessonTime', `${STUDENT}__${LESSON}`)
async function cleanUp() {
  await deleteDoc(timeRef)
  await deleteDoc(doc(ldb, 'progress', `${STUDENT}__${LESSON}`))
  for (const f of (await getDocs(query(collection(ldb, 'flags'), where('uid', '==', STUDENT)))).docs) await deleteDoc(f.ref)
}
const restoreTeachers = await soloTeacher(ldb, CLASS)
await cleanUp()
await updateDoc(classRef, { awayWarnAt: deleteField() })
try {
  console.log('Time on a lesson (REQ-5.33)')
  await as(STUDENT, async ({ call, db }) => {
    const r = await call('lessonTime', { lessonId: LESSON, netMs: 15000, away: 0, opened: true })
    check('the first report is counted', r.counted === true)
    await call('lessonTime', { lessonId: LESSON, netMs: 999999, away: 2 })
    const t = (await getDoc(doc(db, 'lessonTime', `${STUDENT}__${LESSON}`))).data()
    check('working time can\'t be more than the real time between reports', t.netMs < 15000 + 20000, String(t.netMs))
    check('times away are added up', t.awayCount === 2)
    check('the student can read their own time', !!t.firstAt)
    await call('lessonTime', { lessonId: LESSON, netMs: 0, away: 0, opened: true })
    check('opening the lesson again after an earlier sitting counts as one more time away', (await getDoc(doc(db, 'lessonTime', `${STUDENT}__${LESSON}`))).data().awayCount === 3)
    check('a wrong report is refused', await refusedWith(['functions/invalid-argument'], () => call('lessonTime', { lessonId: LESSON, netMs: -5, away: 0 })))
  })
  check('another student cannot read it', await as('test-student-1', ({ db }) => refusedWith(['permission-denied'], () => getDoc(doc(db, 'lessonTime', `${STUDENT}__${LESSON}`)))))
  check('a teacher trying the lesson is not measured', await as('test-teacher-1', async ({ call }) => (await call('lessonTime', { lessonId: LESSON, netMs: 1000, away: 0, opened: true })).counted === false))
  check('a student without the lesson is refused', await as('test-student-7', ({ call }) => refusedWith(['functions/permission-denied', 'functions/failed-precondition'], () => call('lessonTime', { lessonId: LESSON, netMs: 1000, away: 0 }))))

  const row = async () => (await as('test-teacher-1', ({ call }) => call('classOverview', { classId: CLASS })))
  let o = await row()
  let me = o.students.find((s) => s.id === STUDENT)
  const time = me.cells[LESSON].time
  check('the teacher sees total time, net time, times away and time away', !!time && time.awayCount === 3 && time.netMs > 0 && time.totalMs >= time.netMs && time.awayMs === time.totalMs - time.netMs, JSON.stringify(time))
  check('the default number is 5', o.awayWarnAt === 5)
  check('3 times away is not "away a lot"', !me.awayLessons.includes(LESSON))

  console.log('Away a lot (REQ-5.33)')
  await as(STUDENT, ({ call }) => call('lessonTime', { lessonId: LESSON, netMs: 1000, away: 3 }))
  o = await row()
  me = o.students.find((s) => s.id === STUDENT)
  check('6 times away, above the default 5: the dashboard shows "away a lot"', me.awayLessons.includes(LESSON))
  const flags = o.flags.filter((f) => f.uid === STUDENT && f.kind === 'awayALot' && f.open)
  check('and the teacher gets one red flag for that lesson', flags.length === 1 && flags[0].lessonId === LESSON && flags[0].awayCount === 6, JSON.stringify(flags))
  await as(STUDENT, ({ call }) => call('lessonTime', { lessonId: LESSON, netMs: 1000, away: 1 }))
  check('more times away don\'t raise a second flag', (await row()).flags.filter((f) => f.uid === STUDENT && f.kind === 'awayALot').length === 1)
  await as('test-teacher-1', ({ call }) => call('setAwayLimit', { classId: CLASS, limit: 10 }))
  o = await row()
  check('with the number changed to 10, the sign goes away', o.awayWarnAt === 10 && !o.students.find((s) => s.id === STUDENT).awayLessons.includes(LESSON))
  check('a student cannot change the number', await as(STUDENT, ({ call }) => refusedWith(['functions/permission-denied'], () => call('setAwayLimit', { classId: CLASS, limit: 50 }))))
  check('a number out of range is refused', await as('test-teacher-1', ({ call }) => refusedWith(['functions/invalid-argument'], () => call('setAwayLimit', { classId: CLASS, limit: 0 }))))

  console.log('Class language (REQ-9.5)')
  await as('test-teacher-1', async ({ call }) => {
    check('a wrong language is refused', await refusedWith(['functions/invalid-argument'], () => call('setClassLanguage', { classId: CLASS, language: 'fr', required: true })))
    await call('setClassLanguage', { classId: CLASS, language: 'en', required: true })
  })
  const lang = await as(STUDENT, async ({ db }) => (await getDoc(doc(db, 'classes', CLASS))).data().language)
  check('the class\'s students see the class language: English, required', lang?.code === 'en' && lang.required === true, JSON.stringify(lang))
  check('a student cannot change it', await as(STUDENT, ({ call }) => refusedWith(['functions/permission-denied'], () => call('setClassLanguage', { classId: CLASS, language: 'he', required: false }))))
  await as('test-teacher-1', ({ call }) => call('setClassLanguage', { classId: CLASS, language: null }))
  check('"none" takes the class language away', !(await getDoc(classRef)).data().language)
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
  await updateDoc(classRef, { awayWarnAt: before.awayWarnAt ?? deleteField(), language: before.language ?? deleteField() })
  await restoreTeachers()
}

console.log(`\n${count - failures} of ${count} time and class language tests passed.`)
finish(failures ? 1 : 0)

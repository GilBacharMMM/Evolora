#!/usr/bin/env node
// End-to-end test of correcting an open answer that was sent back (REQ-5.14, D-77): the student
// keeps their last answer with the teacher's marks and comment, sends a new answer once, the
// teacher sees both, and each sending back is counted (REQ-5.34). Cleans up after itself.
//
//   node tools/test-corrections.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { deleteDoc, doc, getDoc, initializeFirestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'
import { soloTeacher } from './lib/test-helpers.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const CLASS = 'test-class'
const LESSON = 'circles-teaching-1'
const STUDENT = 'test-student-6'
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
  try { return await fn({ db, call }) } finally { await deleteApp(app) }
}

const { db: ldb } = await connect('test')
const lesson = (await getDoc(doc(ldb, 'lessons', LESSON))).data()
const version = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', String(lesson.currentVersion)))).data()
const q = version.topics.flatMap((t) => t.blocks).find((b) => b.type === 'question' && b.kind === 'open')
const pref = doc(ldb, 'progress', `${STUDENT}__${LESSON}`)
const restoreTeachers = await soloTeacher(ldb, CLASS)
await deleteDoc(pref)
const MARKUP = 'v2:' + JSON.stringify([['s', 'The radius is ', 0], ['r', 'twice', 0], ['a', 'half', 0], ['s', ' the diameter.', 1]])
try {
  await as(STUDENT, ({ call }) => call('answer', { lessonId: LESSON, questionId: q.id, value: 'The radius is twice the diameter.' }))
  await as('test-teacher-1', async ({ call }) => {
    await call('gradeAnswer', { classId: CLASS, lessonId: LESSON, studentId: STUDENT, questionId: q.id, score: 0.5, comment: 'Look at the drawing again.', markup: MARKUP })
    await call('sendBack', { classId: CLASS, lessonId: LESSON, studentId: STUDENT, mode: 'corrections', questionIds: [q.id], note: 'Fix it please.' })
  })

  console.log('The student (D-77)')
  await as(STUDENT, async ({ db, call }) => {
    const p = (await getDoc(doc(db, 'progress', `${STUDENT}__${LESSON}`))).data()
    const last = p.history?.[q.id]?.at(-1)
    check('the question is open to answer again', !p.questions?.[q.id])
    check('the student still has their last answer with the teacher\'s marks and comment', last?.attempts?.[0] === 'The radius is twice the diameter.' && last.markup === MARKUP && last.teacherComment === 'Look at the drawing again.')
    const r = await call('answer', { lessonId: LESSON, questionId: q.id, value: 'The radius is half the diameter.' })
    check('the new answer waits for grading', r.state.result === 'pending' && r.state.attempts.length === 1)
    const again = await call('answer', { lessonId: LESSON, questionId: q.id, value: 'A third try.' })
    check('it is sent once: no second attempt', again.reply.already === true)
  })

  console.log('The teacher (D-77)')
  await as('test-teacher-1', async ({ call }) => {
    const r = await call('lessonResults', { classId: CLASS, lessonId: LESSON })
    const s = r.students.find((x) => x.id === STUDENT)
    check('the grading page gets the last answer with its marks and comment', s.previous?.[q.id]?.answer === 'The radius is twice the diameter.' && s.previous[q.id].markup === MARKUP && s.previous[q.id].teacherComment === 'Look at the drawing again.')
    check('and the new answer to mark up and grade', s.states[q.id]?.attempts?.[0] === 'The radius is half the diameter.' && s.states[q.id].result === 'pending')
    await call('sendBack', { classId: CLASS, lessonId: LESSON, studentId: STUDENT, mode: 'corrections', questionIds: [q.id] })
    const o = await call('classOverview', { classId: CLASS })
    check('sending it back again is counted again (REQ-5.34)', o.students.find((x) => x.id === STUDENT).cells[LESSON].sentBackCount === 2)
    const r2 = await call('lessonResults', { classId: CLASS, lessonId: LESSON })
    check('after the second sending back, the last answer is the newer one', r2.students.find((x) => x.id === STUDENT).previous?.[q.id]?.answer === 'The radius is half the diameter.')
  })
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await deleteDoc(pref)
  await restoreTeachers()
}
console.log(`\n${count - failures} of ${count} correction tests passed.`)
finish(failures ? 1 : 0)

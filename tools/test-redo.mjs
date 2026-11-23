#!/usr/bin/env node
// End-to-end test of redoing a lesson (REQ-6.5) with "redo counts" on and off (REQ-5.9).
// Cleans up after itself.
//
//   node tools/test-redo.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig } from './lib/connect.mjs'

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

const loader = await connect('test')
const ldb = loader.db
const lesson = (await getDoc(doc(ldb, 'lessons', LESSON))).data()
const v = String(lesson.currentVersion)
const version = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v))).data()
const secret = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v, 'secret', 'answers'))).data().questions
const questions = version.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question' && b.kind !== 'audio'))
const STUDENTS = ['test-student-5', 'test-student-6']

async function cleanUp() {
  for (const uid of STUDENTS) await deleteDoc(doc(ldb, 'progress', `${uid}__${LESSON}`))
  for (const a of (await getDocs(collection(ldb, 'classes', CLASS, 'assignments'))).docs) if (a.data().createdBy !== 'evolora-loader') await deleteDoc(a.ref)
}

// Answers every question: right the first time, or wrong then right (half marks).
async function doLesson(call, secondTry) {
  for (const q of questions) {
    const right = q.kind === 'choice' ? secret[q.id].correct : q.kind === 'number' ? String(secret[q.id].answer) : 'My answer.'
    if (secondTry && q.kind === 'choice') await call('answer', { lessonId: LESSON, questionId: q.id, value: [q.choices.find((c) => !secret[q.id].correct.includes(c.id)).id] })
    if (secondTry && q.kind === 'number') await call('answer', { lessonId: LESSON, questionId: q.id, value: String(secret[q.id].answer + 50) })
    await call('answer', { lessonId: LESSON, questionId: q.id, value: right })
  }
}
const cellOf = async (uid) => as('test-teacher-1', async ({ call }) => (await call('classOverview', { classId: CLASS })).students.find((s) => s.id === uid).cells[LESSON])

await cleanUp()
try {
  await as('test-teacher-1', async ({ call }) => {
    await call('assign', { classId: CLASS, lessonIds: [LESSON], studentIds: ['test-student-6'], redoCounts: true, grades: 'show' })
    await call('assign', { classId: CLASS, lessonIds: [LESSON], studentIds: ['test-student-5'], redoCounts: false, grades: 'show' })
  })
  check('a lesson not finished cannot be redone', await as('test-student-6', async ({ call }) => {
    try { await call('startRedo', { lessonId: LESSON }); return false } catch (e) { return e.code === 'functions/failed-precondition' }
  }))

  console.log('Redo counts (Test Student 6)')
  await as('test-student-6', async ({ db, call }) => {
    await doLesson(call, false)
    const r = await call('startRedo', { lessonId: LESSON })
    check('the redo starts, and counts', r.counts === true)
    const p = (await getDoc(doc(db, 'progress', `test-student-6__${LESSON}`))).data()
    check('the lesson starts again from the beginning; earlier answers are kept', Object.keys(p.questions).length === 0 && p.redos.length === 1 && p.redo.active === true)
  })
  check('during the redo, the earlier grade still shows (100)', (await cellOf('test-student-6')).percent === 100)
  await as('test-student-6', ({ call }) => doLesson(call, true))
  const c6 = await cellOf('test-student-6')
  check('after a worse redo, the grade goes down (redo counts)', c6.kind === 'grade' && c6.percent < 100, JSON.stringify(c6))

  console.log('Redo for practice only (Test Student 5)')
  await as('test-student-5', async ({ call }) => {
    await doLesson(call, true)
    const before = (await cellOf('test-student-5')).percent
    const r = await call('startRedo', { lessonId: LESSON })
    check('the redo starts, and does not count', r.counts === false)
    await doLesson(call, false)
    const after = await cellOf('test-student-5')
    check('after a better redo, the grade stays the same', after.percent === before && before < 100, `${before} → ${after.percent}`)
  })
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
}

console.log(`\n${count - failures} of ${count} redo tests passed.`)
finish(failures ? 1 : 0)

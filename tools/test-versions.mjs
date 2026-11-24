#!/usr/bin/env node
// End-to-end test of lesson versions (REQ-4.7, system-design 3.2): a student who started a lesson
// keeps the version they started; a student who starts after a change gets the new version.
// It adds a changed version for a moment and then puts the lesson back exactly as it was.
//
//   node tools/test-versions.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { deleteDoc, doc, getDoc, initializeFirestore, setDoc, updateDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
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

const loader = await connect('test')
const ldb = loader.db
const lessonRef = doc(ldb, 'lessons', LESSON)
const original = (await getDoc(lessonRef)).data()
const oldV = original.currentVersion
const newV = oldV + 1000 // far from real versions, so it can't clash with a real reload
const oldVersion = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', String(oldV)))).data()
const oldSecret = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', String(oldV), 'secret', 'answers'))).data()
const q = oldVersion.topics.flatMap((t) => t.blocks).find((b) => b.type === 'question' && b.kind === 'choice' && (b.level ?? 1) === 1)
const STUDENTS = ['test-student-5', 'test-student-6']

async function restore() {
  await updateDoc(lessonRef, { currentVersion: oldV })
  await deleteDoc(doc(ldb, 'lessons', LESSON, 'versions', String(newV), 'secret', 'answers'))
  await deleteDoc(doc(ldb, 'lessons', LESSON, 'versions', String(newV)))
  for (const uid of STUDENTS) await deleteDoc(doc(ldb, 'progress', `${uid}__${LESSON}`))
}

for (const uid of STUDENTS) await deleteDoc(doc(ldb, 'progress', `${uid}__${LESSON}`))
try {
  // Student A starts the lesson (version oldV).
  await as('test-student-5', ({ call }) => call('answer', { lessonId: LESSON, questionId: q.id, value: oldSecret.questions[q.id].correct }))
  // The lesson is changed: the same question with a new prompt, loaded as a new version.
  const changed = structuredClone(oldVersion)
  changed.version = newV
  for (const t of changed.topics) for (const b of t.blocks) if (b.id === q.id) b.prompt = `CHANGED: ${b.prompt}`
  await setDoc(doc(ldb, 'lessons', LESSON, 'versions', String(newV)), changed)
  await setDoc(doc(ldb, 'lessons', LESSON, 'versions', String(newV), 'secret', 'answers'), oldSecret)
  await updateDoc(lessonRef, { currentVersion: newV })

  await as('test-student-5', async ({ db, call }) => {
    const p = (await getDoc(doc(db, 'progress', `test-student-5__${LESSON}`))).data()
    check('student A keeps the version they started', p.version === oldV)
    const v = (await getDoc(doc(db, 'lessons', LESSON, 'versions', String(p.version)))).data()
    check('student A still sees the old question', !v.topics.flatMap((t) => t.blocks).find((b) => b.id === q.id).prompt.startsWith('CHANGED'))
    check("student A's earlier answer and grade are unchanged", p.questions[q.id].score === 1 && p.grade.percent === 100)
    const second = oldVersion.topics.flatMap((t) => t.blocks).filter((b) => b.type === 'question' && b.kind === 'choice' && (b.level ?? 1) === 1)[1]
    if (second) {
      await call('answer', { lessonId: LESSON, questionId: second.id, value: oldSecret.questions[second.id].correct })
      check('student A goes on answering in their version', (await getDoc(doc(db, 'progress', `test-student-5__${LESSON}`))).data().version === oldV)
    }
  })
  await as('test-student-6', async ({ db, call }) => {
    await call('answer', { lessonId: LESSON, questionId: q.id, value: oldSecret.questions[q.id].correct })
    const p = (await getDoc(doc(db, 'progress', `test-student-6__${LESSON}`))).data()
    check('student B, starting after the change, gets the new version', p.version === newV)
    const v = (await getDoc(doc(db, 'lessons', LESSON, 'versions', String(newV)))).data()
    check('and sees the new question', v.topics.flatMap((t) => t.blocks).find((b) => b.id === q.id).prompt.startsWith('CHANGED'))
  })
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await restore()
  check('the lesson is back as it was', (await getDoc(lessonRef)).data().currentVersion === oldV)
}

console.log(`\n${count - failures} of ${count} lesson version tests passed.`)
finish(failures ? 1 : 0)

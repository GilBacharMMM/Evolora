#!/usr/bin/env node
// End-to-end test of drag-and-drop questions (REQ-4.12, D-70) with the demo question in the
// circles lesson. Cleans up after itself.
//
//   node tools/test-drag.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { deleteDoc, doc, getDoc, initializeFirestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig } from './lib/connect.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const LESSON = 'circles-teaching'
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
const v = String((await getDoc(doc(ldb, 'lessons', LESSON))).data().currentVersion)
const version = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v))).data()
const secret = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v, 'secret', 'answers'))).data().questions
const q = version.topics.flatMap((t) => t.blocks).find((b) => b.type === 'question' && b.kind === 'drag')
const cleanUp = () => deleteDoc(doc(ldb, 'progress', `test-student-1__${LESSON}`))

await cleanUp()
try {
  check('the circles lesson has a drag-and-drop question with an image, 4 spots and 5 cards', !!q && !!q.image?.storagePath && q.spots.length === 4 && q.cards.length === 5, JSON.stringify(q?.spots))
  check('what students can read holds no right answers', !JSON.stringify(q).includes('correct'))
  const right = secret[q.id].correct
  const wrong = [right[1], right[0], ...right.slice(2)]
  await as('test-student-1', async ({ call }) => {
    let refused = false
    try { await call('answer', { lessonId: LESSON, questionId: q.id, value: right.slice(0, 2) }) } catch (e) { refused = e.code === 'functions/invalid-argument' }
    check('every place must have a card (it does not use up an attempt)', refused)
    const a = await call('answer', { lessonId: LESSON, questionId: q.id, value: wrong })
    check('a wrong placement shows the hint and allows a second attempt', a.reply.result === 'tryAgain' && !!a.reply.hint)
    const b = await call('answer', { lessonId: LESSON, questionId: q.id, value: right })
    check('the right placement on the 2nd attempt scores half', b.reply.result === 'correct' && b.state.score === 0.5)
  })
  await as('test-teacher-1', async ({ call }) => {
    const a = await call('tryAnswer', { lessonId: LESSON, questionId: q.id, value: right })
    check('a teacher trying the lesson gets it checked the same way', a.reply.result === 'correct' && a.state.score === 1)
    const shown = await call('tryAnswer', { lessonId: LESSON, questionId: q.id, show: true })
    check('"Show answer" shows the right card for every place', JSON.stringify(shown.correct?.choices) === JSON.stringify(right) || JSON.stringify(shown.correct?.cards) === JSON.stringify(right), JSON.stringify(shown.correct))
  })
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
}

console.log(`\n${count - failures} of ${count} drag-and-drop tests passed.`)
finish(failures ? 1 : 0)

#!/usr/bin/env node
// End-to-end test of drag-and-drop questions (REQ-4.12, D-70) with the demo question in the
// circles lesson. Cleans up after itself.
//
//   node tools/test-drag.mjs

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
  await signInWithEmailAndPassword(getAuth(app), user.email, testPassword(user))
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
const PEOPLE = ['test-student-1', 'test-student-2', 'test-student-3']
const cleanUp = async () => {
  for (const uid of PEOPLE) await deleteDoc(doc(ldb, 'progress', `${uid}__${LESSON}`))
  for (const f of (await getDocs(query(collection(ldb, 'flags'), where('kind', '==', 'dragWrong')))).docs) if (PEOPLE.includes(f.data().uid)) await deleteDoc(f.ref)
}

await cleanUp()
try {
  check('the circles lesson has a drag-and-drop question with an image, 4 spots and 5 cards', !!q && !!q.image?.storagePath && q.spots.length === 4 && q.cards.length === 5, JSON.stringify(q?.spots))
  check('what students can read holds no right answers', !JSON.stringify(q).includes('correct'))
  const right = secret[q.id].correct
  const extra = q.cards.map((c) => c.id).find((id) => !right.includes(id))
  // The last spot gets the extra card: three right, one wrong.
  const oneWrong = [...right.slice(0, 3), extra]
  // The first two spots swapped and the extra card on the last: all four wrong.
  const allWrong = [right[1], right[0], right[3], extra]

  console.log('Attempts, marks and locked cards (D-70)')
  await as('test-student-1', async ({ call }) => {
    let refused = false
    try { await call('answer', { lessonId: LESSON, questionId: q.id, value: right.slice(0, 2) }) } catch (e) { refused = e.code === 'functions/invalid-argument' }
    check('every place must have a card (it does not use up an attempt)', refused)
    const a = await call('answer', { lessonId: LESSON, questionId: q.id, value: oneWrong })
    check('after a wrong attempt, each card is marked: three right, one wrong', a.reply.result === 'tryAgain' && JSON.stringify(a.reply.marks) === JSON.stringify([true, true, true, false]))
    check('the right cards stay locked; the wrong one goes back', JSON.stringify(a.state.locked) === JSON.stringify([...right.slice(0, 3), null]))
    check('the hint shows after the first wrong attempt', !!a.reply.hint)
    check('the circle question (5 cards) gives 3 attempts', a.state.attemptsAllowed === 3 && a.reply.attemptsLeft === 2)
    check('the right places are not given away before the last attempt', !a.state.correct)
    let moved = false
    try { await call('answer', { lessonId: LESSON, questionId: q.id, value: [right[1], right[0], right[2], right[3]] }) } catch (e) { moved = e.code === 'functions/invalid-argument' }
    check('a locked card cannot be moved', moved)
    const b = await call('answer', { lessonId: LESSON, questionId: q.id, value: right })
    check('all right on the 2nd attempt: half marks; the extra card was left out', b.reply.result === 'correct' && b.state.score === 0.5)
  })
  await as('test-student-2', async ({ call }) => {
    await call('answer', { lessonId: LESSON, questionId: q.id, value: allWrong })
    await call('answer', { lessonId: LESSON, questionId: q.id, value: allWrong })
    const c = await call('answer', { lessonId: LESSON, questionId: q.id, value: right })
    check('all right on the 3rd attempt: a quarter', c.reply.result === 'correct' && c.state.score === 0.25 && c.state.result === 'correct3')
  })
  await as('test-student-3', async ({ call }) => {
    await call('answer', { lessonId: LESSON, questionId: q.id, value: allWrong })
    await call('answer', { lessonId: LESSON, questionId: q.id, value: allWrong })
    const c = await call('answer', { lessonId: LESSON, questionId: q.id, value: allWrong })
    check('every attempt fails: 0, the right card on every spot, no check-again question', c.reply.result === 'wrong' && c.state.score === 0 && JSON.stringify(c.reply.correct?.cards) === JSON.stringify(right) && !c.reply.checkAgain)
  })
  const o = await as('test-teacher-1', ({ call }) => call('classOverview', { classId: 'test-class' }))
  const flag = o.flags.find((f) => f.uid === 'test-student-3' && f.kind === 'dragWrong' && f.open)
  check('the teacher sees a red flag for that student and question on the class dashboard', !!flag && flag.questionId === q.id && o.students.find((s) => s.id === 'test-student-3').status === 'red')
  check('students who got it right get no red flag', !o.flags.some((f) => ['test-student-1', 'test-student-2'].includes(f.uid) && f.kind === 'dragWrong'))

  await as('test-teacher-1', async ({ call }) => {
    const a = await call('tryAnswer', { lessonId: LESSON, questionId: q.id, value: right })
    check('a teacher trying the lesson gets it checked the same way', a.reply.result === 'correct' && a.state.score === 1)
    const shown = await call('tryAnswer', { lessonId: LESSON, questionId: q.id, show: true })
    check('"Show answer" shows the right card for every place', JSON.stringify(shown.correct?.cards) === JSON.stringify(right), JSON.stringify(shown.correct))
  })
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
}

console.log(`\n${count - failures} of ${count} drag-and-drop tests passed.`)
finish(failures ? 1 : 0)

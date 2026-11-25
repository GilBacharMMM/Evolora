#!/usr/bin/env node
// End-to-end test of the checking service on the test site (system-design 8.1):
// answers real questions of the circles lesson as test students, through the cloud.
// Run after tools/reset-test-site.mjs; it clears its own test students' work at the start.
//
//   node tools/test-checking.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, query, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'
import { agreeForTest } from './lib/test-helpers.mjs'

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
  const app = initializeApp(config, `${uid}-${Date.now()}`)
  await signInWithEmailAndPassword(getAuth(app), user.email, testPassword(user))
  const db = initializeFirestore(app, {})
  const call = (name) => httpsCallable(getFunctions(app, 'me-west1'), name)
  try { await fn({ db, answer: call('answer'), openTip: call('openTip') }) } finally { await deleteApp(app) }
}

// The loading program reads the answers, to know what is right and wrong.
const loader = await connect('test')
// Test Student 7 must have agreed to the terms of use to be served (D-76).
const restoreTerms7 = await agreeForTest(loader.db, 'test-student-7')
const lesson = (await getDoc(doc(loader.db, 'lessons', LESSON))).data()
const version = (await getDoc(doc(loader.db, 'lessons', LESSON, 'versions', String(lesson.currentVersion)))).data()
const secret = (await getDoc(doc(loader.db, 'lessons', LESSON, 'versions', String(lesson.currentVersion), 'secret', 'answers'))).data().questions
const questions = version.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question').map((b) => ({ ...b, topic: t.number })))
const choiceQ = questions.find((q) => q.kind === 'choice' && secret[q.id].checkAgain.length)
const numberQ = questions.find((q) => q.kind === 'number' && !q.extra)
const wrongChoice = (q, s) => q.choices.find((c) => !s.correct.includes(c.id)).id
for (const uid of ['test-student-2', 'test-student-3', 'test-student-4']) await deleteDoc(doc(loader.db, 'progress', `${uid}__${LESSON}`))
for (const f of (await getDocs(query(collection(loader.db, 'flags'), where('lessonId', '==', LESSON)))).docs) await deleteDoc(f.ref)

console.log('Test Student 2: right first time')
await as('test-student-2', async ({ db, answer }) => {
  const r = (await answer({ lessonId: LESSON, questionId: choiceQ.id, value: secret[choiceQ.id].correct })).data
  check('correct answer is marked correct', r.reply.result === 'correct')
  check("a right answer comes with its \"why it's right\" explanation (REQ-4.28)", !!secret[choiceQ.id].whyRight && r.reply.whyRight === secret[choiceQ.id].whyRight)
  const p = (await getDoc(doc(db, 'progress', `test-student-2__${LESSON}`))).data()
  check('full marks saved', p.questions[choiceQ.id].score === 1)
  check('student can read own progress', !!p)
  const again = (await answer({ lessonId: LESSON, questionId: choiceQ.id, value: [wrongChoice(choiceQ, secret[choiceQ.id])] })).data
  check('answering again changes nothing', again.reply.already === true)
})

console.log('Test Student 3: wrong, then right; number answers')
await as('test-student-3', async ({ answer, openTip }) => {
  const a = (await answer({ lessonId: LESSON, questionId: choiceQ.id, value: [wrongChoice(choiceQ, secret[choiceQ.id])] })).data
  check('1st wrong answer gives the hint', a.reply.result === 'tryAgain' && a.reply.hint === secret[choiceQ.id].hint)
  check('the correct answer is not sent yet', !JSON.stringify(a).includes('"correct":['))
  const b = (await answer({ lessonId: LESSON, questionId: choiceQ.id, value: secret[choiceQ.id].correct })).data
  check('2nd attempt correct scores half', b.reply.result === 'correct' && b.state.score === 0.5)

  let invalid = false
  try { await answer({ lessonId: LESSON, questionId: numberQ.id, value: 'abc' }) } catch (e) { invalid = e.code === 'functions/invalid-argument'; if (!invalid) console.log('    got:', e.code, e.message) }
  check('letters are refused without using an attempt', invalid)
  const exact = secret[numberQ.id].answer
  const n = (await answer({ lessonId: LESSON, questionId: numberQ.id, value: String(Math.round((exact + 0.08) * 100) / 100) })).data
  check(`number within 0.1 of ${exact} is correct`, n.reply.result === 'correct' && n.state.attempts.length === 1)
  const tip = (await openTip({ lessonId: LESSON, questionId: numberQ.id, tip: 0 })).data
  check('opening a tip is noted', tip.ok === true)
})

console.log('Test Student 4: two wrong, then the check-again question wrong twice')
await as('test-student-4', async ({ db, answer }) => {
  const s = secret[choiceQ.id]
  await answer({ lessonId: LESSON, questionId: choiceQ.id, value: [wrongChoice(choiceQ, s)] })
  const b = (await answer({ lessonId: LESSON, questionId: choiceQ.id, value: [wrongChoice(choiceQ, s)] })).data
  check('2nd wrong answer shows the solution and the correct answer', b.reply.result === 'wrong' && !!b.reply.solution && b.reply.correct.choices.length > 0)
  check('a check-again question follows, without its answer', !!b.reply.checkAgain && b.reply.checkAgain.correct === undefined)
  const caSecret = s.checkAgain.find((c) => c.id === b.reply.checkAgain.id)
  const wrongCa = caSecret.kind === 'number' ? String(caSecret.answer + 5) : [caSecret.choices.find((c) => !caSecret.correct.includes(c.id)).id]
  await answer({ lessonId: LESSON, questionId: choiceQ.id, checkAgain: true, value: wrongCa })
  const d = (await answer({ lessonId: LESSON, questionId: choiceQ.id, checkAgain: true, value: wrongCa })).data
  check('two wrong check-again answers show its answer', d.reply.result === 'wrong' && !!d.reply.correct)
  const p = (await getDoc(doc(db, 'progress', `test-student-4__${LESSON}`))).data()
  check('the question still scores 0', p.questions[choiceQ.id].score === 0)
  let blocked = false
  try { await getDocs(collection(db, 'flags')) } catch { blocked = true }
  check('students cannot read red flags', blocked)
})
const flags = await getDocs(query(collection(loader.db, 'flags'), where('lessonId', '==', LESSON), where('uid', '==', 'test-student-4')))
check('a red flag was raised for the teacher, with the student and question', flags.size === 1 && flags.docs[0].data().questionId === choiceQ.id && flags.docs[0].data().studentName === 'Test Student 4')

console.log('Test Teacher 1 and Test Student 7')
await as('test-teacher-1', async ({ db }) => {
  const f = await getDocs(query(collection(db, 'flags'), where('classId', '==', 'test-class')))
  check('the class teacher sees the red flag', f.docs.some((d) => d.data().uid === 'test-student-4'))
  const p = await getDoc(doc(db, 'progress', `test-student-4__${LESSON}`))
  check("the class teacher can read the student's work", p.exists())
})
await as('test-student-7', async ({ answer }) => {
  let denied = false
  try { await answer({ lessonId: LESSON, questionId: choiceQ.id, value: ['c1'] }) } catch (e) { denied = /not open|permission/i.test(e.message) || e.code === 'functions/permission-denied' }
  check('a student without a class cannot answer', denied)
})
await as('test-student-2', async ({ db }) => {
  let blocked = false
  try { await getDoc(doc(db, 'progress', `test-student-4__${LESSON}`)) } catch { blocked = true }
  check("a student cannot read another student's work", blocked)
})

// Leave the test site clean for Gil.
for (const uid of ['test-student-2', 'test-student-3', 'test-student-4']) await deleteDoc(doc(loader.db, 'progress', `${uid}__${LESSON}`))
for (const f of (await getDocs(query(collection(loader.db, 'flags'), where('lessonId', '==', LESSON)))).docs) await deleteDoc(f.ref)

console.log(`\n${count - failures} of ${count} checking tests passed.`)
await restoreTerms7()
finish(failures ? 1 : 0)

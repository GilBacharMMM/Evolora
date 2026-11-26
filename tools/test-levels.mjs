#!/usr/bin/env node
// End-to-end test of question levels (REQ-4.18, 5.18, 6.10) and a teacher trying a lesson
// (REQ-5.32) on the test site. Answers in random order (REQ-4.19) are worked out by the website.
// Run after tools/reset-test-site.mjs. It cleans up its own work at the end.
//
//   node tools/test-levels.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { deleteDoc, doc, getDoc, initializeFirestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
// The first density practice lesson has questions at levels 1, 2 and 3 (they moved there from the
// Archimedes teaching lesson).
const LESSON = 'archimedes-density-practice-1'
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
const lesson = (await getDoc(doc(ldb, 'lessons', LESSON))).data()
const v = String(lesson.currentVersion)
const version = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v))).data()
const secret = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v, 'secret', 'answers'))).data().questions
const questions = version.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question'))
const byLevel = (n) => questions.filter((q) => (q.level ?? 1) === n).map((q) => q.id)
const PEOPLE = ['test-student-1', 'test-student-3', 'test-student-5', 'test-teacher-1']
const cleanUp = async () => { for (const uid of PEOPLE) await deleteDoc(doc(ldb, 'progress', `${uid}__${LESSON}`)) }

await cleanUp()
try {
  check('the density practice lesson has questions at levels 2 and 3', byLevel(2).length > 0 && byLevel(3).length > 0)
  const hiddenFor = (uid) => as(uid, async ({ call }) => (await call('lessonView', { lessonId: LESSON })).hidden)
  const h1 = await hiddenFor('test-student-1')
  check('a level 1 student gets no level 2 or 3 questions', [...byLevel(2), ...byLevel(3)].every((id) => h1.includes(id)) && byLevel(1).every((id) => !h1.includes(id)))
  const h3 = await hiddenFor('test-student-3')
  check('a level 2 student gets level 2 questions but not level 3', byLevel(2).every((id) => !h3.includes(id)) && byLevel(3).every((id) => h3.includes(id)))
  check('a level 3 student gets every question', (await hiddenFor('test-student-5')).length === 0)
  await as('test-student-1', async ({ call }) => {
    const q = questions.find((x) => (x.level ?? 1) === 3 && x.kind !== 'audio')
    let refused = false
    try { await call('answer', { lessonId: LESSON, questionId: q.id, value: q.kind === 'choice' || q.kind === 'drag' ? secret[q.id].correct : q.kind === 'number' ? String(secret[q.id].answer) : 'An answer.' }) } catch (e) { refused = e.code === 'functions/failed-precondition'; if (!refused) console.log('    got', e.code, e.message) }
    check('a level 1 student cannot answer a level 3 question', refused)
  })

  console.log('Changing a level (REQ-5.10, 5.18)')
  await as('test-teacher-1', ({ call }) => call('setLevel', { classId: 'test-class', studentId: 'test-student-1', level: 3 }))
  check('after the teacher raises Test Student 1 to level 3, they get every question', (await hiddenFor('test-student-1')).length === 0)
  await as('test-teacher-1', ({ call }) => call('setLevel', { classId: 'test-class', studentId: 'test-student-1', level: 1 }))

  console.log('A teacher tries the lesson (REQ-5.32)')
  await as('test-teacher-1', async ({ call }) => {
    const q = questions.find((x) => x.kind === 'choice' && secret[x.id].hint)
    const wrongValue = [q.choices.find((c) => !secret[q.id].correct.includes(c.id)).id]
    const a = await call('tryAnswer', { lessonId: LESSON, questionId: q.id, value: wrongValue })
    check('a wrong answer shows the hint and allows a second attempt', a.reply.result === 'tryAgain' && a.reply.hint === secret[q.id].hint)
    const b = await call('tryAnswer', { lessonId: LESSON, questionId: q.id, value: secret[q.id].correct, before: a.state })
    check('the second attempt is checked like a student\'s', b.reply.result === 'correct' && b.state.score === 0.5)
    const shown = await call('tryAnswer', { lessonId: LESSON, questionId: q.id, show: true })
    check('"Show answer" gives the correct answer and the full solution', JSON.stringify(shown.correct.choices) === JSON.stringify(secret[q.id].correct) && shown.solution === (secret[q.id].solution || null))
  })
  check("nothing the teacher did while trying was saved", !(await getDoc(doc(ldb, 'progress', `test-teacher-1__${LESSON}`))).exists())
  await as('test-student-5', async ({ call }) => {
    let refused = false
    try { await call('tryAnswer', { lessonId: LESSON, questionId: questions[0].id, show: true }) } catch (e) { refused = e.code === 'functions/permission-denied' }
    check('a student cannot use "Show answer"', refused)
  })
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
}

console.log(`\n${count - failures} of ${count} level and trying tests passed.`)
finish(failures ? 1 : 0)

#!/usr/bin/env node
// End-to-end test of following a class and grading, on the test site (system-design 2.7, 8.1):
// REQ-5.27 teacher home, 5.10 dashboard, 5.24 progress map, 5.19 clearing flags, 5.20 opening
// early, 5.12 and 5.13 grading with comments, 5.11 grade table and CSV.
// Run after tools/reset-test-site.mjs. It cleans up its own work at the end.
//
//   node tools/test-following.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, query, setDoc, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'
import { answerWithRecording, soloTeacher } from './lib/test-helpers.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const CLASS = 'test-class'
// Questions above a student's level are refused (REQ-6.10); tests that answer a whole lesson skip them.
const notMine = (e) => { if (e.code !== 'functions/failed-precondition') throw e }
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
  try { return await fn({ db, call, app }) } finally { await deleteApp(app) }
}

async function refused(action) {
  try { await action(); return false } catch (e) { return ['functions/permission-denied', 'functions/invalid-argument', 'permission-denied'].includes(e.code) }
}

const loader = await connect('test')
const ldb = loader.db
const LESSONS = ['circles-teaching', 'archimedes-density-teaching', 'circles-practice']
const STUDENTS = ['test-student-1', 'test-student-2', 'test-student-3', 'test-student-4', 'test-student-5', 'test-student-6']

async function lessonData(lessonId) {
  const lesson = (await getDoc(doc(ldb, 'lessons', lessonId))).data()
  const v = String(lesson.currentVersion)
  const version = (await getDoc(doc(ldb, 'lessons', lessonId, 'versions', v))).data()
  const secret = (await getDoc(doc(ldb, 'lessons', lessonId, 'versions', v, 'secret', 'answers'))).data().questions
  const questions = version.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question'))
  return { questions, secret }
}

async function cleanUp() {
  for (const uid of STUDENTS) for (const l of LESSONS) await deleteDoc(doc(ldb, 'progress', `${uid}__${l}`))
  for (const f of (await getDocs(query(collection(ldb, 'flags'), where('classId', '==', CLASS)))).docs) await deleteDoc(f.ref)
  for (const o of (await getDocs(collection(ldb, 'classes', CLASS, 'openings'))).docs) await deleteDoc(o.ref)
  await setDoc(doc(ldb, 'classes', CLASS, 'levels', 'test-student-1'), { level: 1, setBy: 'test data' })
}

const restoreTeachers = await soloTeacher(ldb, CLASS)
await cleanUp()
const circles = await lessonData('circles-teaching')
let openLesson = null
for (const l of LESSONS) {
  const d = await lessonData(l)
  const q = d.questions.find((x) => x.kind === 'open')
  if (q) { openLesson = { lessonId: l, q, ...d }; break }
}

try {
  console.log('Students work (setting the scene)')
  const choiceQ = circles.questions.find((q) => q.kind === 'choice' && circles.secret[q.id].checkAgain?.length)
  const wrong = (q, s) => [q.choices.find((c) => !s.correct.includes(c.id)).id]
  await as('test-student-2', async ({ call }) => {
    const s = circles.secret[choiceQ.id]
    await call('answer', { lessonId: 'circles-teaching', questionId: choiceQ.id, value: wrong(choiceQ, s) })
    const b = await call('answer', { lessonId: 'circles-teaching', questionId: choiceQ.id, value: wrong(choiceQ, s) })
    const ca = s.checkAgain.find((c) => c.id === b.reply.checkAgain.id)
    const caWrong = ca.kind === 'number' ? String(ca.answer + 5) : [ca.choices.find((c) => !ca.correct.includes(c.id)).id]
    await call('answer', { lessonId: 'circles-teaching', questionId: choiceQ.id, checkAgain: true, value: caWrong })
    await call('answer', { lessonId: 'circles-teaching', questionId: choiceQ.id, checkAgain: true, value: caWrong })
  })
  check('there is an open question to grade in a demo lesson', !!openLesson)
  await as('test-student-3', ({ call }) => call('answer', { lessonId: openLesson.lessonId, questionId: openLesson.q.id, value: 'Because the density of gold is higher.' }))
  await as('test-student-4', async ({ call, app }) => {
    for (const q of circles.questions) {
      if (q.kind === 'audio') { await answerWithRecording(app, call, 'test-student-4', 'circles-teaching', q.id).catch(notMine); continue }
      const value = q.kind === 'choice' || q.kind === 'drag' ? circles.secret[q.id].correct : q.kind === 'number' ? String(circles.secret[q.id].answer) : 'My answer.'
      await call('answer', { lessonId: 'circles-teaching', questionId: q.id, value }).catch(notMine)
    }
  })

  console.log('Teacher home (REQ-5.27)')
  await as('test-teacher-1', async ({ call }) => {
    const h = await call('teacherHome', {})
    const card = h.classes.find((c) => c.id === CLASS)
    check('the class card counts the open red flag and the answers to grade', card && card.openFlags === 1 && card.waiting >= 1, JSON.stringify(card))
    check('the To do list has the red flag, for the right student', h.todo.some((i) => i.kind === 'flag' && i.studentId === 'test-student-2'))
    check('the To do list has the answers to grade, for the right lesson', h.todo.some((i) => i.kind === 'grade' && i.lessonId === openLesson.lessonId))
  })
  check("Test Teacher 2 sees nothing from Test Teacher 1's class", await as('test-teacher-2', async ({ call }) => { const h = await call('teacherHome', {}); return h.classes.every((c) => c.id !== CLASS) && h.todo.every((i) => i.classId !== CLASS) }))

  console.log('Class dashboard and progress map (REQ-5.10, 5.24)')
  await as('test-teacher-1', async ({ call }) => {
    const o = await call('classOverview', { classId: CLASS })
    const row = (uid) => o.students.find((s) => s.id === uid)
    check('every student in the class has a row with a status', o.students.length === 6 && o.students.every((s) => ['red', 'orange', 'yellow', 'green'].includes(s.status)))
    check('the student with an open red flag shows red', row('test-student-2').status === 'red' && row('test-student-2').openFlags === 1)
    check('the flag says which question caused it', o.flags.some((f) => f.uid === 'test-student-2' && f.questionId === choiceQ.id && f.open))
    const p4 = row('test-student-4').positions['circles-demo']
    check('the progress map shows Test Student 4 finished the first circles lesson', p4 && p4.done === 1 && p4.current === 'circles-practice', JSON.stringify(p4))
    const p2 = row('test-student-2').positions['circles-demo']
    check('and Test Student 2 still working on it', p2.done === 0 && p2.current === 'circles-teaching' && p2.working === true)
    check('a lesson not finished shows "not done" (0)', row('test-student-1').cells['circles-teaching'].kind === 'notDone')
    check('an answer waiting for the teacher shows as pending, not 0', ['pending', 'notDone'].includes(row('test-student-3').cells[openLesson.lessonId].kind) && row('test-student-3').cells[openLesson.lessonId].waiting === 1)
    const lines = o.csv.replace(/^﻿/, '').trim().split('\r\n')
    check('the CSV file has a header and a row per student, a column per lesson', lines.length === 7 && lines[0].split(',').length === 3 + o.columns.length && o.columns.length === 3, `${lines.length} lines`)
  })
  check("Test Teacher 2 cannot see Test Teacher 1's class", await as('test-teacher-2', ({ call }) => refused(() => call('classOverview', { classId: CLASS }))))
  check('a student cannot see the class dashboard', await as('test-student-1', ({ call }) => refused(() => call('classOverview', { classId: CLASS }))))

  console.log('Levels (REQ-5.10)')
  await as('test-teacher-1', async ({ call }) => {
    await call('setLevel', { classId: CLASS, studentId: 'test-student-1', level: 2 })
    const o = await call('classOverview', { classId: CLASS })
    check('pressing + raises the level by one, saved at once', o.students.find((s) => s.id === 'test-student-1').level === 2)
    check('level 4 is refused', await refused(() => call('setLevel', { classId: CLASS, studentId: 'test-student-1', level: 4 })))
  })

  console.log('Grading (REQ-5.12, 5.13)')
  await as('test-teacher-1', async ({ call }) => {
    const r = await call('lessonResults', { classId: CLASS, lessonId: openLesson.lessonId })
    const q = r.questions.find((x) => x.id === openLesson.q.id)
    check('the lesson results have the question, its grading instructions and the answer', !!q && q.gradingInstructions === (openLesson.secret[q.id].gradingInstructions || null) && r.students.find((s) => s.id === 'test-student-3').states[q.id].attempts[0].startsWith('Because'))
    check('a grade above full marks is refused', await refused(() => call('gradeAnswer', { classId: CLASS, lessonId: openLesson.lessonId, studentId: 'test-student-3', questionId: q.id, score: 1.5 })))
    const changed = await call('gradeAnswer', { classId: CLASS, lessonId: 'circles-teaching', studentId: 'test-student-2', questionId: choiceQ.id, score: 1 })
    check('an automatically checked answer can be changed by the teacher, and is marked so (REQ-5.15)', changed.state.changedByTeacher === true && changed.state.score === 1)
    const g = await call('gradeAnswer', { classId: CLASS, lessonId: openLesson.lessonId, studentId: 'test-student-3', questionId: q.id, score: 0.5, comment: 'Good start. What about the volume?', markup: 'Because the ⟦density⟧ of gold is higher.' })
    check('"half" saves half the marks, with the comment', g.state.score === 0.5 && g.state.teacherComment === 'Good start. What about the volume?')
    check('the marked-up answer is saved with the grade (REQ-5.12)', g.state.markup === 'Because the ⟦density⟧ of gold is higher.')
    check('the lesson grade is no longer pending', g.grade.pending === false)
  })
  check('a student cannot grade answers', await as('test-student-3', ({ call }) => refused(() => call('gradeAnswer', { classId: CLASS, lessonId: openLesson.lessonId, studentId: 'test-student-3', questionId: openLesson.q.id, score: 1 }))))
  await as('test-student-3', async ({ db }) => {
    const p = (await getDoc(doc(db, 'progress', `test-student-3__${openLesson.lessonId}`))).data()
    check('the student sees the teacher\'s comment on their answer', p.questions[openLesson.q.id].teacherComment === 'Good start. What about the volume?')
  })

  console.log('Clearing a red flag (REQ-5.19)')
  await as('test-teacher-1', async ({ call }) => {
    const o = await call('classOverview', { classId: CLASS })
    const flag = o.flags.find((f) => f.uid === 'test-student-2' && f.open)
    await call('clearFlag', { flagId: flag.id, note: 'Talked with her; she understands now.' })
    const after = await call('classOverview', { classId: CLASS })
    check("after clearing, the student's status is no longer red", after.students.find((s) => s.id === 'test-student-2').status !== 'red')
    const cleared = after.flags.find((f) => f.id === flag.id)
    check('the cleared flag stays in the history, with the date and note', !cleared.open && !!cleared.clearedAt && cleared.clearNote === 'Talked with her; she understands now.')
  })
  check('Test Teacher 2 cannot clear flags in another class', await as('test-teacher-2', async ({ call }) => {
    const any = (await getDocs(query(collection(ldb, 'flags'), where('classId', '==', CLASS)))).docs[0]
    return refused(() => call('clearFlag', { flagId: any.id }))
  }))

  console.log('Opening a lesson early (REQ-5.20)')
  await as('test-teacher-1', async ({ call }) => {
    await call('openEarly', { classId: CLASS, lessonId: 'circles-practice', studentIds: ['test-student-5', 'test-student-6'] })
    check('a lesson outside the class\'s courses cannot be opened early', await refused(() => call('openEarly', { classId: CLASS, lessonId: 'no-such-lesson', studentIds: null })))
  })
  const sees = (uid) => as(uid, async ({ db }) => (await getDocs(query(collection(db, 'classes', CLASS, 'openings'), where('studentIds', 'array-contains', uid)))).docs.some((d) => d.data().lessonId === 'circles-practice'))
  check('the 2 chosen students see the lesson opened for them', (await sees('test-student-5')) && (await sees('test-student-6')))
  check('other students do not', !(await sees('test-student-1')))
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
  await restoreTeachers()
}

console.log(`\n${count - failures} of ${count} following and grading tests passed.`)
finish(failures ? 1 : 0)

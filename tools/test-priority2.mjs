#!/usr/bin/env node
// End-to-end test of priority 2 features on the test site (system-design 2.7, 8.1):
// REQ-5.22 students see grades or not, 5.15 teacher changes any score, 5.14 send back for review
// or corrections, 5.25 "not yet mastered", 5.28 teacher notes.
// Run after tools/reset-test-site.mjs. It cleans up its own work at the end.
//
//   node tools/test-priority2.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, query, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig } from './lib/connect.mjs'
import { answerWithRecording, soloTeacher } from './lib/test-helpers.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const CLASS = 'test-class'
const LESSON = 'circles-teaching'
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
  await signInWithEmailAndPassword(getAuth(app), user.email, TEST.password)
  const db = initializeFirestore(app, {})
  const fns = getFunctions(app, 'me-west1')
  const call = async (name, data) => (await httpsCallable(fns, name)(data)).data
  try { return await fn({ db, call, app }) } finally { await deleteApp(app) }
}

async function refused(action) {
  try { await action(); return false } catch (e) { return ['functions/permission-denied', 'functions/invalid-argument', 'functions/failed-precondition', 'permission-denied'].includes(e.code) }
}

const loader = await connect('test')
const ldb = loader.db
const lesson = (await getDoc(doc(ldb, 'lessons', LESSON))).data()
const v = String(lesson.currentVersion)
const version = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v))).data()
const secret = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v, 'secret', 'answers'))).data().questions
const questions = version.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question'))
const level1 = questions.find((q) => q.kind === 'choice' && q.level === 1 && secret[q.id].checkAgain?.length)
const wrong = (q, s) => [q.choices.find((c) => !s.correct.includes(c.id)).id]
const right = (q) => (q.kind === 'choice' || q.kind === 'drag' ? secret[q.id].correct : q.kind === 'number' ? String(secret[q.id].answer) : 'My answer.')
const PEOPLE = ['test-student-2', 'test-student-4', 'test-student-6']

async function cleanUp() {
  for (const uid of PEOPLE) for (const l of [LESSON, 'circles-practice', 'archimedes-density-teaching']) await deleteDoc(doc(ldb, 'progress', `${uid}__${l}`))
  for (const f of (await getDocs(query(collection(ldb, 'flags'), where('classId', '==', CLASS)))).docs) await deleteDoc(f.ref)
  for (const n of (await getDocs(collection(ldb, 'classes', CLASS, 'notes'))).docs) await deleteDoc(n.ref)
  for (const a of (await getDocs(collection(ldb, 'classes', CLASS, 'assignments'))).docs) if (a.data().createdBy !== 'evolora-loader') await deleteDoc(a.ref)
}

const restoreTeachers = await soloTeacher(ldb, CLASS)
await cleanUp()
try {
  check('the circles lesson has a level 1 multiple choice question with check-again questions', !!level1)

  console.log('Students see grades, or not (REQ-5.22)')
  await as('test-teacher-1', async ({ call }) => {
    await call('assign', { classId: CLASS, lessonIds: ['circles-practice'], studentIds: ['test-student-6'], grades: 'hide' })
    check('a wrong grades setting is refused', await refused(() => call('assign', { classId: CLASS, lessonIds: ['circles-practice'], studentIds: null, grades: 'maybe' })))
  })
  await as('test-student-6', async ({ db }) => {
    const mine = await getDocs(query(collection(db, 'classes', CLASS, 'assignments'), where('studentIds', 'array-contains', 'test-student-6')))
    check('the student\'s assignment says grades are hidden', mine.docs.some((d) => d.data().grades === 'hide'))
    const all = await getDocs(query(collection(db, 'classes', CLASS, 'assignments'), where('everyone', '==', true)))
    check('whole-class courses from the reset show grades "as usual"', all.docs.every((d) => (d.data().grades || 'usual') === 'usual'))
  })

  console.log('Not yet mastered and teacher notes (REQ-5.25, 5.28)')
  await as('test-student-2', async ({ call }) => {
    const s = secret[level1.id]
    await call('answer', { lessonId: LESSON, questionId: level1.id, value: wrong(level1, s) })
    const b = await call('answer', { lessonId: LESSON, questionId: level1.id, value: wrong(level1, s) })
    const ca = s.checkAgain.find((c) => c.id === b.reply.checkAgain.id)
    const caWrong = ca.kind === 'number' ? String(ca.answer + 5) : [ca.choices.find((c) => !ca.correct.includes(c.id)).id]
    await call('answer', { lessonId: LESSON, questionId: level1.id, checkAgain: true, value: caWrong })
    await call('answer', { lessonId: LESSON, questionId: level1.id, checkAgain: true, value: caWrong })
  })
  await as('test-teacher-1', async ({ call }) => {
    const d = await call('studentDetails', { classId: CLASS, studentId: 'test-student-2' })
    const item = d.notMastered.find((q) => q.questionId === level1.id)
    check('the question is on the "not yet mastered" list, with its red flag', !!item && !!item.flagId)
    await call('clearFlag', { flagId: item.flagId, note: 'Went over it together.' })
    const after = await call('studentDetails', { classId: CLASS, studentId: 'test-student-2' })
    check('after clearing the flag, the question leaves the list', !after.notMastered.some((q) => q.questionId === level1.id))
    await call('addNote', { classId: CLASS, studentId: 'test-student-2', text: 'Talked with the parents; needs more time on circles.' })
    const withNote = await call('studentDetails', { classId: CLASS, studentId: 'test-student-2' })
    check('the teacher note is saved, with who wrote it', withNote.notes[0]?.text.startsWith('Talked with the parents') && withNote.notes[0]?.byName === 'Test Teacher 1')
  })
  await as('test-student-2', async ({ db }) => {
    let blocked = false
    try { await getDocs(collection(db, 'classes', CLASS, 'notes')) } catch { blocked = true }
    check('the student cannot read teacher notes', blocked)
  })
  check('another teacher cannot read or add notes in this class', await as('test-teacher-2', ({ call }) => refused(() => call('studentDetails', { classId: CLASS, studentId: 'test-student-2' }))))

  console.log('Teacher changes any score (REQ-5.15)')
  await as('test-teacher-1', async ({ call }) => {
    const r = await call('gradeAnswer', { classId: CLASS, lessonId: LESSON, studentId: 'test-student-2', questionId: level1.id, score: 1 })
    check('a wrong automatic answer changed to full marks', r.state.score === 1 && r.state.changedByTeacher === true && r.state.result === 'wrong')
    check('the lesson grade is recalculated', r.grade.percent === 100)
    check('an unanswered question cannot be scored', await refused(() => call('gradeAnswer', { classId: CLASS, lessonId: LESSON, studentId: 'test-student-2', questionId: questions.find((q) => q.id !== level1.id).id, score: 1 })))
  })

  console.log('Send back for corrections and for review (REQ-5.14)')
  await as('test-student-4', async ({ call, app }) => {
    for (const q of questions) {
      if (q.kind === 'audio') await answerWithRecording(app, call, 'test-student-4', LESSON, q.id).catch(notMine)
      else await call('answer', { lessonId: LESSON, questionId: q.id, value: right(q) }).catch(notMine)
    }
  })
  check('a lesson not finished cannot be sent back for review', await as('test-teacher-1', ({ call }) => refused(() => call('sendBack', { classId: CLASS, lessonId: LESSON, studentId: 'test-student-2', mode: 'review' }))))
  await as('test-teacher-1', async ({ call }) => {
    const r = await call('sendBack', { classId: CLASS, lessonId: LESSON, studentId: 'test-student-4', mode: 'corrections', questionIds: [level1.id], note: 'Explain your choice this time.' })
    check('the teacher sends one question back for corrections', r.sent.length === 1 && r.sent[0] === level1.id)
  })
  await as('test-student-4', async ({ db, call }) => {
    let p = (await getDoc(doc(db, 'progress', `test-student-4__${LESSON}`))).data()
    check('the lesson is no longer finished, the question can be answered again', p.finished === false && !p.questions[level1.id] && p.history[level1.id].length === 1)
    check('the student sees the teacher\'s note', p.sentBack.mode === 'corrections' && p.sentBack.note === 'Explain your choice this time.' && p.sentBack.done === false)
    const again = await call('answer', { lessonId: LESSON, questionId: level1.id, value: wrong(level1, secret[level1.id]) })
    check('the new answer is checked again, with 2 attempts as new', again.reply.result === 'tryAgain')
    await call('answer', { lessonId: LESSON, questionId: level1.id, value: secret[level1.id].correct })
    p = (await getDoc(doc(db, 'progress', `test-student-4__${LESSON}`))).data()
    check('after answering again, the lesson is finished and the corrections are done', p.finished === true && p.sentBack.done === true && p.questions[level1.id].score === 0.5)
  })
  await as('test-teacher-1', async ({ call }) => {
    await call('sendBack', { classId: CLASS, lessonId: LESSON, studentId: 'test-student-4', mode: 'review', note: 'Read my comments, please.', mustReturn: false })
    const r = await call('lessonResults', { classId: CLASS, lessonId: LESSON })
    const s4 = r.students.find((s) => s.id === 'test-student-4')
    check('the teacher sees the lesson as sent back for review', s4.sentBack?.mode === 'review' && !s4.sentBack.done && s4.earlier[level1.id] === 1)
    check('the teacher chose "at their own time" (D-68)', s4.sentBack?.mustReturn === false)
  })
  await as('test-student-4', async ({ db, call }) => {
    await call('readComments', { lessonId: LESSON })
    const p = (await getDoc(doc(db, 'progress', `test-student-4__${LESSON}`))).data()
    check('"I\'ve read the comments" marks the review as done', p.sentBack.done === true && p.finished === true)
    check('a student cannot send work back', await refused(() => call('sendBack', { classId: CLASS, lessonId: LESSON, studentId: 'test-student-4', mode: 'review' })))
  })
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
  await restoreTeachers()
}

console.log(`\n${count - failures} of ${count} priority 2 tests passed.`)
finish(failures ? 1 : 0)

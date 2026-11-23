#!/usr/bin/env node
// End-to-end test of the first priority 3 features on the test site: REQ-5.5 co-teachers,
// REQ-5.21 archiving courses, REQ-9.6 teacher changes a student's language. (REQ-4.9 library search
// and REQ-5.29 success rates are worked out by the website.) Cleans up after itself.
//
//   node tools/test-priority3.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { arrayRemove, collection, deleteDoc, deleteField, doc, getDoc, getDocs, initializeFirestore, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig } from './lib/connect.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const CLASS = 'test-class'
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
const lesson = (await getDoc(doc(ldb, 'lessons', LESSON))).data()
const v = String(lesson.currentVersion)
const version = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v))).data()
const secret = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v, 'secret', 'answers'))).data().questions
const q = version.topics.flatMap((t) => t.blocks).find((b) => b.type === 'question' && b.kind === 'choice' && (b.level ?? 1) === 1)

async function cleanUp() {
  for (const a of (await getDocs(collection(ldb, 'classes', CLASS, 'assignments'))).docs) if (a.data().createdBy !== 'evolora-loader') await deleteDoc(a.ref)
  await updateDoc(doc(ldb, 'classes', CLASS), { teacherIds: arrayRemove('test-teacher-2'), teacherNames: arrayRemove('Test Teacher 2') })
  await deleteDoc(doc(ldb, 'progress', `test-student-2__${LESSON}`))
  for (const a of (await getDocs(query(collection(ldb, 'classes', CLASS, 'assignments'), where('courseId', '==', 'circles-demo')))).docs) await updateDoc(a.ref, { archived: deleteField() })
  await setDoc(doc(ldb, 'users', 'test-student-1'), { language: deleteField() }, { merge: true })
}

await cleanUp()
try {
  console.log('Co-teachers (REQ-5.5)')
  await as('test-teacher-1', async ({ call }) => {
    check('an email that is not a teacher is refused', (await call('addTeacher', { classId: CLASS, email: 'student3@evolora.test' })).result === 'notTeacher')
    const r = await call('addTeacher', { classId: CLASS, email: 'Teacher2@evolora.test' })
    check('Test Teacher 1 adds Test Teacher 2 to the class', r.result === 'added' && r.name === 'Test Teacher 2', JSON.stringify(r))
  })
  await as('test-teacher-2', async ({ db, call }) => {
    check('Test Teacher 2 sees the class and its students', (await call('classOverview', { classId: CLASS })).students.length === 6)
    check('and can read it directly too', (await getDoc(doc(db, 'classes', CLASS))).exists())
  })
  await as('test-student-2', ({ call }) => call('answer', { lessonId: LESSON, questionId: q.id, value: secret[q.id].correct }))
  await as('test-teacher-1', ({ call }) => call('gradeAnswer', { classId: CLASS, lessonId: LESSON, studentId: 'test-student-2', questionId: q.id, score: 0.8 }))
  await as('test-teacher-2', ({ call }) => call('gradeAnswer', { classId: CLASS, lessonId: LESSON, studentId: 'test-student-2', questionId: q.id, score: 0.9 }))
  const p = (await getDoc(doc(ldb, 'progress', `test-student-2__${LESSON}`))).data()
  check('Teacher A sets 80, Teacher B then 90: the grade is 90', p.questions[q.id].score === 0.9 && p.grade.percent === 90)

  await as('test-teacher-1', async ({ call }) => {
    const r = await call('removeTeacher', { classId: CLASS, teacherId: 'test-teacher-2' })
    check('Test Teacher 1 removes Test Teacher 2 from the class', r.ok === true && r.self === false)
    let last = false
    try { await call('removeTeacher', { classId: CLASS, teacherId: 'test-teacher-1' }) } catch (e) { last = e.code === 'functions/failed-precondition' }
    check('the last teacher of a class cannot be removed', last)
  })
  check('after removal, Test Teacher 2 no longer sees the class', await as('test-teacher-2', async ({ call }) => { try { await call('classOverview', { classId: CLASS }); return false } catch (e) { return e.code === 'functions/permission-denied' } }))

  console.log('Archiving a course (REQ-5.21)')
  await as('test-teacher-1', ({ call }) => call('archiveCourse', { classId: CLASS, courseId: 'circles-demo', archived: true }))
  await as('test-student-3', async ({ db }) => {
    const a = (await getDocs(query(collection(db, 'classes', CLASS, 'assignments'), where('everyone', '==', true)))).docs.find((d) => d.data().courseId === 'circles-demo')
    check('every student\'s class page gets the course as archived', a?.data().archived === true)
    check('its lessons can still be read', (await getDoc(doc(db, 'lessons', LESSON))).exists())
  })
  await as('test-teacher-1', async ({ call }) => {
    const o = await call('classOverview', { classId: CLASS })
    check('the teacher still sees its grades', o.columns.includes(LESSON) && o.courses.find((c) => c.courseId === 'circles-demo')?.archived === true)
    await call('archiveCourse', { classId: CLASS, courseId: 'circles-demo', archived: false })
  })

  console.log("Changing a student's language (REQ-9.6)")
  await as('test-teacher-1', ({ call }) => call('setStudentLanguage', { classId: CLASS, studentId: 'test-student-1', language: 'he' }))
  check("the student's saved language is now Hebrew", (await getDoc(doc(ldb, 'users', 'test-student-1'))).data().language === 'he')
  check('a student cannot change another student\'s language', await as('test-student-2', async ({ call }) => {
    try { await call('setStudentLanguage', { classId: CLASS, studentId: 'test-student-1', language: 'ar' }); return false } catch (e) { return e.code === 'functions/permission-denied' }
  }))

  console.log('Minimum questions per topic, set when giving (REQ-4.21, 5.9)')
  const practiceDefault = (await getDoc(doc(ldb, 'lessons', 'circles-practice'))).data().minimumPerTopic
  check("before: the lesson's default", (await as('test-student-6', ({ call }) => call('lessonView', { lessonId: 'circles-practice' }))).minimum === practiceDefault)
  await as('test-teacher-1', ({ call }) => call('assign', { classId: CLASS, lessonIds: ['circles-practice'], studentIds: ['test-student-6'], minimumPerTopic: 1 }))
  check("after the teacher sets 1, the student's lesson asks for 1 per topic", (await as('test-student-6', ({ call }) => call('lessonView', { lessonId: 'circles-practice' }))).minimum === 1)
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
}

console.log(`\n${count - failures} of ${count} priority 3 tests passed.`)
finish(failures ? 1 : 0)

#!/usr/bin/env node
// End-to-end test of classes, class codes and assignments on the test site (system-design 2.6, 8.1):
// REQ-5.1, 5.2, 5.4, 5.6, 5.7 and finishing a lesson (D-55), through the class service in the cloud.
// Run after tools/reset-test-site.mjs. It makes its own class (taught by Test Teacher 2) and
// removes it again at the end, so the test site is left as the reset made it.
//
//   node tools/test-classes.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { arrayRemove, collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig } from './lib/connect.mjs'
import { answerWithRecording, soloTeacher } from './lib/test-helpers.mjs'
import { ALPHABET, checkCharacter, makeCode } from '../functions/classcode.js'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
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
  try { await action(); return false } catch (e) { return e.code === 'functions/permission-denied' || e.code === 'permission-denied' }
}

// Assignments a student can see in a class, as the student's pages read them.
async function visibleAssignments(db, classId, uid) {
  const col = collection(db, 'classes', classId, 'assignments')
  const [all, mine] = await Promise.all([getDocs(query(col, where('everyone', '==', true))), getDocs(query(col, where('studentIds', 'array-contains', uid)))])
  const seen = new Map()
  for (const d of [...all.docs, ...mine.docs]) seen.set(d.id, d.data())
  return [...seen.values()]
}

const loader = await connect('test')
const ldb = loader.db
const S = { four: 'test-student-4', five: 'test-student-5', six: 'test-student-6', seven: 'test-student-7', three: 'test-student-3' }
for (const uid of Object.values(S)) await deleteDoc(doc(ldb, 'joinAttempts', uid))
let classId = null
let code = null
let finalCode = null

try {
  console.log('Test Teacher 2 creates a class (REQ-5.1)')
  await as('test-teacher-2', async ({ db, call }) => {
    const r = await call('createClass', { name: 'Automatic test class' })
    classId = r.classId
    code = r.code
    check('the class is created with a 7-character code', !!classId && /^[A-Z2-9]{7}$/.test(code))
    const c = await getDoc(doc(db, 'classes', classId))
    check('the teacher sees it, with the code and joining on', c.exists() && c.data().code === code && c.data().joiningOpen === true && c.data().teacherIds.includes('test-teacher-2'))
    const mine = await getDocs(query(collection(db, 'classes'), where('teacherIds', 'array-contains', 'test-teacher-2')))
    check('it is in the list of their classes', mine.docs.some((d) => d.id === classId))
  })
  check('a student cannot create a class', await as(S.seven, ({ call }) => refused(() => call('createClass', { name: 'x' }))))

  console.log('Test Student 7 (no class) joins with the code (REQ-5.2)')
  await as(S.seven, async ({ db, call }) => {
    const typo = code.slice(0, 2) + ALPHABET[(ALPHABET.indexOf(code[2]) + 1) % ALPHABET.length] + code.slice(3)
    check('a code with one character mistyped gets "check the code"', (await call('joinClass', { code: typo })).result === 'checkCode')
    let other = makeCode()
    while (other === code) other = makeCode()
    check('a well-formed code of no class gets "no class has this code"', (await call('joinClass', { code: other })).result === 'noClass')
    const r = await call('joinClass', { code: code.toLowerCase() })
    check('the right code, in lower case, joins at once', r.result === 'joined' && r.classId === classId)
    const m = await getDoc(doc(db, 'memberships', S.seven))
    check('the class is now in the student\'s list', m.data().classIds.includes(classId))
    check('the student can read the class', (await getDoc(doc(db, 'classes', classId))).exists())
    check('joining again says they are already in it', (await call('joinClass', { code })).result === 'already')
  })
  await as(S.six, async ({ db, call }) => {
    check('Test Student 6 joins too (a second class for them, REQ-5.6)', (await call('joinClass', { code })).result === 'joined')
    const m = await getDoc(doc(db, 'memberships', S.six))
    check('Test Student 6 is now in 2 classes', m.data().classIds.includes('test-class') && m.data().classIds.includes(classId))
  })

  console.log('Giving lessons (REQ-5.7)')
  await as('test-teacher-2', async ({ call }) => {
    await call('assign', { classId, courseId: 'circles-demo', studentIds: null })
    await call('assign', { classId, lessonIds: ['archimedes-density-teaching'], studentIds: [S.seven] })
    check('the teacher gives a course to the whole class and a lesson to one student', true)
    let bad = false
    try { await call('assign', { classId, lessonIds: ['archimedes-density-teaching'], studentIds: ['test-student-1'] }) } catch { bad = true }
    check('a student who is not in the class cannot be chosen', bad)
  })
  check("Test Teacher 1 cannot give lessons in Test Teacher 2's class", await as('test-teacher-1', ({ call }) => refused(() => call('assign', { classId, courseId: 'circles-demo', studentIds: null }))))
  await as(S.seven, async ({ db }) => {
    const a = await visibleAssignments(db, classId, S.seven)
    check('the chosen student sees the course and the lesson given only to them', a.some((x) => x.courseId === 'circles-demo') && a.some((x) => x.lessonIds.includes('archimedes-density-teaching') && !x.everyone))
    check('the chosen student can read that lesson', (await getDoc(doc(db, 'lessons', 'archimedes-density-teaching'))).exists())
  })
  await as(S.six, async ({ db }) => {
    const a = await visibleAssignments(db, classId, S.six)
    check('another student sees the course but not the lesson given to someone else', a.some((x) => x.courseId === 'circles-demo') && !a.some((x) => x.lessonIds.includes('archimedes-density-teaching')))
  })
  await as(S.five, async ({ db, call }) => {
    check('Test Student 5 joins after the lessons were given', (await call('joinClass', { code })).result === 'joined')
    const a = await visibleAssignments(db, classId, S.five)
    check('a student who joins later gets the whole-class course', a.some((x) => x.courseId === 'circles-demo'))
  })

  console.log('Joining off, and a new code (REQ-5.2)')
  await as('test-teacher-2', ({ call }) => call('setJoining', { classId, open: false }))
  await as(S.four, async ({ call }) => {
    const r = await call('joinClass', { code })
    check('with joining off, the student is told the class is closed', r.result === 'closed' && r.className === 'Automatic test class')
  })
  finalCode = await as('test-teacher-2', async ({ call }) => {
    await call('setJoining', { classId, open: true })
    return (await call('newClassCode', { classId })).code
  })
  check('the teacher makes a new, different code', !!finalCode && finalCode !== code)
  await as(S.four, async ({ call }) => {
    check('the old code no longer works', (await call('joinClass', { code })).result === 'noClass')
    check('the new code works', (await call('joinClass', { code: finalCode })).result === 'joined')
  })

  console.log('10 wrong codes in a row (REQ-5.2)')
  await as(S.three, async ({ call }) => {
    const results = []
    for (let i = 0; i < 10; i++) {
      const first6 = makeCode().slice(0, 6)
      results.push((await call('joinClass', { code: first6 + checkCharacter(first6) })).result)
    }
    check('the first 9 wrong codes say "no class has this code"', results.slice(0, 9).every((r) => r === 'noClass'), results.join(','))
    check('the 10th asks the student to wait', results[9] === 'wait')
    const after = await call('joinClass', { code: finalCode })
    check('while waiting, even the right code must wait 5 minutes', after.result === 'wait' && after.minutes === 5)
  })
  await deleteDoc(doc(ldb, 'joinAttempts', S.three))

  console.log('Finishing a lesson (D-55), and removing a student (REQ-5.4)')
  const lesson = (await getDoc(doc(ldb, 'lessons', 'circles-teaching'))).data()
  const version = (await getDoc(doc(ldb, 'lessons', 'circles-teaching', 'versions', String(lesson.currentVersion)))).data()
  const secret = (await getDoc(doc(ldb, 'lessons', 'circles-teaching', 'versions', String(lesson.currentVersion), 'secret', 'answers'))).data().questions
  for (const uid of [S.seven]) await deleteDoc(doc(ldb, 'progress', `${uid}__circles-teaching`))
  await as(S.seven, async ({ db, call, app }) => {
    const questions = version.topics.flatMap((t) => t.blocks.filter((b) => b.type === 'question'))
    const first = await call('finishLesson', { lessonId: 'circles-teaching' })
    check('a lesson with unanswered questions is not marked finished', first.finished === false)
    for (const q of questions) {
      if (q.kind === 'audio') { await answerWithRecording(app, call, S.seven, 'circles-teaching', q.id).catch(notMine); continue }
      const value = q.kind === 'choice' ? secret[q.id].correct : q.kind === 'number' ? String(secret[q.id].answer) : 'My answer for the test.'
      await call('answer', { lessonId: 'circles-teaching', questionId: q.id, value }).catch(notMine)
    }
    const p = (await getDoc(doc(db, 'progress', `${S.seven}__circles-teaching`))).data()
    check('after the last answer the lesson is marked finished', p.finished === true)
  })
  await as('test-teacher-2', async ({ db, call }) => {
    await call('removeStudent', { classId, studentId: S.seven })
    const s = await getDoc(doc(db, 'classes', classId, 'students', S.seven))
    check('the teacher still has the removed student, marked as removed', s.exists() && s.data().removed === true)
    const o = await call('classOverview', { classId })
    check("the removed student's page stays open to the teacher", (o.removedStudents || []).some((r) => r.id === S.seven) && !o.students.some((r) => r.id === S.seven))
    check("the removed student's work is kept for the teacher", (await getDoc(doc(db, 'progress', `${S.seven}__circles-teaching`))).exists())
  })
  await as(S.seven, async ({ db, call }) => {
    const m = await getDoc(doc(db, 'memberships', S.seven))
    check('the removed student no longer has the class', !(m.data().classIds || []).includes(classId))
    let blocked = false
    try { await getDoc(doc(db, 'classes', classId)) } catch { blocked = true }
    check('the removed student can no longer read the class', blocked)
    check('the removed student can no longer answer its lessons', await refused(() => call('answer', { lessonId: 'archimedes-density-teaching', questionId: 'x', value: ['c1'] })))
    check('the student cannot remove themselves from a class (only the teacher)', await refused(() => call('removeStudent', { classId: 'test-class', studentId: S.seven })))
  })
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  // Leave the test site as the reset made it.
  if (classId) {
    for (const sub of ['students', 'assignments', 'levels']) for (const d of (await getDocs(collection(ldb, 'classes', classId, sub))).docs) await deleteDoc(d.ref)
    for (const c of [code, finalCode]) if (c) await deleteDoc(doc(ldb, 'classCodes', c))
    await deleteDoc(doc(ldb, 'classes', classId))
    for (const uid of [S.four, S.five, S.six]) await updateDoc(doc(ldb, 'memberships', uid), { classIds: arrayRemove(classId) }).catch(() => {})
    await deleteDoc(doc(ldb, 'memberships', S.seven))
    for (const l of (await getDocs(collection(ldb, 'lessons'))).docs) if ((l.data().classIds || []).includes(classId)) await updateDoc(l.ref, { classIds: arrayRemove(classId) })
    for (const c of (await getDocs(collection(ldb, 'courses'))).docs) if ((c.data().classIds || []).includes(classId)) await updateDoc(c.ref, { classIds: arrayRemove(classId) })
  }
  await deleteDoc(doc(ldb, 'progress', `${S.seven}__circles-teaching`))
  for (const uid of Object.values(S)) await deleteDoc(doc(ldb, 'joinAttempts', uid))
  // Test Student 4 was in the test class before; make sure that is unchanged.
  const m4 = await getDoc(doc(ldb, 'memberships', S.four))
  if (!m4.exists()) await setDoc(doc(ldb, 'memberships', S.four), { classIds: ['test-class'] })
}

console.log(`\n${count - failures} of ${count} class tests passed.`)
finish(failures ? 1 : 0)

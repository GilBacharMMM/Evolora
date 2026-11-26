#!/usr/bin/env node
// Fills, or resets, the test site with the standard test data (REQ-12.6). Test site only.
//
//   node tools/reset-test-site.mjs
//   node tools/reset-test-site.mjs --skip-images    (if file storage isn't switched on yet)
//
// After a reset the test site has:
// - the test users from web/src/test-site/test-users.json: 2 test teachers, test students
//   at levels 1, 2 and 3, and one student who hasn't joined any class (REQ-10.1)
// - a test school with both test teachers (D-69)
// - one test class, taught by Test Teacher 1, with test students 1 to 6, a class code,
//   and joining turned on (REQ-5.2)
// - the three demo lessons, and the two demo courses given to the whole test class (REQ-5.7)
// - the demo exam (not given to anyone; the teacher gives it to try exams, REQ-4.26)
// - no answers, red flags or other work left over
//
// People who signed in with their own Google accounts keep their sign-in, and staff
// added with tools/admin.mjs keep their role, but they are no longer in any class.

import fs from 'node:fs'
import path from 'node:path'
import { collection, deleteDoc, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { deleteObject, listAll, ref } from 'firebase/storage'
import { ROOT, connect, finish, importAccounts, siteConfig, testPassword } from './lib/connect.mjs'
import { loadAll } from './load.mjs'
import { addSchool, openCourseToClass, setStaff } from './admin.mjs'
import { agreeTestUsers, readTermsFiles, saveTerms } from './load-terms.mjs'
import { fillStudent5 } from './fill-student-5.mjs'
import { makeCode } from '../functions/classcode.js'

const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const CLASS_ID = 'test-class'
const LESSONS_AND_COURSES = ['courses/density-demo.md', 'courses/circles-demo.md', 'lessons/circles-exam']

async function deleteAll(db, ...pathSegments) {
  const snap = await getDocs(collection(db, ...pathSegments))
  for (const d of snap.docs) await deleteDoc(d.ref)
  return snap.size
}

async function wipeStorage(storage, folder) {
  try {
    const list = await listAll(ref(storage, folder))
    for (const item of list.items) await deleteObject(item)
    for (const prefix of list.prefixes) await wipeStorage(storage, prefix.fullPath)
  } catch {
    // File storage not switched on yet: nothing to remove.
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const skipImages = argv.includes('--skip-images')
  const projectId = siteConfig('test').projectId

  console.log('1. Test users: creating or refreshing their sign-in accounts...')
  importAccounts(projectId, TEST.users.map((u) => ({ ...u, password: testPassword(u) })))
  const conn = await connect('test')
  const { db, storage } = conn

  console.log('2. Removing the old test data...')
  for (const lesson of (await getDocs(collection(db, 'lessons'))).docs) {
    for (const v of (await getDocs(collection(lesson.ref, 'versions'))).docs) {
      await deleteAll(db, 'lessons', lesson.id, 'versions', v.id, 'secret')
      await deleteDoc(v.ref)
    }
    await deleteDoc(lesson.ref)
  }
  await deleteAll(db, 'courses')
  for (const cls of (await getDocs(collection(db, 'classes'))).docs) {
    await deleteAll(db, 'classes', cls.id, 'students')
    await deleteAll(db, 'classes', cls.id, 'levels')
    await deleteAll(db, 'classes', cls.id, 'assignments')
    await deleteDoc(cls.ref)
  }
  await deleteAll(db, 'memberships')
  await deleteAll(db, 'classCodes')
  await deleteAll(db, 'joinAttempts')
  await deleteAll(db, 'progress')
  await deleteAll(db, 'flags')
  for (const s of (await getDocs(collection(db, 'staff'))).docs) if (s.id.endsWith('@evolora.test')) await deleteDoc(s.ref)
  for (const u of TEST.users) await deleteDoc(doc(db, 'users', u.uid))
  await wipeStorage(storage, 'lessons')

  console.log('3. Creating the test teachers, students and class...')
  const teachers = TEST.users.filter((u) => u.role === 'teacher')
  const students = TEST.users.filter((u) => u.role === 'student')
  // Both test teachers are in the same test school, so they can teach a class together (D-69).
  await addSchool(db, 'test-school', 'Test School')
  for (const t of teachers) await setStaff(db, t.email, 'teacher', t.name, 'test-school')
  const batch = writeBatch(db)
  for (const u of TEST.users) batch.set(doc(db, 'users', u.uid), { name: u.name, email: u.email, createdAt: serverTimestamp() })
  const classTeacher = teachers[0]
  const classCode = makeCode()
  batch.set(doc(db, 'classes', CLASS_ID), {
    name: 'Test Class 7A',
    teacherIds: [classTeacher.uid],
    teacherNames: [classTeacher.name],
    color: '#0E6B73',
    courseIds: [],
    code: classCode,
    joiningOpen: true,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(db, 'classCodes', classCode), { classId: CLASS_ID, createdAt: serverTimestamp() })
  for (const s of students) {
    if (s.noClass) continue
    batch.set(doc(db, 'memberships', s.uid), { classIds: [CLASS_ID] })
    batch.set(doc(db, 'classes', CLASS_ID, 'students', s.uid), { name: s.name, email: s.email, joinedAt: serverTimestamp() })
    batch.set(doc(db, 'classes', CLASS_ID, 'levels', s.uid), { level: s.level, setBy: 'test data' })
  }
  await batch.commit()

  console.log('4. Loading the demo lessons and courses...')
  const report = await loadAll(conn, LESSONS_AND_COURSES, { skipImages })
  for (const line of report) console.log(`   ${line}`)

  console.log('5. Giving the demo courses to the whole test class...')
  for (const file of LESSONS_AND_COURSES.filter((f) => f.startsWith('courses/'))) await openCourseToClass(db, path.basename(file, '.md'), CLASS_ID)

  console.log('6. Terms of use: loading them; every test user agrees except Test Student 7 (D-75)...')
  const terms = readTermsFiles()
  if (terms.problems.length) throw new Error(`The terms files need fixing: ${terms.problems.join(' ')}`)
  const { version } = await saveTerms(db, terms.parsed)
  await agreeTestUsers(db, version)

  console.log('7. Test Student 5 finishes two lessons with random answers, ready for grading (REQ-12.6)...')
  for (const line of await fillStudent5(db)) console.log(`   ${line}`)

  console.log(`\nThe test site is reset to the standard test data. Test class code: ${classCode}`)
}

main().then(() => finish(0)).catch((e) => {
  console.error(`\n${e.message}`)
  finish(1)
})

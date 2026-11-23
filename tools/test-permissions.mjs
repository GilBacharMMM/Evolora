#!/usr/bin/env node
// Permission tests (system-design 8.1): signs in as each kind of test user on the test site
// and tries things that must work, and things that must be blocked (REQ-3.4, 10.1, 10.3, D-17).
// Run after tools/reset-test-site.mjs.
//
//   node tools/test-permissions.mjs

import fs from 'node:fs'
import path from 'node:path'
import { initializeApp, deleteApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, initializeFirestore, setDoc } from 'firebase/firestore'
import { getBytes, getStorage, ref } from 'firebase/storage'
import { ROOT, finish, siteConfig } from './lib/connect.mjs'

const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
setLogLevel('silent')
let failures = 0
let count = 0

async function as(uid, fn) {
  const user = TEST.users.find((u) => u.uid === uid)
  const app = initializeApp(config, uid)
  await signInWithEmailAndPassword(getAuth(app), user.email, TEST.password)
  const db = initializeFirestore(app, {})
  db.storage = getStorage(app)
  try { await fn(db) } finally { await deleteApp(app) }
}

async function expect(label, shouldWork, action) {
  count++
  let worked = true
  try { await action() } catch (e) { worked = false; if (e.code !== 'permission-denied') console.log(`    (${e.code || e.message})`) }
  const ok = worked === shouldWork
  if (!ok) failures++
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${label}: ${worked ? 'allowed' : 'blocked'}`)
}

const read = (db, ...p) => async () => { const s = await getDoc(doc(db, ...p)); if (!s.exists()) throw new Error('not found') }

await as('test-student-1', async (db) => {
  console.log('Test Student 1 (in the test class):')
  await expect('reads own class list (memberships)', true, read(db, 'memberships', 'test-student-1'))
  await expect('reads the test class', true, read(db, 'classes', 'test-class'))
  await expect('reads a course open to the class', true, read(db, 'courses', 'circles-demo'))
  await expect('reads a lesson open to the class', true, read(db, 'lessons', 'circles-teaching'))
  await expect('reads the lesson content', true, read(db, 'lessons', 'circles-teaching', 'versions', '1'))
  await expect('reads the correct answers', false, read(db, 'lessons', 'circles-teaching', 'versions', '1', 'secret', 'answers'))
  await expect('sees a lesson image', true, () => getBytes(ref(db.storage, 'lessons/circles-teaching/v1/images/circle-parts.svg')))
  await expect("reads another student's class list", false, read(db, 'memberships', 'test-student-2'))
  await expect("reads another student's record", false, read(db, 'users', 'test-student-2'))
  await expect('reads the class student list', false, () => getDocs(collection(db, 'classes', 'test-class', 'students')))
  await expect('reads own secret level', false, read(db, 'classes', 'test-class', 'levels', 'test-student-1'))
  await expect('makes itself a teacher', false, () => setDoc(doc(db, 'staff', 'student1@evolora.test'), { role: 'teacher' }))
  await expect('adds itself to another class', false, () => setDoc(doc(db, 'memberships', 'test-student-1'), { classIds: ['test-class', 'other'] }))
  await expect('changes a lesson', false, () => setDoc(doc(db, 'lessons', 'circles-teaching'), { title: 'x' }, { merge: true }))
  await expect('saves own language', true, () => setDoc(doc(db, 'users', 'test-student-1'), { language: 'he' }, { merge: true }))
  await expect('adds a made-up field to own record', false, () => setDoc(doc(db, 'users', 'test-student-1'), { role: 'admin' }, { merge: true }))
  await expect('lists all lessons', false, () => getDocs(collection(db, 'lessons')))
  // Leave the test user as the reset made it (no saved language).
  await setDoc(doc(db, 'users', 'test-student-1'), { language: deleteField() }, { merge: true })
})

await as('test-student-7', async (db) => {
  console.log('Test Student 7 (no class yet, REQ-10.1):')
  await expect('reads a lesson', false, read(db, 'lessons', 'circles-teaching'))
  await expect('reads the lesson content', false, read(db, 'lessons', 'circles-teaching', 'versions', '1'))
  await expect('reads a course', false, read(db, 'courses', 'circles-demo'))
  await expect('reads the test class', false, read(db, 'classes', 'test-class'))
  await expect('lists the people', false, () => getDocs(collection(db, 'users')))
})

await as('test-teacher-1', async (db) => {
  console.log('Test Teacher 1 (teaches the test class):')
  await expect('reads own staff entry (role)', true, read(db, 'staff', 'teacher1@evolora.test'))
  await expect('reads the test class', true, read(db, 'classes', 'test-class'))
  await expect('reads the class student list', true, () => getDocs(collection(db, 'classes', 'test-class', 'students')))
  await expect('reads the students\' levels', true, read(db, 'classes', 'test-class', 'levels', 'test-student-3'))
  await expect('lists all lessons (lesson library)', true, () => getDocs(collection(db, 'lessons')))
  await expect('reads the correct answers', true, read(db, 'lessons', 'circles-teaching', 'versions', '1', 'secret', 'answers'))
  await expect('changes a lesson (only the loading program may)', false, () => setDoc(doc(db, 'lessons', 'circles-teaching'), { title: 'x' }, { merge: true }))
  await expect('makes someone else a teacher', false, () => setDoc(doc(db, 'staff', 'student1@evolora.test'), { role: 'teacher' }))
  await expect("reads a student's private record", false, read(db, 'users', 'test-student-1'))
})

await as('test-teacher-2', async (db) => {
  console.log('Test Teacher 2 (no classes):')
  await expect('reads the test class (not theirs)', false, read(db, 'classes', 'test-class'))
  await expect('reads its student list', false, () => getDocs(collection(db, 'classes', 'test-class', 'students')))
  await expect('removes a student from it', false, () => deleteDoc(doc(db, 'classes', 'test-class', 'students', 'test-student-1')))
})

console.log(`\n${count - failures} of ${count} permission tests passed.`)
finish(failures ? 1 : 0)

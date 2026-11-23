#!/usr/bin/env node
// End-to-end test of messages (REQ-5.16, 10.2, 5.27) on the test site. Cleans up after itself.
//
//   node tools/test-messages.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { arrayRemove, collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, setDoc, updateDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig } from './lib/connect.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const CLASS = 'test-class'
const CONVO = `${CLASS}__test-student-1`
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
const blocked = async (action) => { try { await action(); return false } catch { return true } }

const loader = await connect('test')
const ldb = loader.db
async function cleanUp() {
  for (const m of (await getDocs(collection(ldb, 'conversations', CONVO, 'messages'))).docs) await deleteDoc(m.ref)
  await deleteDoc(doc(ldb, 'conversations', CONVO))
  await updateDoc(doc(ldb, 'classes', CLASS), { teacherIds: arrayRemove('test-teacher-2'), teacherNames: arrayRemove('Test Teacher 2') })
}

await cleanUp()
try {
  // Test Teacher 2 as a co-teacher, to check that both teachers share the conversation.
  await as('test-teacher-1', ({ call }) => call('addTeacher', { classId: CLASS, email: 'teacher2@evolora.test' }))
  await as('test-student-1', ({ call }) => call('sendMessage', { classId: CLASS, text: 'I did not understand question 3.' }))
  await as('test-teacher-1', async ({ db, call }) => {
    const h = await call('teacherHome', {})
    check('the teacher home counts the unread message and lists it in To do', (h.classes.find((c) => c.id === CLASS)?.unread ?? 0) >= 1 && h.todo.some((i) => i.kind === 'message' && i.studentId === 'test-student-1'))
    const msgs = await getDocs(collection(db, 'conversations', CONVO, 'messages'))
    check('Test Teacher 1 reads the student\'s question', msgs.docs.some((d) => d.data().text.startsWith('I did not understand')))
  })
  await as('test-teacher-2', async ({ db, call }) => {
    check('the co-teacher sees it too', (await getDocs(collection(db, 'conversations', CONVO, 'messages'))).size === 1)
    await call('sendMessage', { classId: CLASS, studentId: 'test-student-1', text: 'Look at the picture of the circle again.' })
    await call('markRead', { classId: CLASS, studentId: 'test-student-1' })
  })
  await as('test-student-1', async ({ db, call }) => {
    const c = (await getDoc(doc(db, 'conversations', CONVO))).data()
    check('the student sees a notice that a teacher replied', c.unreadByStudent === true && c.unreadByTeacher === false)
    await call('markRead', { classId: CLASS })
    check('after reading, the notice goes away', (await getDoc(doc(db, 'conversations', CONVO))).data().unreadByStudent === false)
  })
  await cleanUp()
  await as('test-student-1', ({ call }) => call('sendMessage', { classId: CLASS, text: 'Second question.' }))
  await as('test-student-2', async ({ db, call }) => {
    check("another student cannot read the conversation", await blocked(() => getDocs(collection(db, 'conversations', CONVO, 'messages'))))
    check('a student cannot write into another student\'s conversation', await blocked(() => call('sendMessage', { classId: CLASS, studentId: 'test-student-1', text: 'hi' })) || (await getDocs(collection(ldb, 'conversations', CONVO, 'messages'))).size === 1)
    check('students cannot write messages directly', await blocked(() => setDoc(doc(collection(db, 'conversations', CONVO, 'messages')), { text: 'x' })))
  })
  await as('test-teacher-2', async ({ db }) => {
    check('a teacher of a different class cannot see it', await blocked(() => getDocs(collection(db, 'conversations', CONVO, 'messages'))))
  })
  await as('test-student-7', async ({ call }) => {
    check('someone not in the class cannot message its teachers', await blocked(() => call('sendMessage', { classId: CLASS, text: 'hello' })))
  })
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
}

console.log(`\n${count - failures} of ${count} message tests passed.`)
finish(failures ? 1 : 0)

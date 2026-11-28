#!/usr/bin/env node
// End-to-end test of teachers' comments on lessons (REQ-4.27, D-93) on the test site: a teacher
// sends a comment, the system admin sees it in the inbox and marks it, the teacher sees the mark;
// students and other teachers can't read or change comments. Removes its own comments at the end.
//
//   node tools/test-comments.mjs

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
const LESSON = 'particle-model-teaching-1'
const MARK = `test-comments-${Date.now()}`
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
  const call = async (name, data = {}) => (await httpsCallable(getFunctions(app, 'me-west1'), name)(data)).data
  try {
    return await fn({ db, call })
  } finally {
    await deleteApp(app)
  }
}
const refused = async (p) => {
  try {
    await p
    return null
  } catch (e) {
    return String(e.message || e.code).replace(/\s*\[\d+\]$/, '')
  }
}

const { db: ldb } = await connect('test')
const cleanUp = async () => {
  for (const d of (await getDocs(query(collection(ldb, 'lessonComments'), where('lessonId', '==', LESSON)))).docs) if (String(d.data().text).includes(MARK)) await deleteDoc(d.ref)
}

try {
  console.log('A teacher sends a comment (REQ-4.27)')
  const sent = await as('test-teacher-1', ({ call }) =>
    call('sendComment', { lessonId: LESSON, version: 1, topicNumber: 1, place: '1-0', quote: 'מודל החלקיקים הוא מודל מדעי', text: `כדאי להגדיר כאן מה זה מודל. ${MARK}` }),
  )
  check('the comment is saved', typeof sent.id === 'string')
  check('an empty comment is refused', !!(await refused(as('test-teacher-1', ({ call }) => call('sendComment', { lessonId: LESSON, quote: 'x', text: '   ' })))))
  check('a comment without marked words is refused', !!(await refused(as('test-teacher-1', ({ call }) => call('sendComment', { lessonId: LESSON, quote: '', text: 'hello' })))))
  check('a student cannot send a comment', !!(await refused(as('test-student-1', ({ call }) => call('sendComment', { lessonId: LESSON, quote: 'x', text: MARK })))))

  console.log('The system admin sees it in the inbox')
  const inbox = await as('test-admin', ({ call }) => call('commentsInbox'))
  const mine = inbox.comments.find((c) => c.id === sent.id)
  check('the inbox lists it with the lesson, place, marked words, comment and teacher', !!mine && mine.lessonTitle === 'מודל החלקיקים של החומר' && mine.place === '1-0' && mine.quote.startsWith('מודל החלקיקים') && mine.byName.length > 0 && mine.status === 'new')
  check('the inbox counts it as new', inbox.newCount >= 1)
  check('a teacher cannot open the inbox', !!(await refused(as('test-teacher-1', ({ call }) => call('commentsInbox')))))
  check('a teacher cannot mark comments', !!(await refused(as('test-teacher-2', ({ call }) => call('setCommentStatus', { id: sent.id, status: 'done' })))))

  console.log('Marking it, and the teacher seeing the mark')
  await as('test-admin', ({ call }) => call('setCommentStatus', { id: sent.id, status: 'done' }))
  const teacherView = await as('test-teacher-1', ({ call }) => call('myComments'))
  check('the teacher sees the comment marked "done"', teacherView.comments.find((c) => c.id === sent.id)?.status === 'done')
  const other = await as('test-teacher-2', ({ call }) => call('myComments'))
  check("another teacher doesn't see it among their own comments", !other.comments.some((c) => c.id === sent.id))
  check('a made-up mark is refused', !!(await refused(as('test-admin', ({ call }) => call('setCommentStatus', { id: sent.id, status: 'maybe' })))))

  console.log('Nobody reads comments directly')
  await as('test-student-1', async ({ db }) => check("a student can't read comments", !!(await refused(getDoc(doc(db, 'lessonComments', sent.id))))))
  await as('test-teacher-1', async ({ db }) => check("a teacher can't read comments directly", !!(await refused(getDoc(doc(db, 'lessonComments', sent.id))))))

  console.log('Email (once the email service is set up)')
  const settings = (await getDoc(doc(ldb, 'settings', 'email'))).data()
  const mails = (await getDocs(collection(ldb, 'mail'))).docs.filter((d) => String(d.data().message?.html || '').includes(MARK))
  check(settings?.enabled ? 'an email to the admin was written' : 'no email is written while the email service is off', settings?.enabled ? mails.length === 1 : mails.length === 0)
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
}
console.log(`\n${count - failures} of ${count} comment tests passed.`)
finish(failures ? 1 : 0)

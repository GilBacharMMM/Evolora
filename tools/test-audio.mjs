#!/usr/bin/env node
// End-to-end test of recorded answers and audio comments (REQ-6.6, 5.13, D-67) on the test site,
// with the demo audio question at the end of the circles lesson. Cleans up after itself.
// (Recording with the microphone itself happens in Chrome; this test sends a small sound file.)
//
//   node tools/test-audio.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { deleteDoc, doc, getDoc, initializeFirestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { deleteObject, getBytes, getStorage, listAll, ref, uploadBytes } from 'firebase/storage'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const CLASS = 'test-class'
const LESSON = 'circles-teaching-1'
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
  const storage = getStorage(app)
  const fns = getFunctions(app, 'me-west1')
  const call = async (name, data) => (await httpsCallable(fns, name)(data)).data
  try { return await fn({ db, storage, call }) } finally { await deleteApp(app) }
}
const fails = async (action) => { try { await action(); return false } catch { return true } }
const sound = new Uint8Array(2000).fill(7) // a tiny stand-in for a recording
const audio = { contentType: 'audio/webm' }

const loader = await connect('test')
const ldb = loader.db
const version = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', String((await getDoc(doc(ldb, 'lessons', LESSON))).data().currentVersion)))).data()
const q = version.topics.flatMap((t) => t.blocks).find((b) => b.type === 'question' && b.kind === 'audio')
const answerPath = `recordings/test-student-1/${LESSON}/${q?.id}/test.webm`
const commentPath = `comments/test-student-1/${LESSON}/${q?.id}/test.webm`

async function cleanUp() {
  await deleteDoc(doc(ldb, 'progress', `test-student-1__${LESSON}`))
  for (const folder of [`recordings/test-student-1/${LESSON}`, `comments/test-student-1/${LESSON}`]) {
    const qs = await listAll(ref(loader.storage, folder)).catch(() => ({ prefixes: [] }))
    for (const p of qs.prefixes) for (const f of (await listAll(p)).items) await deleteObject(f).catch(() => {})
  }
}

await cleanUp()
try {
  check('the circles lesson has an audio question', !!q)
  console.log('A student records an answer (REQ-6.6)')
  await as('test-student-1', async ({ storage, call }) => {
    await uploadBytes(ref(storage, answerPath), sound, audio)
    check('the student saves a recording in their own folder', true)
    check("they can't save into another student's folder", await fails(() => uploadBytes(ref(storage, `recordings/test-student-2/${LESSON}/${q.id}/x.webm`), sound, audio)))
    check("they can't save a file that isn't sound", await fails(() => uploadBytes(ref(storage, `recordings/test-student-1/${LESSON}/${q.id}/x.txt`), sound, { contentType: 'text/plain' })))
    check("they can't save a recording that is too long (over 2 MB)", await fails(() => uploadBytes(ref(storage, `recordings/test-student-1/${LESSON}/${q.id}/big.webm`), new Uint8Array(2.5 * 1024 * 1024), audio)))
    check("an answer pointing at someone else's file is refused", await fails(() => call('answer', { lessonId: LESSON, questionId: q.id, value: `recordings/test-student-2/${LESSON}/${q.id}/x.webm` })))
    const r = await call('answer', { lessonId: LESSON, questionId: q.id, value: answerPath })
    check('sending the recording saves it for the teacher (pending)', r.state.result === 'pending')
    check('once sent, it can\'t be changed', (await call('answer', { lessonId: LESSON, questionId: q.id, value: answerPath })).reply.already === true)
  })

  console.log('Who can listen (D-67)')
  const results = await as('test-teacher-1', ({ call }) => call('lessonResults', { classId: CLASS, lessonId: LESSON }))
  const link = results.students.find((x) => x.id === 'test-student-1')?.states[q.id]?.audioUrl
  check('the class teacher gets a private link to the recording, and it plays', !!link && (await fetch(link)).ok)
  check("another student can't open the student's folder", await as('test-student-2', ({ storage }) => fails(() => getBytes(ref(storage, answerPath)))))
  check("another student can't read the answer that holds the link", await as('test-student-2', ({ db }) => fails(() => getDoc(doc(db, 'progress', `test-student-1__${LESSON}`)))))
  const t2InClass = (await getDoc(doc(ldb, 'classes', CLASS))).data().teacherIds.includes('test-teacher-2')
  if (!t2InClass) check("a teacher of another class can't get the results", await as('test-teacher-2', ({ call }) => fails(() => call('lessonResults', { classId: CLASS, lessonId: LESSON }))))
  else console.log('  (skipped: Test Teacher 2 is a co-teacher of the test class right now)')

  console.log('The teacher grades it with a recorded comment (REQ-5.13)')
  const g = await as('test-teacher-1', ({ call }) => call('gradeAnswer', { classId: CLASS, lessonId: LESSON, studentId: 'test-student-1', questionId: q.id, score: 1, comment: 'Well explained!', audioData: Buffer.from(sound).toString('base64') }))
  check('the grade and the recorded comment are saved', g.state.graded === true && !!g.state.teacherAudio)
  check('the student can play the comment from their answer', (await fetch(g.state.teacherAudio)).ok)
  check("a student can't save into the comments folder", await as('test-student-1', ({ storage }) => fails(() => uploadBytes(ref(storage, `comments/test-student-1/${LESSON}/${q.id}/fake.webm`), sound, audio))))
  const big = await as('test-teacher-1', ({ call }) => fails(() => call('gradeAnswer', { classId: CLASS, lessonId: LESSON, studentId: 'test-student-1', questionId: q.id, score: 1, audioData: Buffer.alloc(2.5 * 1024 * 1024).toString('base64') })))
  check('a comment that is too long is refused', big)
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
}

console.log(`\n${count - failures} of ${count} audio tests passed.`)
finish(failures ? 1 : 0)

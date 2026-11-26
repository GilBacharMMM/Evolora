// Used by the automatic screen tests (tests/screens, system-design 8.1).
// Puts the test data the screen tests need into a known state, without wiping the whole test site.
// (A full reset, node tools/reset-test-site.mjs, would also remove the class and messages Gil keeps
// on the test site as Test Teacher 2, so the screen tests only reset what they use.)
//
// - Test Student 1: no work yet in the Archimedes lessons
// - Test Student 7: hasn't agreed to the terms of use and isn't in any class (as after a reset)
// - Test Student 5: has finished the Archimedes and circles teaching lessons (tools/fill-student-5.mjs)
// - the test class: joining on, no required class language

import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { connect } from './connect.mjs'
import { fillStudent5 } from '../fill-student-5.mjs'

export const CLASS_ID = 'test-class'
export const LESSONS = ['archimedes-density-teaching', 'archimedes-density-practice']

let conn
export async function db() {
  if (!conn) conn = await connect('test')
  return conn.db
}

export async function freshStudentWork(uid, lessons = LESSONS) {
  const d = await db()
  for (const l of lessons) {
    await deleteDoc(doc(d, 'progress', `${uid}__${l}`))
    await deleteDoc(doc(d, 'lessonTime', `${uid}__${l}`))
  }
  for (const f of (await getDocs(query(collection(d, 'flags'), where('uid', '==', uid)))).docs) {
    if (lessons.includes(f.data().lessonId)) await deleteDoc(f.ref)
  }
}

export async function setLanguage(uid, lang) {
  await setDoc(doc(await db(), 'users', uid), { language: lang }, { merge: true })
}

// Test Student 7 as after a reset: no agreement to the terms, in no class, no wrong-code wait.
export async function freshStudent7() {
  const d = await db()
  const uid = 'test-student-7'
  await setDoc(doc(d, 'users', uid), { termsAccepted: deleteField() }, { merge: true })
  const m = await getDoc(doc(d, 'memberships', uid))
  for (const classId of m.exists() ? m.data().classIds || [] : []) await deleteDoc(doc(d, 'classes', classId, 'students', uid))
  await deleteDoc(doc(d, 'memberships', uid))
  await deleteDoc(doc(d, 'joinAttempts', uid))
}

export async function classInfo() {
  const c = (await getDoc(doc(await db(), 'classes', CLASS_ID))).data()
  return { code: c.code, joiningOpen: c.joiningOpen, language: c.language ?? null, name: c.name }
}

export async function prepareClass() {
  const d = await db()
  const before = await classInfo()
  // Joining must be on, and the class must not force one language, for the tests to run in all three.
  await updateDoc(doc(d, 'classes', CLASS_ID), { joiningOpen: true, language: deleteField() })
  return async () => {
    const restore = { joiningOpen: before.joiningOpen }
    if (before.language) restore.language = before.language
    await updateDoc(doc(d, 'classes', CLASS_ID), restore)
  }
}

export async function fillStudent5Work() {
  return fillStudent5(await db())
}


// The tests switch the test users' saved interface language; this puts it back afterwards.
export async function rememberLanguages(uids) {
  const d = await db()
  const before = {}
  for (const uid of uids) before[uid] = (await getDoc(doc(d, 'users', uid))).data()?.language ?? null
  return async () => {
    for (const uid of uids) await setDoc(doc(d, 'users', uid), { language: before[uid] ?? deleteField() }, { merge: true })
  }
}

// Lesson and course titles are content in their own language, not interface text (REQ-9.1).
export async function contentTitles() {
  const d = await db()
  const titles = []
  for (const c of (await getDocs(collection(d, 'courses'))).docs) if (c.data().title) titles.push(c.data().title)
  for (const l of (await getDocs(collection(d, 'lessons'))).docs) {
    const v = l.data().currentVersion
    const ver = v ? (await getDoc(doc(d, 'lessons', l.id, 'versions', String(v)))).data() : null
    for (const t of [l.data().title, ver?.details?.title, ver?.title]) if (t) titles.push(t)
    for (const topic of ver?.topics || []) if (topic.name) titles.push(topic.name)
    if (ver?.details?.subject) titles.push(ver.details.subject)
  }
  return [...new Set(titles)].sort((a, b) => b.length - a.length)
}

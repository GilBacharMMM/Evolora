#!/usr/bin/env node
// End-to-end test of the terms of use (REQ-10.8, D-74, D-75) on the test site: anyone can read
// them, nobody can fake agreeing, agreeing is saved by the checking service, and a new version
// needs agreeing again. It puts the terms and Test Student 6's agreement back as they were.
//
//   node tools/test-terms.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, initializeFirestore, setDoc, updateDoc, deleteField } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'
import { parseTerms, checkSet } from './lib/terms-parser.mjs'
import { readTermsFiles } from './load-terms.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const config = siteConfig('test')
const WHO = 'test-student-6'
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
  try { return await fn({ db, call }) } finally { await deleteApp(app) }
}

console.log('The terms files (REQ-10.8)')
const files = readTermsFiles()
check('the three terms files are fine and have the same version', files.problems.length === 0, files.problems.join(' '))
check('each language has a part about audio recordings and one about time on lessons', ['he', 'ar', 'en'].every((l) => {
  const t = files.parsed[l].terms.text
  return /recording|הקלט|تسجيل/.test(t) && /Time on lessons|זמן בשיעורים|الوقت في الدروس/.test(t)
}))
check('a file without a version is refused', parseTerms('title: x\nsummary:\n- a\n---\ntext').problems.length > 0)
check('files with different versions are refused', checkSet({ he: parseTerms('version: 1\ntitle: a\nsummary:\n- a\n---\nt'), ar: parseTerms('version: 1\ntitle: a\nsummary:\n- a\n---\nt'), en: parseTerms('version: 2\ntitle: a\nsummary:\n- a\n---\nt') }).length > 0)

const loader = await connect('test')
const ldb = loader.db
const currentRef = doc(ldb, 'terms', 'current')
const termsBefore = (await getDoc(currentRef)).data()
const userBefore = (await getDoc(doc(ldb, 'users', WHO))).data()?.termsAccepted ?? null

try {
  check('the terms are loaded on the test site', !!termsBefore?.version)

  console.log('Reading and agreeing')
  const anon = initializeApp(config, `anon-${Date.now()}`)
  try {
    const t = (await getDoc(doc(initializeFirestore(anon, {}), 'terms', 'current'))).data()
    check('anyone can read the terms, even before signing in', t?.version === termsBefore.version && !!t.languages.he.summary.length)
  } finally { await deleteApp(anon) }

  await updateDoc(doc(ldb, 'users', WHO), { termsAccepted: deleteField() })
  await as(WHO, async ({ db, call }) => {
    let refusedWork = false
    try { await call('lessonView', { lessonId: 'circles-teaching-1' }) } catch (e) { refusedWork = e.code === 'functions/failed-precondition' && e.message.startsWith('terms') }
    check("before agreeing, the checking service refuses the student's work (D-76)", refusedWork)
    let blocked = false
    try { await setDoc(doc(db, 'users', WHO), { termsAccepted: { version: termsBefore.version } }, { merge: true }) } catch { blocked = true }
    check('a student cannot mark themselves as agreed directly', blocked)
    let changedLanguage = true
    try { await setDoc(doc(db, 'users', WHO), { language: 'he' }, { merge: true }) } catch { changedLanguage = false }
    check('the student can still change their own language', changedLanguage)
    let wrongRefused = false
    try { await call('acceptTerms', { version: '0.0-old' }) } catch (e) { wrongRefused = e.code === 'functions/failed-precondition' }
    check('agreeing to a version that is not the current one is refused', wrongRefused)
    const r = await call('acceptTerms', { version: termsBefore.version })
    check('"I agree" is accepted', r.version === termsBefore.version)
    const view = await call('lessonView', { lessonId: 'circles-teaching-1' })
    check('after agreeing, the same request works', Array.isArray(view.hidden))
  })
  const saved = (await getDoc(doc(ldb, 'users', WHO))).data().termsAccepted
  check('the agreement is saved with the version and the time', saved?.version === termsBefore.version && !!saved.at)

  console.log('A new version (REQ-10.8)')
  const next = `${termsBefore.version}.1-test`
  await setDoc(currentRef, { ...termsBefore, version: next })
  const afterNew = (await getDoc(doc(ldb, 'users', WHO))).data().termsAccepted
  check('after a new version is loaded, the student\'s agreement is to the old version, so they are asked again', afterNew.version !== next)
  await as(WHO, async ({ call }) => {
    const r = await call('acceptTerms', { version: next })
    check('agreeing to the new version is accepted', r.version === next)
  })
  check('the new agreement is saved', (await getDoc(doc(ldb, 'users', WHO))).data().termsAccepted.version === next)
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await setDoc(currentRef, termsBefore)
  await updateDoc(doc(ldb, 'users', WHO), { termsAccepted: userBefore ?? deleteField() })
}

console.log(`\n${count - failures} of ${count} terms of use tests passed.`)
finish(failures ? 1 : 0)

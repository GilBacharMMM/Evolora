#!/usr/bin/env node
// End-to-end test of fill-in-the-blanks questions (REQ-4.30, D-78) with the three demo questions in
// the Archimedes teaching lesson. Exams are tested in test-exams.mjs. Cleans up after itself.
//
//   node tools/test-blanks.mjs

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
const LESSON = 'archimedes-density-teaching'
const PEOPLE = ['test-student-1', 'test-student-2', 'test-student-3']
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
  const call = async (name, data) => (await httpsCallable(getFunctions(app, 'me-west1'), name)(data)).data
  try { return await fn({ db, call }) } finally { await deleteApp(app) }
}

const { db: ldb } = await connect('test')
const lesson = (await getDoc(doc(ldb, 'lessons', LESSON))).data()
const v = String(lesson.currentVersion)
const version = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v))).data()
const secret = (await getDoc(doc(ldb, 'lessons', LESSON, 'versions', v, 'secret', 'answers'))).data().questions
const blanks = version.topics.flatMap((t) => t.blocks).filter((b) => b.type === 'question' && b.kind === 'blanks')
const typed = blanks.find((q) => q.blanksKind === 'typed')
const choice = blanks.find((q) => q.blanksKind === 'choice')
const words = blanks.find((q) => q.blanksKind === 'words')
const cleanUp = async () => {
  for (const uid of PEOPLE) await deleteDoc(doc(ldb, 'progress', `${uid}__${LESSON}`))
  for (const f of (await getDocs(query(collection(ldb, 'flags'), where('kind', '==', 'blanksWrong')))).docs) if (PEOPLE.includes(f.data().uid)) await deleteDoc(f.ref)
}

await cleanUp()
try {
  check('the Archimedes lesson has the three demo questions: typed, choose in each blank, word list', !!typed && !!choice && !!words)
  check('what students can read holds no right answers', !JSON.stringify(blanks).includes('correct') && !JSON.stringify(blanks).includes('זהב | הזהב') && !JSON.stringify(typed).includes('משקל'))
  check('the word list has 4 blanks and 5 cards (one extra)', words.blanks.length === 4 && words.cards.length === 5)

  console.log('Typed blanks (REQ-4.30)')
  await as('test-student-1', async ({ call }) => {
    let refused = false
    try { await call('answer', { lessonId: LESSON, questionId: typed.id, value: ['זהב', '', 'צפיפות', 'נפח'] }) } catch (e) { refused = e.code === 'functions/invalid-argument' }
    check('every blank needs an answer (it does not use up an attempt)', refused)
    const r = await call('answer', { lessonId: LESSON, questionId: typed.id, value: ['הזהב', 'משקל', 'צָפִיפוּת', 'נפח. '] })
    check('"הזהב" (allowed by the writer), nikud and punctuation are accepted: full marks', r.reply.result === 'correct' && r.state.score === 1)
  })
  await as('test-student-2', async ({ call }) => {
    const a = await call('answer', { lessonId: LESSON, questionId: typed.id, value: ['זהבב', 'משקל', 'צפיפות', 'נפח'] })
    check('"זהבב" (a typo) is wrong: that blank is marked wrong, the others right and locked', a.reply.result === 'tryAgain' && JSON.stringify(a.reply.marks) === '[false,true,true,true]' && JSON.stringify(a.state.locked) === JSON.stringify([null, 'משקל', 'צפיפות', 'נפח']))
    check('the hint shows after the first wrong attempt', !!a.reply.hint)
    check('the crown question with 4 blanks gives 2 attempts', a.state.attemptsAllowed === 2)
    const b = await call('answer', { lessonId: LESSON, questionId: typed.id, value: ['כסף', 'משקל', 'צפיפות', 'נפח'] })
    check('every attempt fails: the solution shows every right word', b.reply.result === 'wrong' && JSON.stringify(b.reply.correct?.blanks) === JSON.stringify(['זהב', 'משקל', 'צפיפות', 'נפח']) && !b.reply.checkAgain)
  })
  const o = await as('test-teacher-1', ({ call }) => call('classOverview', { classId: 'test-class' }))
  check('the teacher sees a red flag for that student and question', o.flags.some((f) => f.uid === 'test-student-2' && f.kind === 'blanksWrong' && f.questionId === typed.id && f.open))

  console.log('Choose in each blank and word list')
  await as('test-student-3', async ({ call }) => {
    const c = await call('answer', { lessonId: LESSON, questionId: choice.id, value: secret[choice.id].correct })
    check('choose in each blank: all right on the 1st attempt gives full marks', c.reply.result === 'correct' && c.state.score === 1)
    const id = (text) => words.cards.find((k) => k.text === text).id
    const wrong = [id('זהב'), id('משקל'), id('צבע'), id('נפח')]
    const w1 = await call('answer', { lessonId: LESSON, questionId: words.id, value: wrong })
    check('a word list with 4 words and 1 extra card gives 3 attempts', w1.state.attemptsAllowed === 3)
    let twice = false
    try { await call('answer', { lessonId: LESSON, questionId: words.id, value: [id('זהב'), id('משקל'), id('נפח'), id('נפח')] }) } catch (e) { twice = e.code === 'functions/invalid-argument' }
    check('each card is used once', twice)
    const w2 = await call('answer', { lessonId: LESSON, questionId: words.id, value: [id('זהב'), id('משקל'), id('צפיפות'), id('נפח')] })
    check('right on the 2nd attempt: half marks; the extra card was left out', w2.reply.result === 'correct' && w2.state.score === 0.5)
  })
  await as('test-teacher-1', async ({ call }) => {
    const shown = await call('tryAnswer', { lessonId: LESSON, questionId: choice.id, show: true })
    check('"Show answer" for a teacher gives every right word', JSON.stringify(shown.correct?.blanks) === JSON.stringify(['זהב', 'משקל', 'צפיפות', 'נפח']), JSON.stringify(shown.correct))
  })
} catch (e) {
  check('the test ran to the end', false, e.message)
} finally {
  await cleanUp()
}
console.log(`\n${count - failures} of ${count} fill-in-the-blanks tests passed.`)
finish(failures ? 1 : 0)

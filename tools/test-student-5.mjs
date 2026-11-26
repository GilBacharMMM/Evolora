#!/usr/bin/env node
// End-to-end test of Test Student 5's ready-made work (REQ-12.6): after filling it twice, both
// lessons are finished, written and audio answers wait for the teacher, the class dashboard shows
// both lessons done, and the answers differ between the two fillings. Leaves Test Student 5's work
// in place, as a reset would.
//
//   node tools/test-student-5.mjs

import fs from 'node:fs'
import path from 'node:path'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'
import { STUDENT_5_LESSONS, fillStudent5 } from './fill-student-5.mjs'

setLogLevel('silent')
const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
let failures = 0
let count = 0
function check(label, ok, detail = '') {
  count++
  if (!ok) failures++
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${label}${!ok && detail ? ` (${detail})` : ''}`)
}

const { db } = await connect('test')
const answersOf = async () => {
  const out = {}
  for (const l of STUDENT_5_LESSONS) {
    const p = (await getDoc(doc(db, 'progress', `test-student-5__${l}`))).data()
    out[l] = p
  }
  return out
}

try {
  await fillStudent5(db)
  const first = await answersOf()
  await fillStudent5(db)
  const second = await answersOf()
  for (const l of STUDENT_5_LESSONS) {
    const p = second[l]
    check(`${l}: finished`, p?.finished === true)
    const states = Object.values(p.questions)
    check(`${l}: written and audio answers wait for the teacher`, states.some((s) => s.result === 'pending') && states.filter((s) => s.result === 'pending').every((s) => !s.graded))
    check(`${l}: some answers right on the 1st attempt and some not`, states.some((s) => s.result === 'correct1') && states.some((s) => s.result !== 'correct1' && s.result !== 'pending'))
  }
  const sig = (all) => JSON.stringify(STUDENT_5_LESSONS.map((l) => Object.entries(all[l].questions).sort().map(([id, s]) => [id, s.attempts])))
  check('the answers are different after a second filling', sig(first) !== sig(second))
  const teacher = TEST.users.find((u) => u.uid === 'test-teacher-1')
  const app = initializeApp(siteConfig('test'), `t5-${Date.now()}`)
  try {
    await signInWithEmailAndPassword(getAuth(app), teacher.email, testPassword(teacher))
    const o = (await httpsCallable(getFunctions(app, 'me-west1'), 'classOverview')({ classId: 'test-class' })).data
    const row = o.students.find((s) => s.id === 'test-student-5')
    check('the class dashboard shows Test Student 5 finished both lessons', STUDENT_5_LESSONS.every((l) => ['grade', 'pending'].includes(row.cells[l]?.kind)), JSON.stringify(STUDENT_5_LESSONS.map((l) => row.cells[l]?.kind)))
    check('Test Teacher 1 has Test Student 5\'s answers to grade', STUDENT_5_LESSONS.every((l) => row.cells[l]?.waiting >= 1))
  } finally {
    await deleteApp(app)
  }
} catch (e) {
  check('the test ran to the end', false, e.message)
}

console.log(`\n${count - failures} of ${count} Test Student 5 tests passed.`)
finish(failures ? 1 : 0)

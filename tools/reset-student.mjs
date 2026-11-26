#!/usr/bin/env node
// Clears one test student's work on the test site: answers and progress in every lesson,
// exam results, time on lessons and red flags. The student stays in their classes, with
// their level. Test site only.
//
//   node tools/reset-student.mjs test-student-2

import { collection, deleteDoc, getDocs, query, where } from 'firebase/firestore'
import { connect, finish } from './lib/connect.mjs'

const uid = process.argv[2]
if (!uid || !uid.startsWith('test-student-')) {
  console.error('Usage: node tools/reset-student.mjs test-student-<number>   (test students only)')
  process.exit(1)
}
const conn = await connect('test')
const { db } = conn
const counts = {}
for (const name of ['progress', 'examResults', 'lessonTime']) {
  const snap = await getDocs(collection(db, name))
  let n = 0
  for (const d of snap.docs) if (d.id.startsWith(`${uid}__`)) { await deleteDoc(d.ref); n++ }
  counts[name] = n
}
const flags = await getDocs(query(collection(db, 'flags'), where('uid', '==', uid)))
for (const d of flags.docs) await deleteDoc(d.ref)
counts.flags = flags.size
console.log(`Cleared ${uid}:`, counts)
finish()

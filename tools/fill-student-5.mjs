#!/usr/bin/env node
// Test Student 5 finishes the Archimedes teaching lesson and the circles teaching lesson, with
// random answers (REQ-12.6, Gil 2026-11-25): some right on the 1st attempt, some on the 2nd, some
// wrong. Every answer goes through the checking service, exactly as a real student's, so scores,
// check-again questions and red flags come out the same. Written answers are "lorem ipsum" and the
// audio answer is a short test recording; both wait for the teacher to grade them.
// The test-data reset runs this; it can also be run alone (it replaces only Test Student 5's work in
// these two lessons).
//
//   node tools/fill-student-5.mjs

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { deleteApp, initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ROOT, connect, finish, siteConfig, testPassword } from './lib/connect.mjs'
import { answerWithRecording } from './lib/test-helpers.mjs'

const STUDENT = 'test-student-5'
export const STUDENT_5_LESSONS = ['archimedes-density-teaching-1', 'circles-teaching-1']
const LOREM = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
]

const pickOne = (list) => list[Math.floor(Math.random() * list.length)]
// About half right on the 1st attempt, a quarter on the 2nd, a quarter wrong.
const outcome = () => pickOne(['first', 'first', 'second', 'wrong'])
const lorem = () => LOREM.slice(0, 1 + Math.floor(Math.random() * LOREM.length)).join(' ')

function wrongValue(kind, item) {
  if (kind === 'number') return String((Number(item.answer) || 1) * 3 + 17)
  if (kind === 'choice') return [pickOne(item.choices.filter((c) => !item.correct.includes(c.id))).id]
  return null
}
function rightValue(kind, item) {
  if (kind === 'number') return String(item.answer)
  return item.correct
}

// A wrong placement for a drag-and-drop question that keeps the cards already locked in place.
function wrongDrag(q, s, locked) {
  const free = q.cards.map((c) => c.id).filter((id) => !(locked || []).includes(id))
  const value = s.correct.map((_, i) => (locked?.[i] ? locked[i] : null))
  const open = value.map((v, i) => (v ? null : i)).filter((i) => i !== null)
  // Rotate the free cards so that no free spot gets its right card, when possible.
  const cards = free.filter((id) => true)
  for (let tries = 0; tries < 20; tries++) {
    const shuffled = [...cards].sort(() => Math.random() - 0.5)
    const fill = open.map((spot, k) => shuffled[k])
    if (open.some((spot, k) => fill[k] !== s.correct[spot])) {
      open.forEach((spot, k) => (value[spot] = fill[k]))
      return value
    }
  }
  open.forEach((spot, k) => (value[spot] = cards[k]))
  return value
}

export async function fillStudent5(ldb) {
  setLogLevel('silent')
  const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
  const user = TEST.users.find((u) => u.uid === STUDENT)
  const report = []
  // Start clean: Test Student 5's work, flags and time in these lessons.
  for (const l of STUDENT_5_LESSONS) {
    await deleteDoc(doc(ldb, 'progress', `${STUDENT}__${l}`))
    await deleteDoc(doc(ldb, 'lessonTime', `${STUDENT}__${l}`))
  }
  for (const f of (await getDocs(query(collection(ldb, 'flags'), where('uid', '==', STUDENT)))).docs) if (STUDENT_5_LESSONS.includes(f.data().lessonId)) await deleteDoc(f.ref)

  const app = initializeApp(siteConfig('test'), `fill-${Date.now()}`)
  try {
    await signInWithEmailAndPassword(getAuth(app), user.email, testPassword(user))
    const fns = getFunctions(app, 'me-west1')
    const call = async (name, data) => (await httpsCallable(fns, name)(data)).data
    for (const lessonId of STUDENT_5_LESSONS) {
      const lesson = (await getDoc(doc(ldb, 'lessons', lessonId))).data()
      const v = String(lesson.currentVersion)
      const version = (await getDoc(doc(ldb, 'lessons', lessonId, 'versions', v))).data()
      const secret = (await getDoc(doc(ldb, 'lessons', lessonId, 'versions', v, 'secret', 'answers'))).data().questions
      const { hidden } = await call('lessonView', { lessonId })
      const count = { first: 0, second: 0, wrong: 0, waiting: 0 }
      for (const topic of version.topics) {
        let topicCorrect = 0
        for (const q of topic.blocks.filter((b) => b.type === 'question')) {
          if (hidden.includes(q.id)) continue
          // Extra practice questions only until the topic's minimum is reached, as the lesson page does.
          if (q.extra && lesson.minimumPerTopic && topicCorrect >= lesson.minimumPerTopic) continue
          const s = secret[q.id] || {}
          const send = (value, checkAgain = false) => call('answer', { lessonId, questionId: q.id, value, checkAgain })
          let last
          if (q.kind === 'open') {
            last = await send(lorem())
            count.waiting++
          } else if (q.kind === 'audio') {
            last = await answerWithRecording(app, call, STUDENT, lessonId, q.id)
            count.waiting++
          } else if (q.kind === 'drag') {
            const plan = outcome()
            const allowed = Math.max(2, q.cards.length - 2)
            const wrongTries = plan === 'first' ? 0 : plan === 'second' ? 1 : allowed
            let state
            for (let k = 0; k < wrongTries; k++) {
              last = await send(wrongDrag(q, s, state?.locked))
              state = last.state
            }
            if (plan !== 'wrong') last = await send(s.correct)
            count[plan]++
          } else if (q.kind === 'blanks') {
            // Fill in the blanks (REQ-4.30): wrong attempts keep the locked blanks and get one blank wrong.
            const plan = outcome()
            const allowed = Math.max(2, (q.blanksKind === 'words' ? q.cards.length : q.blanks.length) - 2)
            const rightAt = (i) => (q.blanksKind === 'typed' ? String(s.correct[i]).split('|')[0] : q.blanksKind === 'choice' ? s.correct[i] : q.cards.find((c) => c.text === s.correct[i]).id)
            const right = q.blanks.map((_, i) => rightAt(i))
            const wrongAt = (i, value) => {
              if (q.blanksKind === 'typed') return 'טעות'
              if (q.blanksKind === 'choice') return q.blanks[i].options.find((o) => o.id !== s.correct[i]).id
              const used = new Set(value.filter(Boolean))
              return q.cards.find((c) => c.text !== s.correct[i] && !used.has(c.id))?.id
            }
            const wrongTries = plan === 'first' ? 0 : plan === 'second' ? 1 : allowed
            let state
            for (let k = 0; k < wrongTries; k++) {
              const value = right.map((r, i) => (state?.locked?.[i] ? state.locked[i] : null))
              const free = value.map((v, i) => (v ? null : i)).filter((i) => i !== null)
              const bad = free[Math.floor(Math.random() * free.length)]
              free.forEach((i) => (value[i] = i === bad ? null : right[i]))
              value[bad] = wrongAt(bad, value)
              last = await send(value)
              state = last.state
            }
            if (plan !== 'wrong') last = await send(right)
            count[plan]++
          } else {
            const plan = outcome()
            if (plan === 'first') last = await send(rightValue(q.kind, s))
            else {
              await send(wrongValue(q.kind, { ...s, choices: q.choices }))
              last = await send(plan === 'second' ? rightValue(q.kind, s) : wrongValue(q.kind, { ...s, choices: q.choices }))
              // A check-again question after two wrong answers: right or wrong at random.
              const ca = last.reply?.checkAgain
              if (ca) {
                const cs = (s.checkAgain || []).find((c) => c.id === ca.id)
                const right = Math.random() < 0.5
                const value = (r) => (r ? rightValue(cs.kind, cs) : wrongValue(cs.kind, { ...cs, choices: ca.choices }))
                const c1 = await send(value(right), true)
                if (c1.reply?.result === 'tryAgain') last = await send(value(right), true)
                else last = c1
              }
            }
            count[plan]++
          }
          if (typeof last?.topicCorrect === 'number') topicCorrect = last.topicCorrect
        }
      }
      const p = (await getDoc(doc(ldb, 'progress', `${STUDENT}__${lessonId}`))).data()
      report.push(`${lessonId}: ${p?.finished ? 'finished' : 'NOT finished'}; right first time ${count.first}, on the 2nd attempt ${count.second}, wrong ${count.wrong}, waiting for the teacher ${count.waiting}`)
    }
  } finally {
    await deleteApp(app)
  }
  return report
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { db } = await connect('test')
  try {
    for (const line of await fillStudent5(db)) console.log(line)
    finish(0)
  } catch (e) {
    console.error(e.message)
    finish(1)
  }
}

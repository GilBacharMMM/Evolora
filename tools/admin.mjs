#!/usr/bin/env node
// System admin tasks, done by Claude in stage 1 (D-47, REQ-2.2).
//
//   node tools/admin.mjs add-teacher <email> [name] [--school <id>]   make someone a teacher
//   node tools/admin.mjs add-school <id> <name>         add a school (D-69)
//   node tools/admin.mjs set-school <email> <school id> put a teacher in a school
//   node tools/admin.mjs schools                        list the schools and their teachers
//   node tools/admin.mjs add-admin <email> [name]       make someone a system admin
//   node tools/admin.mjs remove-teacher <email>         take the teacher (or admin) role away
//   node tools/admin.mjs people                         list everyone and their role (REQ-2.1)
//   node tools/admin.mjs open <course id> <class id>    give a course to a whole class, as a
//                                                       teacher does on the class page (REQ-5.7)
//
// Add "--site test" (the default) to choose the site.

import path from 'node:path'
import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { ROOT, chosenSite, connect, finish } from './lib/connect.mjs'

export async function setStaff(db, email, role, name, schoolId) {
  const key = email.trim().toLowerCase()
  const before = await getDoc(doc(db, 'staff', key))
  // Keeps the teacher's school unless a new one is given (D-69).
  const school = schoolId !== undefined ? schoolId : before.exists() ? before.data().schoolId || null : null
  if (school && !(await getDoc(doc(db, 'schools', school))).exists()) throw new Error(`There is no school "${school}". Add it first: node tools/admin.mjs add-school <id> <name>`)
  await setDoc(doc(db, 'staff', key), { email: key, role, name: name || null, schoolId: school, addedAt: serverTimestamp() })
  return key
}

// Schools (D-69): a school holds teachers; only teachers of the same school can teach a class together.
export async function addSchool(db, id, name) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('A school id uses small English letters, digits and dashes, for example: ort-rehovot')
  await setDoc(doc(db, 'schools', id), { name, addedAt: serverTimestamp() }, { merge: true })
}

export async function setSchool(db, email, schoolId) {
  const key = email.trim().toLowerCase()
  const staff = await getDoc(doc(db, 'staff', key))
  if (!staff.exists()) throw new Error(`${key} is not on the staff list. Add them first with add-teacher.`)
  if (!(await getDoc(doc(db, 'schools', schoolId))).exists()) throw new Error(`There is no school "${schoolId}".`)
  await updateDoc(staff.ref, { schoolId })
}

// Gives a course to a whole class, as a teacher does on the class page (REQ-5.7): an assignment
// for the whole class, and the course and its lessons opened to the class.
export async function openCourseToClass(db, courseId, classId) {
  const course = await getDoc(doc(db, 'courses', courseId))
  if (!course.exists()) throw new Error(`There is no course "${courseId}". Load it first with tools/load.mjs.`)
  const cls = await getDoc(doc(db, 'classes', classId))
  if (!cls.exists()) throw new Error(`There is no class "${classId}".`)
  const batch = writeBatch(db)
  batch.update(course.ref, { classIds: arrayUnion(classId) })
  for (const lessonId of course.data().lessonIds) batch.update(doc(db, 'lessons', lessonId), { classIds: arrayUnion(classId) })
  batch.update(cls.ref, { courseIds: arrayUnion(courseId) })
  batch.set(doc(collection(db, 'classes', classId, 'assignments')), {
    kind: 'course',
    courseId,
    lessonIds: course.data().lessonIds,
    everyone: true,
    studentIds: [],
    createdBy: 'evolora-loader',
    createdAt: serverTimestamp(),
  })
  await batch.commit()
}

async function people(db) {
  const staff = Object.fromEntries((await getDocs(collection(db, 'staff'))).docs.map((d) => [d.id, d.data()]))
  const users = (await getDocs(collection(db, 'users'))).docs.map((d) => ({ uid: d.id, ...d.data() }))
  const rows = users.map((u) => ({ name: u.name || '', email: u.email || '', role: staff[(u.email || '').toLowerCase()]?.role || 'student' }))
  for (const [email, s] of Object.entries(staff)) {
    if (!users.some((u) => (u.email || '').toLowerCase() === email)) rows.push({ name: s.name || '', email, role: `${s.role} (hasn't signed in yet)` })
  }
  rows.sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email))
  for (const r of rows) console.log(`  ${r.role.padEnd(32)} ${r.email.padEnd(34)} ${r.name}`)
  console.log(`  ${rows.length} people`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(ROOT, 'tools/admin.mjs')) {
  const argv = process.argv.slice(2)
  const args = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--site' && argv[i - 1] !== '--school')
  const schoolFlag = argv.includes('--school') ? argv[argv.indexOf('--school') + 1] : undefined
  const [task, ...rest] = args
  try {
    const site = chosenSite(argv)
    const { db } = await connect(site)
    if (task === 'add-teacher' || task === 'add-admin') {
      if (!rest[0]) throw new Error(`Usage: node tools/admin.mjs ${task} <email> [name]`)
      const key = await setStaff(db, rest[0], task === 'add-admin' ? 'admin' : 'teacher', rest.slice(1).join(' '), schoolFlag)
      console.log(`${key} is now a ${task === 'add-admin' ? 'system admin' : 'teacher'} on the ${site} site. They see the teacher screens the next time they open Evolora.`)
    } else if (task === 'remove-teacher') {
      if (!rest[0]) throw new Error('Usage: node tools/admin.mjs remove-teacher <email>')
      await deleteDoc(doc(db, 'staff', rest[0].trim().toLowerCase()))
      console.log(`${rest[0]} is now a student on the ${site} site.`)
    } else if (task === 'add-school') {
      if (rest.length < 2) throw new Error('Usage: node tools/admin.mjs add-school <id> <name>')
      await addSchool(db, rest[0], rest.slice(1).join(' '))
      console.log(`School ${rest[0]} (${rest.slice(1).join(' ')}) is on the ${site} site.`)
    } else if (task === 'set-school') {
      if (rest.length < 2) throw new Error('Usage: node tools/admin.mjs set-school <email> <school id>')
      await setSchool(db, rest[0], rest[1])
      console.log(`${rest[0]} is now in school ${rest[1]}.`)
    } else if (task === 'schools') {
      const staff = (await getDocs(collection(db, 'staff'))).docs.map((d) => d.data())
      for (const sc of (await getDocs(collection(db, 'schools'))).docs) {
        console.log(`  ${sc.id}: ${sc.data().name}`)
        for (const t of staff.filter((x) => x.schoolId === sc.id)) console.log(`      ${t.email} ${t.name || ''}`)
      }
      const none = staff.filter((x) => !x.schoolId)
      if (none.length) console.log(`  (no school): ${none.map((x) => x.email).join(', ')}`)
    } else if (task === 'people') {
      console.log(`People on the ${site} site:`)
      await people(db)
    } else if (task === 'open') {
      if (rest.length < 2) throw new Error('Usage: node tools/admin.mjs open <course id> <class id>')
      await openCourseToClass(db, rest[0], rest[1])
      await updateDoc(doc(db, 'classes', rest[1]), { updatedAt: serverTimestamp() })
      console.log(`Course ${rest[0]} is now open to class ${rest[1]}.`)
    } else {
      console.log('Tasks: add-teacher, add-admin, remove-teacher, add-school, set-school, schools, people, open. See the top of tools/admin.mjs.')
    }
    finish(0)
  } catch (e) {
    console.error(e.message)
    finish(1)
  }
}

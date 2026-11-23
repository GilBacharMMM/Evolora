import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where, type Timestamp } from 'firebase/firestore'
import { db } from './site'
import { useSession } from './session'
import type { Course, LessonType } from './lesson/types'
import { dueFor, groupLessons, isLate, lateGrade, lockedByDue, orderStatuses, type DueRule, type Order } from './courseOrder'

// A student's work in their classes (REQ-5.6, 5.7, 6.1, 6.4, 6.11, 6.12, system-design 2.6):
// what each class gave them, and the status of every lesson.

export type Status = 'open' | 'done' | 'locked'

export interface WorkLesson {
  lessonId: string
  title: string
  type: LessonType
  status: Status
  started?: boolean
  // The lesson grade, only when the student may see it (REQ-5.22, D-59) and the lesson is finished.
  grade?: { percent: number | null; pending: boolean } | null
  showGrades?: boolean
  // Sent back by the teacher and not yet gone over (REQ-5.14).
  notes?: 'review' | 'corrections' | null
  // Locked because the student must first go over their teacher's notes (REQ-5.14).
  lockedByNotes?: boolean
  // Due date (REQ-5.9): when, whether it is late, and locked because it is past it.
  due?: number | null
  late?: boolean
  lockedByDue?: boolean
}

export interface CourseWork {
  courseId: string
  title: string
  language: 'he' | 'ar' | 'en'
  // Teaching lessons in order, each with its practice lessons.
  items: (WorkLesson & { practice: WorkLesson[] })[]
  done: number
  total: number
  percent: number
  finished: boolean
  givenAt: number
  // Archived by the teacher (REQ-5.21)
  archived?: boolean
}

export interface SingleWork extends WorkLesson {
  language: 'he' | 'ar' | 'en'
  givenAt: number
}

export interface ClassWork {
  // A new message from the class's teachers (REQ-5.16)
  unreadMessage?: boolean
  id: string
  name: string
  teacherNames: string[]
  color: string
  courses: CourseWork[]
  singles: SingleWork[]
}

export interface TodoItem extends WorkLesson {
  classId: string
  className: string
  color: string
  courseTitle: string | null
  language: 'he' | 'ar' | 'en'
  givenAt: number
}

interface Assignment {
  archived?: boolean
  grades?: 'usual' | 'show' | 'hide'
  order?: Order
  due?: number | null
  afterDue?: 'reduce' | 'lock'
  reduceBy?: number
  extensions?: Record<string, number>
  kind: 'course' | 'lessons'
  courseId: string | null
  lessonIds: string[]
  createdAt?: Timestamp
}

// D-55: every lesson in the course list (teaching 1, its practice lessons, teaching 2, ...)
// opens when the one before it is finished. A lesson the student already started stays open, and
// a lesson the teacher opened early for them is open whatever comes before it (REQ-5.20).
export function courseStatuses(order: string[], finished: Set<string>, started: Set<string>, openedEarly: Set<string> = new Set()): Status[] {
  return order.map((id, i) => {
    if (finished.has(id)) return 'done'
    if (i === 0 || finished.has(order[i - 1]) || started.has(id) || openedEarly.has(id)) return 'open'
    return 'locked'
  })
}

// Whether students see the grade of a lesson (REQ-5.22, D-59); the same rule as functions/dashboard.js.
export function gradesShown(grades: Assignment['grades'], type: LessonType): boolean {
  if (grades === 'show') return true
  if (grades === 'hide') return false
  return type !== 'teaching'
}

export function percent(done: number, total: number): number {
  return total ? Math.round((done / total) * 100) : 0
}

async function classAssignments(classId: string, uid: string, sub: 'assignments' | 'openings' = 'assignments'): Promise<Assignment[]> {
  const col = collection(db, 'classes', classId, sub)
  const [all, mine] = await Promise.all([getDocs(query(col, where('everyone', '==', true))), getDocs(query(col, where('studentIds', 'array-contains', uid)))])
  const seen = new Set<string>()
  const out: Assignment[] = []
  for (const d of [...all.docs, ...mine.docs]) {
    if (seen.has(d.id)) continue
    seen.add(d.id)
    out.push(d.data() as Assignment)
  }
  return out.sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0))
}

// Loads everything for the student's classes. Classes that can't be read are left out.
export async function loadClasswork(uid: string, classIds: string[]): Promise<ClassWork[]> {
  type P = { finished: boolean; finishedAt: number | null; started: boolean; grade: { percent: number | null; pending: boolean } | null; notes: 'review' | 'corrections' | null }
  const progressCache = new Map<string, Promise<P>>()
  const progressOf = (lessonId: string) => {
    if (!progressCache.has(lessonId)) {
      progressCache.set(
        lessonId,
        getDoc(doc(db, 'progress', `${uid}__${lessonId}`))
          .then((s): P => {
            const d = s.exists() ? s.data() : null
            const sb = d?.sentBack
            return { finished: d?.finished === true, finishedAt: d?.finishedAt?.toMillis?.() ?? null, started: !!d, grade: d?.grade ? { percent: d.grade.percent ?? null, pending: !!d.grade.pending } : null, notes: sb && !sb.done ? sb.mode : null }
          })
          .catch((): P => ({ finished: false, finishedAt: null, started: false, grade: null, notes: null })),
      )
    }
    return progressCache.get(lessonId)!
  }

  const classes = await Promise.all(
    classIds.map(async (classId): Promise<ClassWork | null> => {
      try {
        const c = await getDoc(doc(db, 'classes', classId))
        if (!c.exists()) return null
        const data = c.data()
        const [assignments, openings] = await Promise.all([classAssignments(classId, uid), classAssignments(classId, uid, 'openings').catch(() => [])])
        const openedEarly = new Set(openings.map((o) => (o as unknown as { lessonId: string }).lessonId))
        const courses: CourseWork[] = []
        const singles: SingleWork[] = []
        const seenCourses = new Set<string>()
        const seenLessons = new Set<string>()
        const now = Date.now()
        for (const a of assignments) {
          const givenAt = a.createdAt?.toMillis() ?? 0
          const rule: DueRule = { due: a.due ?? null, afterDue: a.afterDue || 'reduce', reduceBy: a.reduceBy ?? 0, extensions: a.extensions }
          const due = dueFor(rule, uid)
          // One lesson's details for the student: status by the course order (REQ-5.8), the due
          // date and lateness (REQ-5.9), and its grade when they may see it (REQ-5.22).
          const describe = (e: { lessonId: string; title: string; type: LessonType }, p: P, status: Status): WorkLesson => {
            const show = gradesShown(a.grades, e.type)
            const byDue = lockedByDue(rule, due, p.finished, now) && !p.notes
            const grade = show && p.finished && p.grade ? { ...p.grade, percent: lateGrade(p.grade.percent, rule, due, p.finishedAt) } : null
            return {
              lessonId: e.lessonId,
              title: e.title,
              type: e.type,
              status: byDue ? 'locked' : status,
              lockedByDue: byDue,
              started: p.started,
              showGrades: show,
              grade,
              notes: p.notes,
              due,
              late: isLate(due, p.finishedAt, now),
            }
          }
          if (a.kind === 'course' && a.courseId) {
            if (seenCourses.has(a.courseId)) continue
            seenCourses.add(a.courseId)
            const s = await getDoc(doc(db, 'courses', a.courseId))
            if (!s.exists()) continue
            const course = { id: s.id, ...(s.data() as Omit<Course, 'id'>) }
            const order = course.items.flatMap((it) => [it.lessonId, ...it.practice.map((p) => p.lessonId)])
            const progress = await Promise.all(order.map(progressOf))
            const pOf = (id: string) => progress[order.indexOf(id)]
            const finished = new Set(order.filter((_, i) => progress[i].finished))
            const started = new Set(order.filter((_, i) => progress[i].started))
            // Assignments from before course orders open one after another (D-55).
            const statuses = orderStatuses(course.items, a.order || 'oneByOne', finished, started, openedEarly)
            const info = (e: { lessonId: string; title: string; type: LessonType }) => describe(e, pOf(e.lessonId), statuses.get(e.lessonId)!)
            const items = course.items.map((it) => ({ ...info(it), practice: it.practice.map(info) }))
            const done = finished.size
            courses.push({
              courseId: course.id,
              title: course.title,
              language: course.language,
              items,
              done,
              total: order.length,
              percent: percent(done, order.length),
              finished: order.length > 0 && done === order.length,
              givenAt,
              archived: a.archived === true,
            })
          } else {
            // A selection of single lessons, in the order chosen when giving them (REQ-5.8).
            // Selections from before course orders are all open (D-57).
            const found: { lessonId: string; title: string; type: LessonType; language: 'he' | 'ar' | 'en'; p: P }[] = []
            for (const lessonId of a.lessonIds) {
              if (seenLessons.has(lessonId)) continue
              seenLessons.add(lessonId)
              try {
                const [l, p] = await Promise.all([getDoc(doc(db, 'lessons', lessonId)), progressOf(lessonId)])
                if (l.exists()) found.push({ lessonId, title: l.data().title, type: l.data().type, language: l.data().language, p })
              } catch {
                // A lesson that can't be read is left out.
              }
            }
            const statuses = orderStatuses(
              groupLessons(found),
              a.order || 'any',
              new Set(found.filter((f) => f.p.finished).map((f) => f.lessonId)),
              new Set(found.filter((f) => f.p.started).map((f) => f.lessonId)),
              openedEarly,
            )
            for (const f of found) singles.push({ ...describe(f, f.p, statuses.get(f.lessonId)!), language: f.language, givenAt })
          }
        }
        const convo = await getDoc(doc(db, 'conversations', `${classId}__${uid}`)).catch(() => null)
        const unreadMessage = !!convo?.exists() && convo.data().unreadByStudent === true
        return { unreadMessage, id: classId, name: data.name, teacherNames: data.teacherNames || [], color: data.color || '#0E6B73', courses, singles }
      } catch {
        return null
      }
    }),
  )
  const list = classes.filter((c): c is ClassWork => c !== null)
  lockForNotes(list)
  return list
}

function allLessons(classes: ClassWork[]): WorkLesson[] {
  return classes.flatMap((c) => [...c.courses.flatMap((k) => k.items.flatMap((it) => [it, ...it.practice])), ...c.singles])
}

// While a lesson sent back by the teacher waits to be gone over, the student can't start a new
// lesson (REQ-5.14): open lessons not started yet are locked. Lessons already started stay open.
export function lockForNotes(classes: ClassWork[]) {
  const lessons = allLessons(classes)
  if (!lessons.some((l) => l.notes)) return
  for (const l of lessons) {
    if (l.status === 'open' && !l.started && !l.notes) {
      l.status = 'locked'
      l.lockedByNotes = true
    }
  }
}

// The "To do" list (REQ-6.1): lessons sent back by the teacher first (pending notes, highlighted),
// then every lesson the student can open now and hasn't finished, nearest due date first.
export function todoList(classes: ClassWork[]): TodoItem[] {
  const out: TodoItem[] = []
  for (const c of classes) {
    const base = { classId: c.id, className: c.name, color: c.color }
    for (const course of c.courses) {
      if (course.archived) continue
      for (const it of course.items) {
        for (const l of [it, ...it.practice]) {
          if (l.status !== 'open' && !l.notes) continue
          const { lessonId, title, type, status, started, grade, showGrades, notes, due, late } = l
          out.push({ ...base, lessonId, title, type, status, started, grade, showGrades, notes, due, late, courseTitle: course.title, language: course.language, givenAt: course.givenAt })
        }
      }
    }
    for (const s of c.singles) if (s.status === 'open' || s.notes) out.push({ ...base, ...s, courseTitle: null })
  }
  // Pending notes first, then the nearest due date (REQ-6.1), then the oldest assignment.
  return out.sort((a, b) => (a.notes ? 0 : 1) - (b.notes ? 0 : 1) || (a.due ?? Infinity) - (b.due ?? Infinity) || a.givenAt - b.givenAt)
}

// May the student open this lesson, and see its grades? 'open' if it is open or done anywhere
// they were given it, 'locked' if it is only where it is still locked, 'notGiven' otherwise.
export function lessonAccess(
  classes: ClassWork[],
  lessonId: string,
): { access: 'open' | 'locked' | 'notGiven'; showGrades: boolean; lockedByNotes: boolean; lockedByDue: boolean } {
  const mine = allLessons(classes).filter((l) => l.lessonId === lessonId)
  if (!mine.length) return { access: 'notGiven', showGrades: false, lockedByNotes: false, lockedByDue: false }
  const showGrades = mine.some((l) => l.showGrades)
  if (mine.some((l) => l.status !== 'locked')) return { access: 'open', showGrades, lockedByNotes: false, lockedByDue: false }
  return { access: 'locked', showGrades, lockedByNotes: mine.every((l) => l.lockedByNotes), lockedByDue: mine.every((l) => l.lockedByDue) }
}

// The student's classes and work, loaded when a page opens. null while loading.
export function useClasswork(): ClassWork[] | null {
  const { user, classIds } = useSession()
  const [classes, setClasses] = useState<ClassWork[] | null>(null)
  useEffect(() => {
    if (!user) return
    let live = true
    loadClasswork(user.uid, classIds)
      .then((c) => live && setClasses(c))
      .catch(() => live && setClasses([]))
    return () => {
      live = false
    }
  }, [user, classIds])
  return classes
}

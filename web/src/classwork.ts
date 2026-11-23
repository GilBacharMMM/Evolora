import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where, type Timestamp } from 'firebase/firestore'
import { db } from './site'
import { useSession } from './session'
import type { Course, LessonType } from './lesson/types'

// A student's work in their classes (REQ-5.6, 5.7, 6.1, 6.4, 6.11, 6.12, system-design 2.6):
// what each class gave them, and the status of every lesson.

export type Status = 'open' | 'done' | 'locked'

export interface WorkLesson {
  lessonId: string
  title: string
  type: LessonType
  status: Status
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
}

export interface SingleWork extends WorkLesson {
  language: 'he' | 'ar' | 'en'
  givenAt: number
}

export interface ClassWork {
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
  kind: 'course' | 'lessons'
  courseId: string | null
  lessonIds: string[]
  createdAt?: Timestamp
}

// D-55: every lesson in the course list (teaching 1, its practice lessons, teaching 2, ...)
// opens when the one before it is finished. A lesson the student already started stays open.
export function courseStatuses(order: string[], finished: Set<string>, started: Set<string>): Status[] {
  return order.map((id, i) => {
    if (finished.has(id)) return 'done'
    if (i === 0 || finished.has(order[i - 1]) || started.has(id)) return 'open'
    return 'locked'
  })
}

export function percent(done: number, total: number): number {
  return total ? Math.round((done / total) * 100) : 0
}

async function classAssignments(classId: string, uid: string): Promise<Assignment[]> {
  const col = collection(db, 'classes', classId, 'assignments')
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
  const progressCache = new Map<string, Promise<{ finished: boolean; started: boolean }>>()
  const progressOf = (lessonId: string) => {
    if (!progressCache.has(lessonId)) {
      progressCache.set(
        lessonId,
        getDoc(doc(db, 'progress', `${uid}__${lessonId}`))
          .then((s) => ({ finished: s.exists() && s.data().finished === true, started: s.exists() }))
          .catch(() => ({ finished: false, started: false })),
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
        const assignments = await classAssignments(classId, uid)
        const courses: CourseWork[] = []
        const singles: SingleWork[] = []
        const seenCourses = new Set<string>()
        const seenLessons = new Set<string>()
        for (const a of assignments) {
          const givenAt = a.createdAt?.toMillis() ?? 0
          if (a.kind === 'course' && a.courseId) {
            if (seenCourses.has(a.courseId)) continue
            seenCourses.add(a.courseId)
            const s = await getDoc(doc(db, 'courses', a.courseId))
            if (!s.exists()) continue
            const course = { id: s.id, ...(s.data() as Omit<Course, 'id'>) }
            const order = course.items.flatMap((it) => [it.lessonId, ...it.practice.map((p) => p.lessonId)])
            const progress = await Promise.all(order.map(progressOf))
            const finished = new Set(order.filter((_, i) => progress[i].finished))
            const started = new Set(order.filter((_, i) => progress[i].started))
            const statuses = courseStatuses(order, finished, started)
            const statusOf = new Map(order.map((id, i) => [id, statuses[i]]))
            const items = course.items.map((it) => ({
              lessonId: it.lessonId,
              title: it.title,
              type: it.type,
              status: statusOf.get(it.lessonId)!,
              practice: it.practice.map((p) => ({ lessonId: p.lessonId, title: p.title, type: p.type, status: statusOf.get(p.lessonId)! })),
            }))
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
            })
          } else {
            // A selection of single lessons: each one on its own, all open (D-57).
            for (const lessonId of a.lessonIds) {
              if (seenLessons.has(lessonId)) continue
              seenLessons.add(lessonId)
              try {
                const [l, p] = await Promise.all([getDoc(doc(db, 'lessons', lessonId)), progressOf(lessonId)])
                if (!l.exists()) continue
                singles.push({ lessonId, title: l.data().title, type: l.data().type, language: l.data().language, status: p.finished ? 'done' : 'open', givenAt })
              } catch {
                // A lesson that can't be read is left out.
              }
            }
          }
        }
        return { id: classId, name: data.name, teacherNames: data.teacherNames || [], color: data.color || '#0E6B73', courses, singles }
      } catch {
        return null
      }
    }),
  )
  return classes.filter((c): c is ClassWork => c !== null)
}

// The "To do" list (REQ-6.1): every lesson the student can open now and hasn't finished,
// in all their classes, oldest assignment first (no due dates yet, D-57).
export function todoList(classes: ClassWork[]): TodoItem[] {
  const out: TodoItem[] = []
  for (const c of classes) {
    const base = { classId: c.id, className: c.name, color: c.color }
    for (const course of c.courses) {
      for (const it of course.items) {
        for (const l of [it, ...it.practice]) {
          if (l.status === 'open') out.push({ ...base, lessonId: l.lessonId, title: l.title, type: l.type, status: l.status, courseTitle: course.title, language: course.language, givenAt: course.givenAt })
        }
      }
    }
    for (const s of c.singles) if (s.status === 'open') out.push({ ...base, ...s, courseTitle: null })
  }
  return out.sort((a, b) => a.givenAt - b.givenAt)
}

// May the student open this lesson? 'open' if it is open or done anywhere they were given it,
// 'locked' if it is only in courses where it is still locked, 'notGiven' otherwise.
export function lessonAccess(classes: ClassWork[], lessonId: string): 'open' | 'locked' | 'notGiven' {
  let found: 'locked' | 'notGiven' = 'notGiven'
  for (const c of classes) {
    for (const s of c.singles) if (s.lessonId === lessonId) return 'open'
    for (const course of c.courses) {
      for (const it of course.items) {
        for (const l of [it, ...it.practice]) {
          if (l.lessonId !== lessonId) continue
          if (l.status !== 'locked') return 'open'
          found = 'locked'
        }
      }
    }
  }
  return found
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

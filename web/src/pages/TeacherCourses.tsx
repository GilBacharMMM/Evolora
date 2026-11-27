import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '../site'
import { BackButton } from '../components/BackButton'
import { ClassTabs } from '../components/ClassTabs'
import { TypeChip } from '../components/TypeChip'
import { navigate } from '../router'
import type { Course, CourseEntry, LessonSummary } from '../lesson/types'

interface Given {
  kind: 'course' | 'lessons'
  courseId: string | null
  lessonIds: string[]
  archived?: boolean
  createdAt: number
}

interface Data {
  name: string
  color: string
  courses: { course: Course; archived: boolean }[]
  singles: CourseEntry[]
}

// "Courses in the class" (REQ-5.35, D-91): everything the class was given, so the teacher can
// open any lesson quickly. Each course opens to its lessons in order, with each teaching
// lesson's practice lessons under it; lessons given one by one come after the courses; courses
// archived for the class are at the bottom. A lesson opens in the teacher's whole-lesson view
// (REQ-5.32, D-90). Only the class's own teachers can open it (REQ-3.4).
export function TeacherCourses({ classId }: { classId: string }) {
  const { t } = useTranslation()
  const [data, setData] = useState<Data | null>(null)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      const c = await getDoc(doc(db, 'classes', classId))
      if (!c.exists()) throw new Error('not found')
      const given = (await getDocs(collection(db, 'classes', classId, 'assignments'))).docs
        .map((a) => ({ ...(a.data() as Omit<Given, 'createdAt'>), createdAt: a.data().createdAt?.toMillis?.() ?? 0 }))
        .sort((a, b) => a.createdAt - b.createdAt)

      // A course given several times (for example, to different students) appears once. It is
      // archived only when every one of its assignments is archived, as on the class settings tab.
      const courseIds = [...new Set(given.filter((g) => g.kind === 'course' && g.courseId).map((g) => g.courseId as string))]
      const courses = (
        await Promise.all(
          courseIds.map(async (id) => {
            const s = await getDoc(doc(db, 'courses', id)).catch(() => null)
            if (!s?.exists()) return null
            const archived = given.filter((g) => g.kind === 'course' && g.courseId === id).every((g) => g.archived === true)
            return { course: { id: s.id, ...(s.data() as Omit<Course, 'id'>) }, archived }
          }),
        )
      ).filter((x): x is { course: Course; archived: boolean } => x !== null)

      // Lessons given one by one, each once, in the order they were given.
      const singleIds = [...new Set(given.filter((g) => g.kind === 'lessons').flatMap((g) => g.lessonIds || []))]
      const singles = (
        await Promise.all(
          singleIds.map(async (id) => {
            const s = await getDoc(doc(db, 'lessons', id)).catch(() => null)
            if (!s?.exists()) return null
            const l = s.data() as Omit<LessonSummary, 'id'>
            return { lessonId: id, title: l.title, type: l.type }
          }),
        )
      ).filter((x): x is CourseEntry => x !== null)

      if (live) setData({ name: c.data().name, color: c.data().color || '#0E6B73', courses, singles })
    })().catch(() => live && setBlocked(true))
    return () => {
      live = false
    }
  }, [classId])

  if (blocked) {
    return (
      <main className="page narrow">
        <BackButton />
        <div className="card message-card">
          <p>{t('teacher.classNotYours')}</p>
        </div>
      </main>
    )
  }
  if (!data) {
    return (
      <main className="page narrow">
        <p className="loading">{t('common.loading')}</p>
      </main>
    )
  }

  const active = data.courses.filter((c) => !c.archived)
  const archived = data.courses.filter((c) => c.archived)
  const nothing = data.courses.length === 0 && data.singles.length === 0

  return (
    <main className="page narrow">
      <BackButton />
      <ClassTabs classId={classId} name={data.name} color={data.color} active="courses" />
      <section className="card list-card-padded class-courses">
        <p className="muted">{nothing ? t('follow.nothingGiven') : t('follow.coursesIntro')}</p>
        {active.map(({ course }) => (
          <CourseItem key={course.id} course={course} classId={classId} />
        ))}
        {data.singles.length > 0 && (
          <details className="class-course">
            <summary>
              <span className="class-course-title">{t('follow.singleLessons')}</span>
              <span className="muted">{t('follow.lessonCount', { count: data.singles.length })}</span>
            </summary>
            <ul className="class-course-lessons">
              {data.singles.map((l) => (
                <LessonLine key={l.lessonId} lesson={l} classId={classId} />
              ))}
            </ul>
          </details>
        )}
        {archived.length > 0 && (
          <details className="class-courses-archived">
            <summary>
              {t('follow.archivedCourses')} ({archived.length})
            </summary>
            {archived.map(({ course }) => (
              <CourseItem key={course.id} course={course} classId={classId} />
            ))}
          </details>
        )}
      </section>
    </main>
  )
}

// One course: its title, opening to its lessons in order, practice lessons under their teaching lesson.
function CourseItem({ course, classId }: { course: Course; classId: string }) {
  const { t } = useTranslation()
  const count = course.items.reduce((n, it) => n + 1 + it.practice.length, 0)
  return (
    <details className="class-course">
      <summary>
        <span className="class-course-title" dir="auto">
          {course.title}
        </span>
        <span className="muted">{t('follow.lessonCount', { count })}</span>
      </summary>
      <ul className="class-course-lessons">
        {course.items.map((it) => (
          <LessonLine key={it.lessonId} lesson={it} classId={classId}>
            {it.practice.length > 0 && (
              <ul className="class-course-practice">
                {it.practice.map((p) => (
                  <LessonLine key={p.lessonId} lesson={p} classId={classId} />
                ))}
              </ul>
            )}
          </LessonLine>
        ))}
      </ul>
    </details>
  )
}

// A lesson that opens in the teacher's whole-lesson view (REQ-5.32, D-90), for this class, where the
// teacher can remove questions for the class (REQ-5.36).
function LessonLine({ lesson, classId, children }: { lesson: CourseEntry; classId: string; children?: React.ReactNode }) {
  return (
    <li>
      <button type="button" className="class-course-lesson" onClick={() => navigate(`/lesson/${lesson.lessonId}?class=${classId}`)}>
        <TypeChip type={lesson.type} />
        <span dir="auto">{lesson.title}</span>
      </button>
      {children}
    </li>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../site'
import { useSession } from '../session'
import { navigate } from '../router'
import { TypeChip } from '../components/TypeChip'
import { BackButton } from '../components/BackButton'
import type { Course, LessonSummary } from '../lesson/types'

interface TeacherClass {
  id: string
  name: string
  color: string
  students: number
}

// The teacher's home (part 1): their classes, and the lessons loaded into Evolora.
// The teacher home page, class dashboard and grading come in parts 3 and 4.
export function TeacherHome() {
  const { t } = useTranslation()
  const { user } = useSession()
  const [classes, setClasses] = useState<TeacherClass[] | null>(null)

  useEffect(() => {
    if (!user) return
    let live = true
    ;(async () => {
      try {
        const snap = await getDocs(query(collection(db, 'classes'), where('teacherIds', 'array-contains', user.uid)))
        const out: TeacherClass[] = []
        for (const c of snap.docs) {
          const students = await getDocs(collection(db, 'classes', c.id, 'students'))
          out.push({ id: c.id, name: c.data().name, color: c.data().color || '#0E6B73', students: students.size })
        }
        if (live) setClasses(out)
      } catch {
        if (live) setClasses([])
      }
    })()
    return () => {
      live = false
    }
  }, [user])

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">{t('home.hello', { name: user?.displayName || '' })}</h1>
        <button type="button" className="button secondary" onClick={() => navigate('/teacher/lessons')}>
          {t('teacher.lessons')}
        </button>
      </div>
      <h2 className="section-title">{t('teacher.myClasses')}</h2>
      {classes === null && <p className="loading">{t('common.loading')}</p>}
      {classes?.length === 0 && <p className="card message-card">{t('teacher.noClasses')}</p>}
      <div className="class-grid">
        {classes?.map((c) => (
          <button key={c.id} type="button" className="card class-card class-card-button" onClick={() => navigate(`/teacher/class/${c.id}`)}>
            <span className="class-card-top" style={{ background: c.color }}>
              <span className="class-card-name" dir="auto">
                {c.name}
              </span>
            </span>
            <span className="class-card-body">
              <span>{t('teacher.studentCount', { count: c.students })}</span>
            </span>
          </button>
        ))}
      </div>
    </main>
  )
}

interface StudentRow {
  id: string
  name: string
  email: string
}

// A simple class page (part 1, at Gil's request): the class name and its students'
// names, the viewing part of REQ-5.4. Removing students, the class code and assigning
// lessons come in part 3. Only the class's own teachers can open it (REQ-3.4).
export function TeacherClass({ classId }: { classId: string }) {
  const { t } = useTranslation()
  const [name, setName] = useState<string | null>(null)
  const [color, setColor] = useState('#0E6B73')
  const [teachers, setTeachers] = useState<string[]>([])
  const [students, setStudents] = useState<StudentRow[] | null>(null)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const c = await getDoc(doc(db, 'classes', classId))
        if (!c.exists()) throw new Error('not found')
        const list = await getDocs(collection(db, 'classes', classId, 'students'))
        if (!live) return
        setName(c.data().name)
        setColor(c.data().color || '#0E6B73')
        setTeachers(c.data().teacherNames || [])
        setStudents(
          list.docs
            .map((d) => ({ id: d.id, name: d.data().name || '', email: d.data().email || '' }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        )
      } catch {
        if (live) setBlocked(true)
      }
    })()
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

  return (
    <main className="page narrow">
      <BackButton />
      {name === null ? (
        <p className="loading">{t('common.loading')}</p>
      ) : (
        <section className="card class-card">
          <div className="class-card-top" style={{ background: color }}>
            <h1 className="class-page-title" dir="auto">
              {name}
            </h1>
            <span dir="auto">{teachers.join(', ')}</span>
          </div>
          <div className="class-card-body">
            <h2 className="section-title">
              {t('teacher.students')} ({students?.length ?? 0})
            </h2>
            {students?.length === 0 && <p className="muted">{t('teacher.noStudents')}</p>}
            <ol className="student-list">
              {students?.map((s) => (
                <li key={s.id}>
                  <span className="student-name" dir="auto">
                    {s.name}
                  </span>
                  <span className="muted student-email" dir="ltr">
                    {s.email}
                  </span>
                </li>
              ))}
            </ol>
            <p className="part-note">{t('teacher.classLater')}</p>
          </div>
        </section>
      )}
    </main>
  )
}

// The lessons and courses in Evolora, which every teacher can read (system-design 4.3).
// Searching and filtering (REQ-4.9) come later.
export function LessonLibrary() {
  const { t } = useTranslation()
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null)
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    let live = true
    ;(async () => {
      const [l, c] = await Promise.all([getDocs(collection(db, 'lessons')), getDocs(collection(db, 'courses'))])
      if (!live) return
      setLessons(l.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LessonSummary, 'id'>) })).sort((a, b) => a.title.localeCompare(b.title)))
      setCourses(c.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Course, 'id'>) })))
    })().catch(() => live && setLessons([]))
    return () => {
      live = false
    }
  }, [])

  return (
    <main className="page">
      <BackButton />
      <h1 className="page-title">{t('teacher.lessons')}</h1>
      {lessons === null && <p className="loading">{t('common.loading')}</p>}
      <section className="card list-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('teacher.lessonTitle')}</th>
              <th>{t('teacher.type')}</th>
              <th>{t('teacher.subject')}</th>
              <th>{t('teacher.questions')}</th>
              <th>{t('teacher.version')}</th>
            </tr>
          </thead>
          <tbody>
            {lessons?.map((l) => (
              <tr key={l.id}>
                <td>
                  <button type="button" className="link-button" dir="auto" onClick={() => navigate(`/lesson/${l.id}`)}>
                    {l.title}
                  </button>
                </td>
                <td>
                  <TypeChip type={l.type} />
                </td>
                <td dir="auto">{l.subject}</td>
                <td>{l.counts?.questions ?? ''}</td>
                <td>{l.currentVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <h2 className="section-title">{t('teacher.courses')}</h2>
      <div className="class-grid">
        {courses.map((c) => (
          <section key={c.id} className="card course-card" dir={c.language === 'en' ? 'ltr' : 'rtl'} lang={c.language}>
            <h3>{c.title}</h3>
            <ol>
              {c.items.map((it) => (
                <li key={it.lessonId}>
                  <span dir="auto">{it.title}</span>
                  {it.practice.length > 0 && (
                    <ul>
                      {it.practice.map((p) => (
                        <li key={p.lessonId} dir="auto">
                          {p.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  )
}

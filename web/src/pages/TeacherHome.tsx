import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../site'
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

// The teacher's home: their classes, creating a class (REQ-5.1), and the lessons in Evolora.
// The full teacher home page, class dashboard and grading come in part 4.
export function TeacherHome() {
  const { t } = useTranslation()
  const { user } = useSession()
  const [classes, setClasses] = useState<TeacherClass[] | null>(null)

  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!user) return
    let live = true
    ;(async () => {
      try {
        const snap = await getDocs(query(collection(db, 'classes'), where('teacherIds', 'array-contains', user.uid)))
        const out: TeacherClass[] = []
        for (const c of snap.docs) {
          const students = await getDocs(collection(db, 'classes', c.id, 'students'))
          out.push({ id: c.id, name: c.data().name, color: c.data().color || '#0E6B73', students: students.docs.filter((s) => !s.data().removed).length })
        }
        if (live) setClasses(out)
      } catch {
        if (live) setClasses([])
      }
    })()
    return () => {
      live = false
    }
  }, [user, reload])

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
      {classes?.length === 0 && <p className="muted">{t('teacher.noClasses')}</p>}
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
      <CreateClass onCreated={(id) => { setReload((n) => n + 1); navigate(`/teacher/class/${id}`) }} />
    </main>
  )
}

// A teacher creates a class by typing its name (REQ-5.1). Evolora gives it a colour and a class code.
function CreateClass({ onCreated }: { onCreated: (classId: string) => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <section className="card join-card compact" aria-labelledby="create-title">
      <h2 id="create-title">{t('teacher.createClass')}</h2>
      <form
        className="join-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim() || busy) return
          setBusy(true)
          setFailed(false)
          try {
            const r = await httpsCallable<{ name: string }, { classId: string }>(functions, 'createClass')({ name })
            setName('')
            onCreated(r.data.classId)
          } catch {
            setFailed(true)
          } finally {
            setBusy(false)
          }
        }}
      >
        <label>
          <span className="visually-hidden">{t('teacher.className')}</span>
          <input className="name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('teacher.classNameExample')} dir="auto" maxLength={80} />
        </label>
        <button type="submit" className="button primary" disabled={busy || !name.trim()}>
          {busy ? t('teacher.creating') : t('teacher.create')}
        </button>
      </form>
      {failed && <p className="notice" role="alert">{t('teacher.actionFailed')}</p>}
    </section>
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

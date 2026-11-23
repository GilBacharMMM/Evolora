import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, getDocs } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../site'
import { useSession } from '../session'
import { navigate } from '../router'
import { TypeChip } from '../components/TypeChip'
import { BackButton } from '../components/BackButton'
import type { Course, LessonSummary } from '../lesson/types'

interface ClassCard {
  id: string
  name: string
  color: string
  students: number
  openFlags: number
  waiting: number
}

type TodoItem =
  | { kind: 'flag'; classId: string; className: string; flagId: string; studentId: string; studentName: string; lessonTitle: string; flagKind: string; topicName: string | null; at: number | null }
  | { kind: 'grade'; classId: string; className: string; lessonId: string; lessonTitle: string; count: number; at: number | null }

// The teacher's home (REQ-5.27): a card for each class with what needs attention (open red flags,
// answers to grade), and a "To do" list for all classes together. Messages and level suggestions
// come with REQ-5.16 and 5.18. Also: creating a class (REQ-5.1), and the lessons in Evolora.
export function TeacherHome() {
  const { t } = useTranslation()
  const { user } = useSession()
  const [data, setData] = useState<{ classes: ClassCard[]; todo: TodoItem[] } | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!user) return
    let live = true
    httpsCallable<unknown, { classes: ClassCard[]; todo: TodoItem[] }>(functions, 'teacherHome')({})
      .then((r) => live && setData(r.data))
      .catch(() => live && setData({ classes: [], todo: [] }))
    return () => {
      live = false
    }
  }, [user, reload])

  const classes = data?.classes ?? null
  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">{t('home.hello', { name: user?.displayName || '' })}</h1>
        <button type="button" className="button secondary" onClick={() => navigate('/teacher/lessons')}>
          {t('teacher.lessons')}
        </button>
      </div>
      {classes === null ? (
        <p className="loading">{t('common.loading')}</p>
      ) : (
        <div className="home-layout">
          <section className="home-classes" aria-labelledby="classes-title">
            <h2 id="classes-title" className="section-title">
              {t('teacher.myClasses')}
            </h2>
            {classes.length === 0 && <p className="muted">{t('teacher.noClasses')}</p>}
            <div className="class-grid">
              {classes.map((c) => (
                <button key={c.id} type="button" className="card class-card class-card-button" onClick={() => navigate(`/teacher/class/${c.id}`)}>
                  <span className="class-card-top" style={{ background: c.color }}>
                    <span className="class-card-name" dir="auto">
                      {c.name}
                    </span>
                    <span>{t('teacher.studentCount', { count: c.students })}</span>
                  </span>
                  <span className="class-card-body attention">
                    <span className={c.openFlags ? 'attn attn-flag' : 'attn'}>
                      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 3v18 M6 4h11l-2.5 4L17 12H6" />
                      </svg>
                      {t('follow.flagsCount', { n: c.openFlags })}
                    </span>
                    <span className={c.waiting ? 'attn attn-grade' : 'attn'}>
                      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20h4l10-10-4-4L4 16z M13 7l4 4" />
                      </svg>
                      {t('follow.toGradeCount', { n: c.waiting })}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <CreateClass
              onCreated={(id) => {
                setReload((n) => n + 1)
                navigate(`/teacher/class/${id}/manage`)
              }}
            />
          </section>
          <aside className="card todo-card" aria-labelledby="todo-title">
            <h2 id="todo-title" className="section-title">
              {t('home.todo')}
            </h2>
            {data!.todo.length === 0 && <p className="muted">{t('follow.todoEmpty')}</p>}
            <ul className="lesson-rows" role="list">
              {data!.todo.map((item) => (
                <li key={item.kind === 'flag' ? item.flagId : `${item.classId}-${item.lessonId}`}>
                  <button
                    type="button"
                    className="lesson-row work-row"
                    onClick={() => navigate(item.kind === 'flag' ? `/teacher/class/${item.classId}/student/${item.studentId}` : `/teacher/class/${item.classId}/lesson/${item.lessonId}/grade`)}
                  >
                    <span className="lesson-row-text">
                      <span className={`badge ${item.kind === 'flag' ? 'badge-red' : 'badge-grade'}`}>{item.kind === 'flag' ? t('follow.redFlag') : t('follow.toGrade', { n: item.count })}</span>
                      <span className="lesson-row-title" dir="auto">
                        {item.kind === 'flag' ? item.studentName : item.lessonTitle}
                      </span>
                      <span className="muted row-note">
                        <bdi>{item.className}</bdi>
                        {item.kind === 'flag' && (
                          <>
                            {' · '}
                            <bdi>{item.lessonTitle}</bdi>
                          </>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
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
  // Search and filters (REQ-4.9): title, subject, grade, language and creator.
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ subject: '', grade: '', language: '', creator: '' })

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

  const values = (key: 'subject' | 'grade' | 'language' | 'creator') => [...new Set((lessons || []).map((l) => String(l[key] ?? '')).filter(Boolean))].sort()
  const words = search.trim().toLowerCase()
  const shown = (lessons || []).filter(
    (l) =>
      (!words || l.title.toLowerCase().includes(words)) &&
      (!filters.subject || l.subject === filters.subject) &&
      (!filters.grade || String(l.grade) === filters.grade) &&
      (!filters.language || l.language === filters.language) &&
      (!filters.creator || l.creator === filters.creator),
  )

  return (
    <main className="page">
      <BackButton />
      <h1 className="page-title">{t('teacher.lessons')}</h1>
      <section className="card library-filters" aria-label={t('library.search')}>
        <label>
          <span>{t('library.search')}</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} dir="auto" placeholder={t('library.searchPlaceholder')} />
        </label>
        {(['subject', 'grade', 'language', 'creator'] as const).map((key) => (
          <label key={key}>
            <span>{t(`library.${key}`)}</span>
            <select value={filters[key]} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}>
              <option value="">{t('library.all')}</option>
              {values(key).map((v) => (
                <option key={v} value={v}>
                  {key === 'language' ? t(`library.lang.${v}`, { defaultValue: v }) : v}
                </option>
              ))}
            </select>
          </label>
        ))}
        <span className="muted small-note">{t('library.count', { shown: shown.length, total: lessons?.length ?? 0 })}</span>
      </section>
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
            {shown.map((l) => (
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

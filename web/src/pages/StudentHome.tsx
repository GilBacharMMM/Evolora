import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../site'
import { useSession } from '../session'
import { navigate } from '../router'
import { TypeChip } from '../components/TypeChip'
import type { Course, CourseEntry } from '../lesson/types'

interface ClassInfo {
  id: string
  name: string
  teacherNames: string[]
  color: string
  courses: Course[]
}

// The student's home (part 1). A person who hasn't joined a class sees only the
// "Join a class" box (REQ-3.2, 10.1). The full home page with the "To do" list, class
// pages and course pages comes in part 3 (REQ-6.1, 6.11, 6.12).
export function StudentHome() {
  const { t } = useTranslation()
  const { classIds, user } = useSession()
  const [classes, setClasses] = useState<ClassInfo[] | null>(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      const out: ClassInfo[] = []
      for (const id of classIds) {
        try {
          const c = await getDoc(doc(db, 'classes', id))
          if (!c.exists()) continue
          const data = c.data()
          const courses: Course[] = []
          for (const courseId of (data.courseIds as string[]) || []) {
            const s = await getDoc(doc(db, 'courses', courseId))
            if (s.exists()) courses.push({ id: s.id, ...(s.data() as Omit<Course, 'id'>) })
          }
          out.push({ id, name: data.name, teacherNames: data.teacherNames || [], color: data.color || '#0E6B73', courses })
        } catch {
          // A class that can't be read is left out.
        }
      }
      if (live) setClasses(out)
    })()
    return () => {
      live = false
    }
  }, [classIds])

  if (classIds.length === 0) {
    return (
      <main className="page narrow">
        <h1 className="page-title">{t('home.hello', { name: user?.displayName || '' })}</h1>
        <JoinClass />
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">{t('home.hello', { name: user?.displayName || '' })}</h1>
      </div>
      {classes === null && <p className="loading">{t('common.loading')}</p>}
      <div className="class-list">
        {classes?.map((c) => (
          <section key={c.id} className="card class-card">
            <div className="class-card-top" style={{ background: c.color }}>
              <h2>{c.name}</h2>
              <span>{c.teacherNames.join(', ')}</span>
            </div>
            <div className="class-card-body">
              {c.courses.length === 0 && <p className="muted">{t('home.nothingYet')}</p>}
              {c.courses.map((course) => (
                <div key={course.id} className="course" dir={course.language === 'en' ? 'ltr' : 'rtl'} lang={course.language}>
                  <h3>{course.title}</h3>
                  <ul className="lesson-rows" role="list">
                    {course.items.map((item) => (
                      <li key={item.lessonId}>
                        <LessonRow entry={item} />
                        {item.practice.length > 0 && (
                          <ul className="lesson-rows practice" role="list">
                            {item.practice.map((p) => (
                              <li key={p.lessonId}>
                                <LessonRow entry={p} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <JoinClass compact />
    </main>
  )
}

export function LessonRow({ entry }: { entry: CourseEntry }) {
  return (
    <button type="button" className="lesson-row" onClick={() => navigate(`/lesson/${entry.lessonId}`)}>
      <span className="lesson-row-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" className="flip-rtl">
          <path d="M7 4l12 8-12 8z" fill="currentColor" />
        </svg>
      </span>
      <span className="lesson-row-text">
        <TypeChip type={entry.type} />
        <span className="lesson-row-title" dir="auto">
          {entry.title}
        </span>
      </span>
    </button>
  )
}

// "Join a class" with a class code (REQ-5.2). Joining itself is built in part 3.
function JoinClass({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [tried, setTried] = useState(false)
  return (
    <section className={`card join-card${compact ? ' compact' : ''}`} aria-labelledby="join-title">
      <h2 id="join-title">{t('home.joinTitle')}</h2>
      {!compact && <p className="muted">{t('home.joinExplain')}</p>}
      <form
        className="join-form"
        onSubmit={(e) => {
          e.preventDefault()
          setTried(true)
        }}
      >
        <label>
          <span className="visually-hidden">{t('home.classCode')}</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('home.classCode')} dir="ltr" autoComplete="off" maxLength={7} />
        </label>
        <button type="submit" className="button primary">
          {t('home.join')}
        </button>
      </form>
      {tried && (
        <p role="status" className="notice">
          {t('home.joinComingSoon')}
        </p>
      )}
    </section>
  )
}

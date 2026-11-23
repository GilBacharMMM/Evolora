import { useTranslation } from 'react-i18next'
import { navigate } from '../router'
import { useClasswork, type ClassWork } from '../classwork'
import { BackButton } from '../components/BackButton'
import { ProgressBar, StatusIcon, StatusWord, WorkRow } from '../components/LessonStatus'

function NotInClass() {
  const { t } = useTranslation()
  return (
    <main className="page narrow">
      <BackButton />
      <div className="card message-card">
        <p>{t('cls.notInClass')}</p>
      </div>
    </main>
  )
}

function ClassHead({ c }: { c: ClassWork }) {
  return (
    <div className="card class-card">
      <div className="class-card-top" style={{ background: c.color }}>
        <h1 className="class-page-title" dir="auto">
          {c.name}
        </h1>
        <span dir="auto">{c.teacherNames.join(', ')}</span>
      </div>
    </div>
  )
}

// The class page for students (REQ-6.11): active courses, waiting single lessons, and what
// was finished this semester. Archived courses come with REQ-5.21 (priority 3).
export function StudentClass({ classId }: { classId: string }) {
  const { t } = useTranslation()
  const classes = useClasswork()
  if (classes === null) return <main className="page narrow"><p className="loading">{t('common.loading')}</p></main>
  const c = classes.find((x) => x.id === classId)
  if (!c) return <NotInClass />

  const active = c.courses.filter((k) => !k.finished)
  const waiting = c.singles.filter((s) => s.status !== 'done')
  const finishedCourses = c.courses.filter((k) => k.finished)
  const finishedSingles = c.singles.filter((s) => s.status === 'done')

  return (
    <main className="page narrow">
      <BackButton />
      <ClassHead c={c} />

      <section aria-labelledby="active-title" className="class-section">
        <h2 id="active-title" className="section-title">{t('cls.activeCourses')}</h2>
        {active.length === 0 && <p className="muted">{t('cls.noCourses')}</p>}
        {active.map((k) => (
          <button key={k.courseId} type="button" className="card course-button" onClick={() => navigate(`/class/${classId}/course/${k.courseId}`)}>
            <span className="course-button-title" dir="auto" lang={k.language}>
              {k.title}
            </span>
            <ProgressBar percent={k.percent} done={k.done} total={k.total} />
          </button>
        ))}
      </section>

      <section aria-labelledby="waiting-title" className="class-section">
        <h2 id="waiting-title" className="section-title">{t('cls.waitingLessons')}</h2>
        {waiting.length === 0 && <p className="muted">{t('cls.noWaiting')}</p>}
        <ul className="lesson-rows" role="list">
          {waiting.map((s) => (
            <li key={s.lessonId} lang={s.language}>
              <WorkRow lesson={s} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="finished-title" className="class-section">
        <h2 id="finished-title" className="section-title">{t('cls.finished')}</h2>
        {finishedCourses.length + finishedSingles.length === 0 && <p className="muted">{t('cls.noFinished')}</p>}
        <ul className="lesson-rows" role="list">
          {finishedCourses.map((k) => (
            <li key={k.courseId}>
              <button type="button" className="lesson-row work-row status-row-done" onClick={() => navigate(`/class/${classId}/course/${k.courseId}`)}>
                <span className="lesson-row-icon" aria-hidden="true">
                  <StatusIcon status="done" />
                </span>
                <span className="lesson-row-text">
                  <span className="course-chip">{t('cls.course')}</span>
                  <span className="lesson-row-title" dir="auto" lang={k.language}>
                    {k.title}
                  </span>
                </span>
                <StatusWord status="done" />
              </button>
            </li>
          ))}
          {finishedSingles.map((s) => (
            <li key={s.lessonId} lang={s.language}>
              <WorkRow lesson={s} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

// The course page for students (REQ-6.12, 6.4): every lesson in order, practice lessons under
// their teaching lesson, each with its status. Lessons open one after another (D-55).
export function StudentCourse({ classId, courseId }: { classId: string; courseId: string }) {
  const { t } = useTranslation()
  const classes = useClasswork()
  if (classes === null) return <main className="page narrow"><p className="loading">{t('common.loading')}</p></main>
  const c = classes.find((x) => x.id === classId)
  const k = c?.courses.find((x) => x.courseId === courseId)
  if (!c || !k) return <NotInClass />

  return (
    <main className="page narrow">
      <BackButton to={`/class/${classId}`} />
      <section className="card course-page">
        <p className="muted course-class" dir="auto">
          {c.name}
        </p>
        <h1 className="page-title" dir="auto" lang={k.language}>
          {k.title}
        </h1>
        <ProgressBar percent={k.percent} done={k.done} total={k.total} />
        <ol className="lesson-rows course-lessons" lang={k.language}>
          {k.items.map((it) => (
            <li key={it.lessonId}>
              <WorkRow lesson={it} />
              {it.practice.length > 0 && (
                <ul className="lesson-rows practice" role="list">
                  {it.practice.map((p) => (
                    <li key={p.lessonId}>
                      <WorkRow lesson={p} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}

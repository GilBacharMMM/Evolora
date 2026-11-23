import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../site'
import { navigate } from '../router'
import { BackButton } from '../components/BackButton'
import { TypeChip } from '../components/TypeChip'
import { Markdown } from '../lesson/Rich'
import { ClassTabs } from '../components/ClassTabs'
import { Messages } from '../components/Messages'
import { MarkedAnswer } from '../components/MarkedAnswer'
import { Recorder, blobToBase64 } from '../components/Recorder'
import { HIGHLIGHT_END, HIGHLIGHT_START, hasMarkup } from '../markup'
import type { LessonType } from '../lesson/types'

// The teacher's screens for following a class (stage 1, part 4, system-design 2.7):
// class dashboard with the progress map (REQ-5.10, 5.24), grade table with CSV (REQ-5.11),
// student page (REQ-5.28, 5.25, 5.19), one lesson's results with changing scores and sending back
// (REQ-5.15, 5.14), and the grading page (REQ-5.12, 5.13).

const call = <T,>(name: string, data: unknown) => httpsCallable<unknown, T>(functions, name)(data).then((r) => r.data)

export type Cell = { kind: 'notDone' | 'pending' | 'grade' | 'doneNoGrade'; percent: number | null; started: boolean; waiting: number; tips: number; sentBack?: 'review' | 'corrections' | null; due?: number | null; late?: boolean }

interface CourseInfo {
  courseId: string
  title: string
  language: string
  order: string[]
  middle: number
  archived?: boolean
  items: { lessonId: string; title: string; type: LessonType; practice: { lessonId: string; title: string; type: LessonType }[] }[]
}

interface StudentRow {
  id: string
  name: string
  email: string
  level: number
  courseIds: string[]
  lessonIds: string[]
  cells: Record<string, Cell>
  positions: Record<string, { done: number; current: string | null; working: boolean }>
  average: number | null
  openFlags: number
  lastWorked: number | null
  status: 'red' | 'orange' | 'yellow' | 'green'
  star: boolean
  // A suggested level (REQ-5.18), or null.
  suggestion?: number | null
}

export interface Flag {
  id: string
  uid: string
  studentName: string
  lessonId: string
  lessonTitle: string
  questionId: string
  topicName: string | null
  kind: 'checkAgainWrong' | 'minimumNotReached' | 'examWrong'
  alsoMinimum: boolean
  open: boolean
  createdAt: number | null
  clearedAt: number | null
  clearNote: string | null
}

export interface Overview {
  name: string
  color: string
  teacherNames: string[]
  courses: CourseInfo[]
  lessons: Record<string, { title: string; type: LessonType; language: string }>
  columns: string[]
  openings: { id: string; lessonId: string; everyone: boolean; studentIds: string[] }[]
  students: StudentRow[]
  // Removed students (REQ-5.4): their page and work stay open to the teacher.
  removedStudents?: StudentRow[]
  flags: Flag[]
  csv: string
}

function useOverview(classId: string) {
  const [data, setData] = useState<Overview | null>(null)
  const [failed, setFailed] = useState(false)
  const load = useCallback(async () => {
    try {
      setData(await call<Overview>('classOverview', { classId }))
    } catch {
      setFailed(true)
    }
  }, [classId])
  useEffect(() => {
    void load()
  }, [load])
  return { data, failed, reload: load }
}

function Loading() {
  const { t } = useTranslation()
  return <p className="loading">{t('common.loading')}</p>
}

function NotYours() {
  const { t } = useTranslation()
  return (
    <main className="page narrow">
      <BackButton />
      <div className="card message-card">
        <p>{t('teacher.classNotYours')}</p>
      </div>
    </main>
  )
}

const STATUS_ORDER = { red: 0, orange: 1, yellow: 2, green: 3 }

export function StatusBadge({ status, star }: { status: StudentRow['status']; star?: boolean }) {
  const { t } = useTranslation()
  const icon =
    status === 'red' ? (
      <path d="M6 3v18 M6 4h11l-2.5 4L17 12H6" />
    ) : status === 'orange' ? (
      <path d="M12 5v10 M7 11l5 5 5-5" />
    ) : status === 'yellow' ? (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </>
    ) : (
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    )
  return (
    <span className="status-cell">
      <span className={`badge badge-${status}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
        {t(`follow.status.${status}`)}
      </span>
      {star && (
        <span className="star" title={t('follow.ahead')}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1-4.5-4.2 6.1-.8z" fill="currentColor" />
          </svg>
          <span className="visually-hidden">{t('follow.ahead')}</span>
        </span>
      )}
    </span>
  )
}

function when(ms: number | null, lang: string) {
  if (!ms) return '—'
  return new Date(ms).toLocaleString(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// The class dashboard (REQ-5.10) with the progress map (REQ-5.24). Sortable by every column.
export function ClassDashboard({ classId }: { classId: string }) {
  const { t, i18n } = useTranslation()
  const { data, failed, reload } = useOverview(classId)
  const [sort, setSort] = useState<{ key: string; up: boolean }>({ key: 'status', up: true })

  const rows = useMemo(() => {
    if (!data) return []
    const value = (s: StudentRow): string | number => {
      if (sort.key === 'status') return STATUS_ORDER[s.status] * 10 + (s.star ? 0 : 1)
      if (sort.key === 'name') return s.name
      if (sort.key === 'level') return s.level
      if (sort.key === 'average') return s.average ?? -1
      if (sort.key === 'flags') return -s.openFlags
      if (sort.key === 'last') return -(s.lastWorked || 0)
      if (sort.key.startsWith('course:')) return -(s.positions[sort.key.slice(7)]?.done ?? -1)
      return 0
    }
    return [...data.students].sort((a, b) => {
      const x = value(a)
      const y = value(b)
      const c = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)
      return (sort.up ? c : -c) || a.name.localeCompare(b.name)
    })
  }, [data, sort])

  if (failed) return <NotYours />
  if (!data) {
    return (
      <main className="page">
        <BackButton />
        <Loading />
      </main>
    )
  }

  const Head = ({ k, children }: { k: string; children: ReactNode }) => (
    <th aria-sort={sort.key === k ? (sort.up ? 'ascending' : 'descending') : undefined}>
      <button type="button" className="sort-button" onClick={() => setSort((s) => ({ key: k, up: s.key === k ? !s.up : true }))}>
        {children}
        <span aria-hidden="true">{sort.key === k ? (sort.up ? ' ▲' : ' ▼') : ''}</span>
      </button>
    </th>
  )

  return (
    <main className="page">
      <BackButton />
      <ClassTabs classId={classId} name={data.name} color={data.color} active="dashboard" />
      {data.students.length === 0 ? (
        <p className="card message-card">{t('teacher.noStudents')}</p>
      ) : (
        <section className="card list-card">
          <table className="data-table dashboard-table">
            <thead>
              <tr>
                <Head k="status">{t('follow.statusTitle')}</Head>
                <Head k="name">{t('follow.student')}</Head>
                <Head k="level">{t('follow.level')}</Head>
                {data.courses.filter((c) => !c.archived).map((c) => (
                  <Head key={c.courseId} k={`course:${c.courseId}`}>
                    <span dir="auto">{c.title}</span>
                  </Head>
                ))}
                <Head k="average">{t('follow.average')}</Head>
                <Head k="flags">{t('follow.openFlags')}</Head>
                <Head k="last">{t('follow.lastWorked')}</Head>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <StatusBadge status={s.status} star={s.star} />
                  </td>
                  <td>
                    <button type="button" className="link-button" dir="auto" onClick={() => navigate(`/teacher/class/${classId}/student/${s.id}`)}>
                      {s.name}
                    </button>
                  </td>
                  <td>
                    <LevelControl classId={classId} studentId={s.id} level={s.level} name={s.name} onChange={reload} />
                    {s.suggestion && <Suggestion classId={classId} studentId={s.id} level={s.suggestion} onAccepted={reload} />}
                  </td>
                  {data.courses.filter((c) => !c.archived).map((c) => (
                    <td key={c.courseId}>
                      {s.courseIds.includes(c.courseId) ? <ProgressMap course={c} student={s} lessons={data.lessons} /> : <span className="muted">—</span>}
                    </td>
                  ))}
                  <td>{s.average == null ? '—' : `${s.average}%`}</td>
                  <td>{s.openFlags ? <strong className="flag-count">{s.openFlags}</strong> : '0'}</td>
                  <td className="muted nowrap">{when(s.lastWorked, i18n.language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <p className="muted small-note">{t('follow.statusExplain')}</p>
      <OpenFlags classId={classId} flags={data.flags.filter((f) => f.open)} onCleared={reload} />
    </main>
  )
}

// Where the student is in a course (REQ-5.24): a mark for every lesson (done, working on, not yet)
// and the title of the current lesson.
function ProgressMap({ course, student, lessons }: { course: CourseInfo; student: StudentRow; lessons: Overview['lessons'] }) {
  const { t } = useTranslation()
  const pos = student.positions[course.courseId]
  return (
    <div className="progress-map">
      <div className="map-marks" aria-hidden="true">
        {course.order.map((l) => {
          const c = student.cells[l]
          const state = c && c.kind !== 'notDone' ? 'done' : l === pos.current && pos.working ? 'working' : 'ahead'
          return <span key={l} className={`map-mark map-${state}`} title={lessons[l]?.title} />
        })}
      </div>
      <span className="map-text">
        {t('follow.lessonsOf', { done: pos.done, total: course.order.length })}
        {pos.current && (
          <>
            {' · '}
            {pos.working ? t('follow.workingOn') : t('follow.next')} <bdi>{lessons[pos.current]?.title}</bdi>
          </>
        )}
      </span>
    </div>
  )
}

// A suggested level (REQ-5.18): accepted with one click, or simply ignored.
function Suggestion({ classId, studentId, level, onAccepted }: { classId: string; studentId: string; level: number; onAccepted: () => Promise<void> }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  return (
    <span className="suggestion">
      {t('follow.suggested', { level })}{' '}
      <button
        type="button"
        className="link-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await call('setLevel', { classId, studentId, level })
            await onAccepted()
          } finally {
            setBusy(false)
          }
        }}
      >
        {t('follow.accept')}
      </button>
    </span>
  )
}

// The student's level with − and + (REQ-5.10, 5.18); the change is saved at once.
export function LevelControl({ classId, studentId, level, name, onChange }: { classId: string; studentId: string; level: number; name: string; onChange: () => Promise<void> }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(level)
  const [busy, setBusy] = useState(false)
  useEffect(() => setValue(level), [level])
  const change = async (next: number) => {
    if (next < 1 || next > 3 || busy) return
    setBusy(true)
    setValue(next)
    try {
      await call('setLevel', { classId, studentId, level: next })
      await onChange()
    } catch {
      setValue(level)
    } finally {
      setBusy(false)
    }
  }
  return (
    <span className="level-control">
      <button type="button" className="level-button" aria-label={t('follow.levelDown', { name })} disabled={busy || value <= 1} onClick={() => void change(value - 1)}>
        −
      </button>
      <span className="level-value">{value}</span>
      <button type="button" className="level-button" aria-label={t('follow.levelUp', { name })} disabled={busy || value >= 3} onClick={() => void change(value + 1)}>
        +
      </button>
    </span>
  )
}

function flagText(f: Flag, t: (k: string, o?: Record<string, unknown>) => string) {
  if (f.kind === 'examWrong') return t('follow.flagExam', { question: f.questionId })
  return f.kind === 'checkAgainWrong' ? t('follow.flagCheckAgain', { question: f.questionId }) : t('follow.flagMinimum', { topic: f.topicName || '' })
}

// Open red flags, each saying which question or topic caused it, with "Clear" and a note (REQ-5.19).
export function OpenFlags({ classId, flags, onCleared, showStudent = true }: { classId: string; flags: Flag[]; onCleared: () => Promise<void>; showStudent?: boolean }) {
  const { t, i18n } = useTranslation()
  return (
    <section className="card list-card-padded" aria-labelledby="flags-title">
      <h2 id="flags-title" className="section-title">
        {t('follow.openFlagsTitle')} ({flags.length})
      </h2>
      {flags.length === 0 && <p className="muted">{t('follow.noFlags')}</p>}
      <ul className="flag-list">
        {flags.map((f) => (
          <li key={f.id}>
            <span className="badge badge-red">{t('follow.status.red')}</span>
            <span className="flag-text">
              {showStudent && (
                <button type="button" className="link-button" dir="auto" onClick={() => navigate(`/teacher/class/${classId}/student/${f.uid}`)}>
                  {f.studentName}
                </button>
              )}
              <span>
                <bdi>{f.lessonTitle}</bdi>: {flagText(f, t)}
              </span>
              <span className="muted small-note">{when(f.createdAt, i18n.language)}</span>
            </span>
            <ClearFlag flagId={f.id} onCleared={onCleared} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function ClearFlag({ flagId, onCleared }: { flagId: string; onCleared: () => Promise<void> }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  if (!open) {
    return (
      <button type="button" className="button secondary small" onClick={() => setOpen(true)}>
        {t('follow.clear')}
      </button>
    )
  }
  return (
    <form
      className="clear-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setFailed(false)
        try {
          await call('clearFlag', { flagId, note })
          await onCleared()
        } catch {
          setFailed(true)
          setBusy(false)
        }
      }}
    >
      <label>
        <span>{t('follow.clearNote')}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} dir="auto" />
      </label>
      <div className="button-row">
        <button type="submit" className="button primary" disabled={busy}>
          {t('follow.clearNow')}
        </button>
        <button type="button" className="button secondary" onClick={() => setOpen(false)}>
          {t('teacher.cancel')}
        </button>
      </div>
      {failed && <p className="notice">{t('teacher.actionFailed')}</p>}
    </form>
  )
}

export function GradeCell({ cell }: { cell: Cell | undefined }) {
  const { t } = useTranslation()
  if (!cell) return <span className="muted">—</span>
  if (cell.kind === 'notDone') return <span className="grade-chip notdone">{t('follow.notDone')}</span>
  if (cell.kind === 'pending') return <span className="grade-chip pending">{t('follow.pending')}</span>
  if (cell.kind === 'doneNoGrade') return <span className="grade-chip done">{t('status.done')}</span>
  return (
    <span className="grade-chip graded">
      {cell.percent}%{cell.late ? ` (${t('status.late')})` : ''}
    </span>
  )
}

// The grade table (REQ-5.11): students and lessons, a grade in each cell, CSV download.
export function GradeTable({ classId }: { classId: string }) {
  const { t } = useTranslation()
  const { data, failed } = useOverview(classId)
  if (failed) return <NotYours />
  if (!data) {
    return (
      <main className="page">
        <BackButton />
        <Loading />
      </main>
    )
  }
  const download = () => {
    const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${data.name.replace(/[\\/:*?"<>|]/g, '')} - grades.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  return (
    <main className="page">
      <BackButton />
      <ClassTabs classId={classId} name={data.name} color={data.color} active="grades" />
      <div className="page-head">
        <p className="muted">{t('follow.gradesExplain')}</p>
        <button type="button" className="button primary" onClick={download} disabled={data.students.length === 0}>
          {t('follow.downloadCsv')}
        </button>
      </div>
      <section className="card list-card">
        <table className="data-table grade-table">
          <thead>
            <tr>
              <th>{t('follow.student')}</th>
              <th>{t('follow.level')}</th>
              <th>{t('follow.average')}</th>
              {data.columns.map((l) => (
                <th key={l}>
                  <button type="button" className="link-button column-lesson" onClick={() => navigate(`/teacher/class/${classId}/lesson/${l}`)}>
                    <TypeChip type={data.lessons[l].type} />
                    <span dir="auto">{data.lessons[l].title}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.students.map((s) => (
              <tr key={s.id}>
                <td dir="auto">{s.name}</td>
                <td>{s.level}</td>
                <td>
                  <strong>{s.average == null ? '—' : `${s.average}%`}</strong>
                </td>
                {data.columns.map((l) => (
                  <td key={l}>
                    <GradeCell cell={s.cells[l]} />
                    {s.cells[l]?.waiting ? <span className="muted small-note"> {t('follow.toGrade', { n: s.cells[l].waiting })}</span> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}

interface Details {
  notMastered: { lessonId: string; lessonTitle: string; questionId: string; number: number; prompt: string; flagId: string | null }[]
  notes: { id: string; text: string; byName: string; createdAt: number | null }[]
}

// The student page (REQ-5.28): status, level, average, help tips, progress in each course, grades,
// the "not yet mastered" list (REQ-5.25) and red flags to clear (REQ-5.19), cleared flags with their
// date and note, and private teacher notes. Messages come with REQ-5.16.
export function StudentPage({ classId, studentId }: { classId: string; studentId: string }) {
  const { t, i18n } = useTranslation()
  const { data, failed, reload } = useOverview(classId)
  const [details, setDetails] = useState<Details | null>(null)
  const loadDetails = useCallback(async () => {
    try {
      setDetails(await call<Details>('studentDetails', { classId, studentId }))
    } catch {
      setDetails({ notMastered: [], notes: [] })
    }
  }, [classId, studentId])
  useEffect(() => {
    void loadDetails()
  }, [loadDetails])
  const reloadAll = async () => {
    await Promise.all([reload(), loadDetails()])
  }

  if (failed) return <NotYours />
  if (!data) {
    return (
      <main className="page narrow">
        <BackButton to={`/teacher/class/${classId}`} />
        <Loading />
      </main>
    )
  }
  const removed = !data.students.some((x) => x.id === studentId)
  const s = data.students.find((x) => x.id === studentId) ?? data.removedStudents?.find((x) => x.id === studentId)
  const flags = data.flags.filter((f) => f.uid === studentId)
  if (!s) {
    return (
      <main className="page narrow">
        <BackButton to={`/teacher/class/${classId}`} />
        <p className="card message-card">{t('follow.studentNotHere')}</p>
      </main>
    )
  }
  const tips = Object.values(s.cells).reduce((n, c) => n + c.tips, 0)
  const cleared = flags.filter((f) => !f.open)
  const inCourses = new Set(data.courses.flatMap((c) => c.order))
  const singles = s.lessonIds.filter((l) => !inCourses.has(l))
  const LessonLine = ({ l }: { l: string }) => (
    <li>
      <TypeChip type={data.lessons[l].type} />
      <button type="button" className="link-button given-title" dir="auto" onClick={() => navigate(`/teacher/class/${classId}/lesson/${l}`)}>
        {data.lessons[l].title}
      </button>
      <span className="given-to">
        {s.cells[l]?.sentBack && <span className="notes-chip">{t(`follow.sentBack.${s.cells[l].sentBack}`)}</span>} <GradeCell cell={s.cells[l]} />
      </span>
    </li>
  )
  return (
    <main className="page narrow">
      <BackButton to={`/teacher/class/${classId}`} />
      <section className="card list-card-padded">
        <p className="muted course-class" dir="auto">
          {data.name}
        </p>
        <h1 className="page-title" dir="auto">
          {s.name}
        </h1>
        {removed && <p className="notice">{t('follow.removedStudent')}</p>}
        <div className="student-facts">
          <StatusBadge status={s.status} star={s.star} />
          <span>
            {t('follow.level')}: <LevelControl classId={classId} studentId={s.id} level={s.level} name={s.name} onChange={reload} />
          </span>
          <span>
            {t('follow.average')}: <strong>{s.average == null ? '—' : `${s.average}%`}</strong>
          </span>
          <span>{t('follow.tipsOpened', { n: tips })}</span>
        </div>
        {!removed && <LanguageChange classId={classId} studentId={s.id} />}
      </section>

      <section className="card list-card-padded" aria-labelledby="mastered-title">
        <h2 id="mastered-title" className="section-title">
          {t('follow.notMastered')}
        </h2>
        <p className="muted small-note">{t('follow.notMasteredExplain')}</p>
        {details === null && <Loading />}
        {details?.notMastered.length === 0 && <p className="muted">{t('follow.allMastered')}</p>}
        <ul className="flag-list">
          {details?.notMastered.map((q) => (
            <li key={`${q.lessonId}-${q.questionId}`}>
              {q.flagId && <span className="badge badge-red">{t('follow.status.red')}</span>}
              <span className="flag-text">
                <button type="button" className="link-button" dir="auto" onClick={() => navigate(`/teacher/class/${classId}/lesson/${q.lessonId}`)}>
                  {q.lessonTitle}
                </button>
                <span>
                  {t('q.questionNumber', { number: q.number })}: <bdi className="muted">{q.prompt.replace(/[*_#$`]/g, '').slice(0, 140)}</bdi>
                </span>
              </span>
              {q.flagId && <ClearFlag flagId={q.flagId} onCleared={reloadAll} />}
            </li>
          ))}
        </ul>
      </section>

      <OpenFlags classId={classId} flags={flags.filter((f) => f.open)} onCleared={reloadAll} showStudent={false} />

      <section className="card list-card-padded">
        <h2 className="section-title">{t('follow.progressAndGrades')}</h2>
        {data.courses
          .filter((c) => s.courseIds.includes(c.courseId))
          .map((c) => (
            <div key={c.courseId} className="student-course">
              <h3 dir="auto">{c.title}</h3>
              <ProgressMap course={c} student={s} lessons={data.lessons} />
              <ul className="given-list">
                {c.order.filter((l) => s.lessonIds.includes(l)).map((l) => (
                  <LessonLine key={l} l={l} />
                ))}
              </ul>
            </div>
          ))}
        {singles.length > 0 && (
          <div className="student-course">
            <h3>{t('follow.singleLessons')}</h3>
            <ul className="given-list">
              {singles.map((l) => (
                <LessonLine key={l} l={l} />
              ))}
            </ul>
          </div>
        )}
      </section>

      {!removed && <Messages classId={classId} studentId={studentId} asTeacher />}

      <TeacherNotes classId={classId} studentId={studentId} notes={details?.notes || []} onAdded={loadDetails} />

      <section className="card list-card-padded">
        <h2 className="section-title">{t('follow.history')}</h2>
        {cleared.length === 0 && <p className="muted">{t('follow.noHistory')}</p>}
        <ul className="flag-list">
          {cleared.map((f) => (
            <li key={f.id}>
              <span className="badge badge-cleared">{t('follow.cleared')}</span>
              <span className="flag-text">
                <span>
                  <bdi>{f.lessonTitle}</bdi>: {flagText(f, t)}
                </span>
                <span className="muted small-note">
                  {t('follow.clearedOn', { date: when(f.clearedAt, i18n.language) })}
                  {f.clearNote ? ` · ${f.clearNote}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

// The teacher changes the student's interface language; it applies next time they open Evolora (REQ-9.6).
function LanguageChange({ classId, studentId }: { classId: string; studentId: string }) {
  const { t } = useTranslation()
  const [lang, setLang] = useState('')
  const [done, setDone] = useState<string | null>(null)
  return (
    <div className="language-change">
      <label>
        <span>{t('follow.studentLanguage')} </span>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="">{t('follow.chooseLanguage')}</option>
          {(['he', 'ar', 'en'] as const).map((l) => (
            <option key={l} value={l}>
              {t(`library.lang.${l}`)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="button secondary small"
        disabled={!lang}
        onClick={async () => {
          try {
            await call('setStudentLanguage', { classId, studentId, language: lang })
            setDone(t('follow.languageSet'))
          } catch {
            setDone(t('teacher.actionFailed'))
          }
        }}
      >
        {t('follow.save')}
      </button>
      {done && <span className="muted small-note">{done}</span>}
    </div>
  )
}

// Private teacher notes about a student: only the class's teachers see them (REQ-5.28).
function TeacherNotes({ classId, studentId, notes, onAdded }: { classId: string; studentId: string; notes: Details['notes']; onAdded: () => Promise<void> }) {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <section className="card list-card-padded" aria-labelledby="notes-title">
      <h2 id="notes-title" className="section-title">
        {t('follow.notesTitle')}
      </h2>
      <p className="muted small-note">{t('follow.notesExplain')}</p>
      <form
        className="comment-box"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!text.trim()) return
          setBusy(true)
          setFailed(false)
          try {
            await call('addNote', { classId, studentId, text })
            setText('')
            await onAdded()
          } catch {
            setFailed(true)
          } finally {
            setBusy(false)
          }
        }}
      >
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} dir="auto" maxLength={5000} aria-label={t('follow.notesTitle')} />
        <button type="submit" className="button primary" disabled={busy || !text.trim()}>
          {t('follow.addNote')}
        </button>
        {failed && <p className="notice">{t('teacher.actionFailed')}</p>}
      </form>
      <ul className="flag-list">
        {notes.map((n) => (
          <li key={n.id}>
            <span className="flag-text">
              <span dir="auto" className="note-text">
                {n.text}
              </span>
              <span className="muted small-note">
                <bdi>{n.byName}</bdi> · {when(n.createdAt, i18n.language)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

interface QuestionInfo {
  id: string
  kind: 'choice' | 'number' | 'open' | 'audio'
  prompt: string
  extra: boolean
  level: number | null
  topic: number
  topicName: string | null
  gradingInstructions: string | null
  choices: { id: string; text: string }[]
  unit: string | null
}

interface AnswerState {
  attempts: unknown[]
  result: string | null
  score: number | null
  graded: boolean
  changedByTeacher: boolean
  teacherComment: string | null
  markup?: string | null
  teacherAudio?: string | null
  audioUrl?: string | null
  checkAgain: { result: string | null } | null
}

interface Results {
  lessonId: string
  title: string
  language: string
  type: LessonType
  isExam?: boolean
  questions: QuestionInfo[]
  students: {
    id: string
    name: string
    cell: Cell
    states: Record<string, AnswerState>
    sentBack: { mode: 'review' | 'corrections'; questionIds: string[]; done: boolean } | null
    submitted?: boolean
    released?: boolean
    earlier: Record<string, number>
  }[]
}

function useResults(classId: string, lessonId: string) {
  const [data, setData] = useState<Results | null>(null)
  const [failed, setFailed] = useState(false)
  const load = useCallback(async () => {
    try {
      setData(await call<Results>('lessonResults', { classId, lessonId }))
    } catch {
      setFailed(true)
    }
  }, [classId, lessonId])
  useEffect(() => {
    void load()
  }, [load])
  return { data, failed, reload: load, setData }
}

function AnswerMark({ st }: { st: AnswerState | undefined }) {
  const { t } = useTranslation()
  if (!st || !st.result) return <span className="muted">—</span>
  if (st.changedByTeacher) return <span className="grade-chip graded">{Math.round((st.score ?? 0) * 100)}% ✎</span>
  if (st.result === 'pending') {
    return st.graded ? <span className="grade-chip graded">{Math.round((st.score ?? 0) * 100)}%</span> : <span className="grade-chip pending">{t('follow.pending')}</span>
  }
  if (st.result === 'correct1') return <span className="answer-mark right">✓ {t('follow.right')}</span>
  if (st.result === 'correct2') return <span className="answer-mark half">½ {t('follow.secondTry')}</span>
  return <span className="answer-mark wrong">✗ {t('follow.wrong')}</span>
}

// Marking up a written answer (REQ-5.12, D-64): the teacher edits a copy of it, and can
// highlight the selected text. A preview shows what the student will see.
function MarkupBox({ original, value, onChange }: { original: string; value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(!!value)
  const box = useRef<HTMLTextAreaElement>(null)
  if (!open) {
    return (
      <button type="button" className="link-button" onClick={() => { onChange(value || original); setOpen(true) }}>
        {t('markup.start')}
      </button>
    )
  }
  const highlight = () => {
    const el = box.current
    if (!el || el.selectionStart === el.selectionEnd) return
    const { selectionStart: a, selectionEnd: b } = el
    onChange(value.slice(0, a) + HIGHLIGHT_START + value.slice(a, b) + HIGHLIGHT_END + value.slice(b))
  }
  return (
    <div className="markup-box">
      <span className="feedback-subtitle">{t('markup.title')}</span>
      <p className="muted small-note">{t('markup.explain')}</p>
      <textarea ref={box} value={value} onChange={(e) => onChange(e.target.value)} rows={5} dir="auto" aria-label={t('markup.title')} />
      <div className="button-row">
        <button type="button" className="button secondary small" onClick={highlight}>
          {t('markup.highlight')}
        </button>
        <button type="button" className="button secondary small" onClick={() => { onChange(''); setOpen(false) }}>
          {t('markup.remove')}
        </button>
      </div>
      <span className="feedback-subtitle">{t('markup.preview')}</span>
      <MarkedAnswer original={original} markup={value} />
    </div>
  )
}

// Which questions are hard for the class (REQ-5.29): of the students who answered, how many got it
// right on the 1st attempt, on the 2nd, and not at all. Open answers: the average of graded ones.
function SuccessRate({ states }: { states: AnswerState[] }) {
  const { t } = useTranslation()
  if (!states.length) return <span className="muted">—</span>
  const pct = (n: number) => Math.round((n / states.length) * 100)
  if (states.every((st) => st.result === 'pending')) {
    const graded = states.filter((st) => st.graded && st.score != null)
    if (!graded.length) return <span className="muted small-note">{t('follow.pending')}</span>
    return <span className="small-note">{t('follow.rateOpen', { percent: Math.round((graded.reduce((a, st) => a + (st.score || 0), 0) / graded.length) * 100), n: graded.length })}</span>
  }
  const first = states.filter((st) => st.result === 'correct1').length
  const second = states.filter((st) => st.result === 'correct2').length
  return (
    <span className="rate">
      <span>{t('follow.rateFirst', { percent: pct(first) })}</span>
      <span>{t('follow.rateSecond', { percent: pct(second) })}</span>
      <span>{t('follow.rateNot', { percent: pct(states.length - first - second) })}</span>
      <span className="muted">{t('follow.rateOf', { n: states.length })}</span>
    </span>
  )
}

// Full, half, zero or any percentage, saved for one answer (REQ-5.12, 5.15).
function ScoreButtons({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="score-line">
      {[
        ['full', 100],
        ['half', 50],
        ['zero', 0],
      ].map(([k, v]) => (
        <button key={k} type="button" className={`button secondary small${value === String(v) ? ' chosen' : ''}`} onClick={() => onChange(String(v))}>
          {t(`follow.${k}`)}
        </button>
      ))}
      <label className="score-input">
        <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" dir="ltr" aria-label={t('follow.scoreLabel')} />
        <span>%</span>
      </label>
    </div>
  )
}

function readScore(v: string): number | null {
  const n = Number(v.replace(',', '.'))
  return v.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 100 ? n / 100 : null
}

// One lesson's results: each student's result per question (REQ-5.11), "Grade open answers",
// changing any score (REQ-5.15) and sending work back (REQ-5.14).
export function LessonResultsPage({ classId, lessonId }: { classId: string; lessonId: string }) {
  const { t } = useTranslation()
  const { data, failed, reload } = useResults(classId, lessonId)
  const [editing, setEditing] = useState<{ sid: string; qid: string } | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  if (failed) return <NotYours />
  if (!data) {
    return (
      <main className="page">
        <BackButton to={`/teacher/class/${classId}/grades`} />
        <Loading />
      </main>
    )
  }
  const hasOpen = data.questions.some((q) => q.kind === 'open' || q.kind === 'audio')
  const waiting = data.students.reduce((n, s) => n + Object.values(s.states).filter((st) => st.result === 'pending' && !st.graded).length, 0)
  const number = (qid: string) => data.questions.findIndex((x) => x.id === qid) + 1
  const editStudent = editing && data.students.find((s) => s.id === editing.sid)
  const sendStudent = sending && data.students.find((s) => s.id === sending)
  return (
    <main className="page">
      <BackButton to={`/teacher/class/${classId}/grades`} />
      <div className="page-head">
        <h1 className="page-title" dir="auto">
          {data.title}
        </h1>
        <button type="button" className="button secondary" onClick={() => navigate(`/lesson/${lessonId}`)}>
          {t('follow.tryLesson')}
        </button>
        {data.isExam && (
          <button
            type="button"
            className="button primary"
            disabled={!data.students.some((s) => s.submitted && !s.released)}
            onClick={async () => {
              if (!window.confirm(t('exam.releaseConfirm'))) return
              await call('releaseResults', { classId, lessonId }).catch(() => {})
              await reload()
            }}
          >
            {data.students.some((s) => s.submitted) && data.students.filter((s) => s.submitted).every((s) => s.released) ? t('exam.released') : t('exam.release')}
          </button>
        )}
        {hasOpen && (
          <button type="button" className="button primary" onClick={() => navigate(`/teacher/class/${classId}/lesson/${lessonId}/grade`)}>
            {t('follow.gradeOpen')} {waiting ? `(${waiting})` : ''}
          </button>
        )}
      </div>
      <p className="muted small-note">{t('follow.resultsExplain')}</p>
      {editStudent && editing && (
        <ScoreEditor
          classId={classId}
          lessonId={lessonId}
          student={editStudent}
          questionId={editing.qid}
          number={number(editing.qid)}
          onDone={async () => {
            setEditing(null)
            await reload()
          }}
        />
      )}
      {sendStudent && (
        <SendBackForm
          classId={classId}
          lessonId={lessonId}
          student={sendStudent}
          questions={data.questions}
          onDone={async () => {
            setSending(null)
            await reload()
          }}
        />
      )}
      <section className="card list-card">
        <table className="data-table grade-table">
          <thead>
            <tr>
              <th>{t('follow.student')}</th>
              <th>{t('follow.lessonGrade')}</th>
              <th>{data.isExam ? t('exam.title') : t('follow.sendBack')}</th>
              {data.questions.map((q, i) => (
                <th key={q.id} title={q.prompt}>
                  {t('q.questionNumber', { number: i + 1 })}
                  {q.kind === 'open' ? ` (${t('follow.openShort')})` : ''}
                  {q.extra ? ` (${t('follow.extraShort')})` : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.students.map((s) => (
              <tr key={s.id}>
                <td dir="auto">{s.name}</td>
                <td>
                  <GradeCell cell={{ ...s.cell, started: true, waiting: 0, tips: 0 }} />
                </td>
                <td>
                  {data.isExam ? (
                    s.submitted ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={async () => {
                          if (!window.confirm(t('exam.retakeConfirm', { name: s.name }))) return
                          await call('allowRetake', { classId, lessonId, studentId: s.id }).catch(() => {})
                          await reload()
                        }}
                      >
                        {t('exam.allowRetake')}
                      </button>
                    ) : (
                      <span className="muted small-note">{t('exam.notSubmittedYet')}</span>
                    )
                  ) : s.sentBack && !s.sentBack.done ? (
                    <span className="notes-chip">{t(`follow.sentBack.${s.sentBack.mode}`)}</span>
                  ) : (
                    <button type="button" className="link-button" disabled={!Object.keys(s.states).length} onClick={() => setSending(s.id)}>
                      {t('follow.sendBack')}
                    </button>
                  )}
                </td>
                {data.questions.map((q) => (
                  <td key={q.id}>
                    {s.states[q.id]?.result ? (
                      <button type="button" className="cell-button" title={t('follow.changeScore')} onClick={() => setEditing({ sid: s.id, qid: q.id })}>
                        <AnswerMark st={s.states[q.id]} />
                      </button>
                    ) : (
                      <AnswerMark st={s.states[q.id]} />
                    )}
                    {s.earlier[q.id] ? <span className="muted small-note"> {t('follow.corrected')}</span> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="success-row">
              <th colSpan={3}>{t('follow.successRate')}</th>
              {data.questions.map((q) => (
                <td key={q.id}>
                  <SuccessRate states={data.students.map((s) => s.states[q.id]).filter((st): st is AnswerState => !!st?.result)} />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </section>
    </main>
  )
}

// Changing the score of any answer (REQ-5.15, D-59); the lesson grade is recalculated.
function ScoreEditor({ classId, lessonId, student, questionId, number, onDone }: { classId: string; lessonId: string; student: Results['students'][number]; questionId: string; number: number; onDone: () => Promise<void> }) {
  const { t } = useTranslation()
  const st = student.states[questionId]
  const [value, setValue] = useState(st?.score != null ? String(Math.round(st.score * 100)) : '')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  return (
    <section className="card confirm-box score-editor" role="dialog" aria-label={t('follow.changeScore')}>
      <p>
        <strong dir="auto">{student.name}</strong> · {t('q.questionNumber', { number })} · <AnswerMark st={st} />
      </p>
      <ScoreButtons value={value} onChange={setValue} />
      <div className="button-row">
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={async () => {
            const score = readScore(value)
            if (score === null) return setProblem(t('follow.scoreRange'))
            setBusy(true)
            try {
              await call('gradeAnswer', { classId, lessonId, studentId: student.id, questionId, score })
              await onDone()
            } catch {
              setProblem(t('teacher.actionFailed'))
              setBusy(false)
            }
          }}
        >
          {t('follow.saveChange')}
        </button>
        <button type="button" className="button secondary" onClick={() => void onDone()}>
          {t('teacher.cancel')}
        </button>
      </div>
      {problem && <p className="notice">{problem}</p>}
    </section>
  )
}

// Sending a lesson back for review, or chosen questions for corrections (REQ-5.14).
function SendBackForm({ classId, lessonId, student, questions, onDone }: { classId: string; lessonId: string; student: Results['students'][number]; questions: QuestionInfo[]; onDone: () => Promise<void> }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'review' | 'corrections'>('corrections')
  const [mustReturn, setMustReturn] = useState(true)
  const [chosen, setChosen] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const answered = questions.filter((q) => student.states[q.id]?.result)
  const finished = student.cell.kind !== 'notDone'
  return (
    <section className="card list-card-padded give-form" aria-labelledby="sendback-title">
      <h2 id="sendback-title" className="section-title">
        {t('follow.sendBackTitle', { name: student.name })}
      </h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setProblem(null)
          if (mode === 'corrections' && !chosen.length) return setProblem(t('follow.chooseQuestions'))
          if (mode === 'review' && !finished) return setProblem(t('follow.reviewNeedsFinished'))
          setBusy(true)
          try {
            await call('sendBack', { classId, lessonId, studentId: student.id, mode, questionIds: chosen, note, mustReturn })
            await onDone()
          } catch {
            setProblem(t('teacher.actionFailed'))
            setBusy(false)
          }
        }}
      >
        <fieldset>
          <legend>{t('follow.sendBackHow')}</legend>
          <label className="radio-line">
            <input type="radio" name="sb-mode" checked={mode === 'corrections'} onChange={() => setMode('corrections')} />
            {t('follow.forCorrections')}
          </label>
          <label className="radio-line">
            <input type="radio" name="sb-mode" checked={mode === 'review'} onChange={() => setMode('review')} />
            {t('follow.forReview')}
          </label>
          {mode === 'corrections' && (
            <div className="check-list">
              {answered.map((q) => (
                <label key={q.id} className="check-line">
                  <input type="checkbox" checked={chosen.includes(q.id)} onChange={() => setChosen((v) => (v.includes(q.id) ? v.filter((x) => x !== q.id) : [...v, q.id]))} />
                  <span>{t('q.questionNumber', { number: questions.indexOf(q) + 1 })}</span> <AnswerMark st={student.states[q.id]} />
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <fieldset>
          <legend>{t('follow.whenTitle')}</legend>
          <label className="radio-line">
            <input type="radio" name="sb-when" checked={mustReturn} onChange={() => setMustReturn(true)} />
            {t('follow.whenMust')}
          </label>
          <label className="radio-line">
            <input type="radio" name="sb-when" checked={!mustReturn} onChange={() => setMustReturn(false)} />
            {t('follow.whenOwnTime')}
          </label>
        </fieldset>
        <label className="comment-box">
          <span className="feedback-subtitle">{t('follow.noteForStudent')}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} dir="auto" maxLength={5000} />
        </label>
        <p className="muted small-note">{t('follow.sendBackExplain')}</p>
        <div className="button-row">
          <button type="submit" className="button primary" disabled={busy}>
            {t('follow.sendBackNow')}
          </button>
          <button type="button" className="button secondary" onClick={() => void onDone()}>
            {t('teacher.cancel')}
          </button>
        </div>
        {problem && <p className="notice">{problem}</p>}
      </form>
    </section>
  )
}

// The grading page (REQ-5.12, 5.13 written comments): one open answer at a time, with the
// question and grading instructions above it. Sideways = same question, next or previous student
// (following the reading direction); up and down = next or previous question. Alt + arrows too.
export function GradingPage({ classId, lessonId }: { classId: string; lessonId: string }) {
  const { t, i18n } = useTranslation()
  const { data, failed, setData } = useResults(classId, lessonId)
  const [pos, setPos] = useState<{ q: number; s: number } | null>(null)
  const [score, setScore] = useState<string>('')
  const [comment, setComment] = useState('')
  const [markup, setMarkup] = useState('')
  // A recorded comment (REQ-5.13, D-67): a new recording, or removing the saved one.
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [removeAudio, setRemoveAudio] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ good: boolean; text: string } | null>(null)
  const [mustReturn, setMustReturn] = useState(true)
  const rtl = i18n.dir() === 'rtl'

  // Written and recorded answers are graded here (REQ-5.12, 6.6).
  const questions = useMemo(() => (data ? data.questions.filter((q) => q.kind === 'open' || q.kind === 'audio') : []), [data])
  const students = useMemo(() => data?.students || [], [data])
  const answered = useCallback((q: number, s: number) => students[s]?.states[questions[q]?.id]?.result === 'pending', [students, questions])
  const all = useMemo(() => {
    const out: { q: number; s: number }[] = []
    questions.forEach((_, q) => students.forEach((__, s) => answered(q, s) && out.push({ q, s })))
    return out
  }, [questions, students, answered])
  const isGraded = (p: { q: number; s: number }) => !!students[p.s]?.states[questions[p.q].id]?.graded
  const gradedCount = all.filter(isGraded).length

  // Start at the first answer not yet graded.
  useEffect(() => {
    if (pos || !all.length) return
    setPos(all.find((p) => !isGraded(p)) || all[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, pos])

  const current = pos ? students[pos.s]?.states[questions[pos.q]?.id] : undefined
  useEffect(() => {
    setScore(current?.graded && current.score != null ? String(Math.round(current.score * 100)) : '')
    setComment(current?.teacherComment || '')
    setMarkup(current?.markup || '')
    setAudioBlob(null)
    setRemoveAudio(false)
    setMessage(null)
    // Only when moving to another answer, not after saving this one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.q, pos?.s, current === undefined])

  // Is there another answer in that direction?
  const canMove = (dq: number, ds: number) => {
    if (!pos) return false
    for (let q = pos.q + dq, s = pos.s + ds; q >= 0 && q < questions.length && s >= 0 && s < students.length; q += dq, s += ds) if (answered(q, s)) return true
    return false
  }

  // Saving: from "Save the grade", and by itself when moving to another student or question with
  // something changed (Gil, D-68). A comment without a grade is saved too; a grade that isn't a
  // number from 0 to 100 stops the move and says so.
  const latest = useRef({ pos, students, questions, score, comment, markup, audioBlob, removeAudio })
  latest.current = { pos, students, questions, score, comment, markup, audioBlob, removeAudio }
  const persist = useCallback(
    async (onlyIfChanged: boolean): Promise<boolean> => {
      const L = latest.current
      if (!L.pos) return true
      const q = L.questions[L.pos.q]
      const student = L.students[L.pos.s]
      const st = student?.states[q?.id]
      if (!q || !student || !st) return true
      const answer = String(st.attempts?.[0] ?? '')
      const startScore = st.graded && st.score != null ? String(Math.round(st.score * 100)) : ''
      const markupNow = L.markup && hasMarkup(answer, L.markup) ? L.markup : ''
      const changed = L.score !== startScore || L.comment !== (st.teacherComment || '') || markupNow !== (st.markup || '') || !!L.audioBlob || L.removeAudio
      if (onlyIfChanged && !changed) return true
      let score: number | null = null
      if (L.score.trim() !== '') {
        const n = Number(L.score.replace(',', '.'))
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          setMessage({ good: false, text: t('follow.scoreRange') })
          return false
        }
        score = n / 100
      } else if (!onlyIfChanged) {
        setMessage({ good: false, text: t('follow.scoreRange') })
        return false
      }
      setSaving(true)
      try {
        const r = await call<{ state: AnswerState & { score: number; markup?: string } }>('gradeAnswer', {
          classId,
          lessonId,
          studentId: student.id,
          questionId: q.id,
          score,
          comment: L.comment,
          markup: markupNow,
          audioData: L.audioBlob ? await blobToBase64(L.audioBlob) : L.removeAudio ? '' : undefined,
        })
        setData((d) =>
          d && {
            ...d,
            students: d.students.map((s) =>
              s.id === student.id
                ? { ...s, states: { ...s.states, [q.id]: { ...s.states[q.id], graded: !!r.state.graded, score: r.state.score, teacherComment: r.state.teacherComment || null, markup: r.state.markup || null, teacherAudio: (r.state as AnswerState).teacherAudio || null } } }
                : s,
            ),
          },
        )
        setMessage({ good: true, text: t('follow.saved') })
        return true
      } catch {
        setMessage({ good: false, text: t('teacher.actionFailed') })
        return false
      } finally {
        setSaving(false)
      }
    },
    [classId, lessonId, setData, t],
  )

  const move = useCallback(
    async (dq: number, ds: number) => {
      if (!pos) return
      // Unsaved changes are saved first; if they can't be, the page stays on this answer.
      if (!(await persist(true))) return
      // Find the next answered (q, s) in that direction.
      let { q, s } = pos
      for (let i = 0; i < students.length * questions.length; i++) {
        q += dq
        s += ds
        if (q < 0 || q >= questions.length || s < 0 || s >= students.length) return
        if (answered(q, s)) return setPos({ q, s })
      }
    },
    [pos, students.length, questions.length, answered, persist],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.('textarea, input')
      if (typing && !e.altKey) return
      if (e.key === 'ArrowUp') move(-1, 0)
      else if (e.key === 'ArrowDown') move(1, 0)
      else if (e.key === 'ArrowLeft') move(0, rtl ? 1 : -1)
      else if (e.key === 'ArrowRight') move(0, rtl ? -1 : 1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move, rtl])

  if (failed) return <NotYours />
  if (!data) {
    return (
      <main className="page narrow">
        <BackButton to={`/teacher/class/${classId}/lesson/${lessonId}`} />
        <Loading />
      </main>
    )
  }
  if (!pos || !all.length) {
    return (
      <main className="page narrow">
        <BackButton to={`/teacher/class/${classId}/lesson/${lessonId}`} />
        <p className="card message-card">{t('follow.nothingToGrade')}</p>
      </main>
    )
  }

  const q = questions[pos.q]
  const student = students[pos.s]
  const answer = String(current?.attempts?.[0] ?? '')

  async function save() {
    await persist(false)
  }

  // Send this answer back for corrections, with the comment as the note (REQ-5.12, 5.14).
  async function sendBackThis() {
    if (!window.confirm(t('follow.sendBackThisConfirm', { name: student.name }))) return
    setSaving(true)
    try {
      await call('sendBack', { classId, lessonId, studentId: student.id, mode: 'corrections', questionIds: [q.id], note: comment, mustReturn })
      setData((d) => d && { ...d, students: d.students.map((s) => (s.id === student.id ? { ...s, states: Object.fromEntries(Object.entries(s.states).filter(([id]) => id !== q.id)) } : s)) })
      setPos(null)
      setMessage(null)
    } catch {
      setMessage({ good: false, text: t('teacher.actionFailed') })
    } finally {
      setSaving(false)
    }
  }

  const nextUngraded = async () => {
    if (!(await persist(true))) return
    const i = all.findIndex((p) => p.q === pos.q && p.s === pos.s)
    const after = [...all.slice(i + 1), ...all.slice(0, i)].find((p) => !isGraded(p))
    if (after) setPos(after)
  }

  const sideBack = rtl ? '→' : '←'
  const sideNext = rtl ? '←' : '→'
  return (
    <main className="page narrow">
      <BackButton to={`/teacher/class/${classId}/lesson/${lessonId}`} />
      <div className="grading-top">
        <span className="grading-count" aria-live="polite">
          {t('follow.gradedOf', { graded: gradedCount, total: all.length })}
        </span>
        <button type="button" className="button secondary" onClick={nextUngraded} disabled={gradedCount === all.length}>
          {t('follow.nextUngraded')}
        </button>
      </div>
      <section className="card grading-question" lang={data.language} dir={data.language === 'en' ? 'ltr' : 'rtl'}>
        <p className="muted small-note">
          <bdi>{data.title}</bdi> · {t('q.questionNumber', { number: data.questions.findIndex((x) => x.id === q.id) + 1 })}
        </p>
        <Markdown text={q.prompt} />
        {q.gradingInstructions && (
          <div className="grading-instructions">
            <span className="feedback-subtitle">{t('follow.instructions')}</span>
            <Markdown text={q.gradingInstructions} />
          </div>
        )}
      </section>
      <section className="card grading-answer">
        <div className="grading-nav">
          <button type="button" className="button secondary small" onClick={() => move(0, -1)} disabled={!canMove(0, -1)} title={t('follow.prevStudent')}>
            <span aria-hidden="true">{sideBack}</span> {t('follow.prevStudent')}
          </button>
          <strong dir="auto">{student.name}</strong>
          <button type="button" className="button secondary small" onClick={() => move(0, 1)} disabled={!canMove(0, 1)} title={t('follow.nextStudent')}>
            {t('follow.nextStudent')} <span aria-hidden="true">{sideNext}</span>
          </button>
        </div>
        {q.kind === 'audio' ? (
          current?.audioUrl ? <audio key={current.audioUrl} controls src={current.audioUrl} aria-label={t('audio.studentAnswer')} /> : <p className="muted">—</p>
        ) : (
          <div className="student-answer" dir="auto">
            {answer}
          </div>
        )}
        <div className="grading-nav">
          <button type="button" className="button secondary small" onClick={() => move(-1, 0)} disabled={!canMove(-1, 0)}>
            ↑ {t('follow.prevQuestion')}
          </button>
          <button type="button" className="button secondary small" onClick={() => move(1, 0)} disabled={!canMove(1, 0)}>
            ↓ {t('follow.nextQuestion')}
          </button>
        </div>
        <p className="muted small-note">{t('follow.keysHint')}</p>
      </section>
      <section className="card grading-form">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <div className="score-line">
            <span className="feedback-subtitle">{t('follow.grade')}</span>
            {[
              ['full', 100],
              ['half', 50],
              ['zero', 0],
            ].map(([k, v]) => (
              <button key={k} type="button" className={`button secondary small${score === String(v) ? ' chosen' : ''}`} onClick={() => setScore(String(v))}>
                {t(`follow.${k}`)}
              </button>
            ))}
            <label className="score-input">
              <input value={score} onChange={(e) => setScore(e.target.value)} inputMode="decimal" dir="ltr" aria-label={t('follow.scoreLabel')} />
              <span>%</span>
            </label>
          </div>
          <label className="comment-box">
            <span className="feedback-subtitle">{t('follow.comment')}</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} dir="auto" maxLength={5000} />
          </label>
          {q.kind === 'open' && <MarkupBox original={answer} value={markup} onChange={setMarkup} />}
          <div className="markup-box">
            <span className="feedback-subtitle">{t('audio.commentTitle')}</span>
            {current?.teacherAudio && !removeAudio && !audioBlob && (
              <>
                <audio key={current.teacherAudio} controls src={current.teacherAudio} aria-label={t('audio.commentTitle')} />
                <button type="button" className="link-button small-note" onClick={() => setRemoveAudio(true)}>
                  {t('audio.removeComment')}
                </button>
              </>
            )}
            <Recorder key={`${pos.q}-${pos.s}`} onReady={setAudioBlob} />
          </div>
          <div className="button-row">
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? t('follow.saving') : current?.graded ? t('follow.saveChange') : t('follow.save')}
            </button>
            <button type="button" className="button secondary" disabled={saving} onClick={() => void sendBackThis()}>
              {t('follow.sendBackThis')}
            </button>
            <label className="check-line small-note">
              <input type="checkbox" checked={mustReturn} onChange={(e) => setMustReturn(e.target.checked)} />
              {t('follow.whenMustShort')}
            </label>
          </div>
          {message && (
            <p role="status" className={message.good ? 'notice good' : 'notice'}>
              {message.text}
            </p>
          )}
        </form>
      </section>
    </main>
  )
}

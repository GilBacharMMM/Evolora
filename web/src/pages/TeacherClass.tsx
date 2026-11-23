import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../site'
import { BackButton } from '../components/BackButton'
import { ClassTabs } from '../components/ClassTabs'
import { TypeChip } from '../components/TypeChip'
import type { Course, LessonSummary } from '../lesson/types'

interface StudentRow {
  id: string
  name: string
  email: string
  removed: boolean
}

interface AssignmentRow {
  id: string
  kind: 'course' | 'lessons'
  courseId: string | null
  lessonIds: string[]
  everyone: boolean
  studentIds: string[]
  grades?: 'usual' | 'show' | 'hide'
  archived?: boolean
  order?: 'oneByOne' | 'paired' | 'any'
  due?: number | null
  afterDue?: 'reduce' | 'lock'
  reduceBy?: number
  extensions?: Record<string, number>
  createdAt: number
}

interface ClassData {
  name: string
  color: string
  teacherNames: string[]
  code: string
  joiningOpen: boolean
  students: StudentRow[]
  assignments: AssignmentRow[]
  openings: { id: string; lessonId: string; everyone: boolean; studentIds: string[] }[]
}

const call = <T,>(name: string, data: unknown) => httpsCallable<unknown, T>(functions, name)(data).then((r) => r.data)

// The teacher's class page (REQ-5.2, 5.4, 5.7): the class code, joining on or off, the class
// list with removing students, what the class was given, and giving lessons or a course.
// Only the class's own teachers can open it (REQ-3.4).
export function TeacherClass({ classId }: { classId: string }) {
  const { t } = useTranslation()
  const [data, setData] = useState<ClassData | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [courses, setCourses] = useState<Course[]>([])

  const load = useCallback(async () => {
    try {
      const c = await getDoc(doc(db, 'classes', classId))
      if (!c.exists()) throw new Error('not found')
      const [list, given, openings] = await Promise.all([
        getDocs(collection(db, 'classes', classId, 'students')),
        getDocs(collection(db, 'classes', classId, 'assignments')),
        getDocs(collection(db, 'classes', classId, 'openings')),
      ])
      const d = c.data()
      setData({
        name: d.name,
        color: d.color || '#0E6B73',
        teacherNames: d.teacherNames || [],
        code: d.code || '',
        joiningOpen: d.joiningOpen !== false,
        students: list.docs
          .map((s) => ({ id: s.id, name: s.data().name || '', email: s.data().email || '', removed: s.data().removed === true }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        assignments: given.docs
          .map((a) => ({ id: a.id, ...(a.data() as Omit<AssignmentRow, 'id' | 'createdAt'>), createdAt: a.data().createdAt?.toMillis?.() ?? 0 }))
          .sort((a, b) => a.createdAt - b.createdAt),
        openings: openings.docs.map((o) => ({ id: o.id, lessonId: o.data().lessonId, everyone: o.data().everyone === true, studentIds: o.data().studentIds || [] })),
      })
    } catch {
      setBlocked(true)
    }
  }, [classId])

  useEffect(() => {
    void load()
    Promise.all([getDocs(collection(db, 'lessons')), getDocs(collection(db, 'courses'))])
      .then(([l, c]) => {
        setLessons(l.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LessonSummary, 'id'>) })).sort((a, b) => a.title.localeCompare(b.title)))
        setCourses(c.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Course, 'id'>) })))
      })
      .catch(() => {})
  }, [load])

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
        <BackButton />
        <p className="loading">{t('common.loading')}</p>
      </main>
    )
  }

  const current = data.students.filter((s) => !s.removed)
  const removed = data.students.filter((s) => s.removed)
  const titleOfLesson = (id: string) => lessons.find((l) => l.id === id)?.title || id
  const nameOf = (id: string) => data.students.find((s) => s.id === id)?.name || id

  return (
    <main className="page narrow">
      <BackButton />
      <ClassTabs classId={classId} name={data.name} color={data.color} active="manage" />
      <section className="card">
        <CodeBox classId={classId} code={data.code} joiningOpen={data.joiningOpen} onChange={load} />
      </section>

      <section className="card list-card-padded" aria-labelledby="students-title">
        <h2 id="students-title" className="section-title">
          {t('teacher.students')} ({current.length})
        </h2>
        {current.length === 0 && <p className="muted">{t('teacher.noStudents')}</p>}
        <ol className="student-list">
          {current.map((s) => (
            <StudentLine key={s.id} classId={classId} student={s} onRemoved={load} />
          ))}
        </ol>
        {removed.length > 0 && (
          <details className="removed-students">
            <summary>
              {t('teacher.removedStudents')} ({removed.length})
            </summary>
            <p className="muted">{t('teacher.removedExplain')}</p>
            <ul>
              {removed.map((s) => (
                <li key={s.id} dir="auto">
                  {s.name} <span className="muted" dir="ltr">{s.email}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="card list-card-padded" aria-labelledby="given-title">
        <h2 id="given-title" className="section-title">
          {t('teacher.given')}
        </h2>
        {data.assignments.length === 0 && <p className="muted">{t('teacher.nothingGiven')}</p>}
        <ul className="given-list">
          {data.assignments.map((a) => {
            const course = a.courseId ? courses.find((c) => c.id === a.courseId) : null
            return (
              <li key={a.id}>
                <span className="course-chip">{a.kind === 'course' ? t('teacher.courseLabel') : t('teacher.lessonsLabel', { count: a.lessonIds.length })}</span>
                <span className="given-title" dir="auto">
                  {a.kind === 'course' ? course?.title || a.courseId : a.lessonIds.map(titleOfLesson).join(' · ')}
                </span>
                <span className="muted given-to">
                  {t(`teacher.orderShort.${a.order || (a.kind === 'course' ? 'oneByOne' : 'any')}`)} · {t(`teacher.gradesShort.${a.grades || 'usual'}`)} ·{' '}
                  {a.everyone ? t('teacher.toEveryone') : t('teacher.toSome', { count: a.studentIds.length, names: a.studentIds.map(nameOf).join(', ') })}
                </span>
                <DueLine classId={classId} assignment={a} students={current} nameOf={nameOf} onChanged={load} />
                {a.kind === 'course' && a.courseId && (
                  <button
                    type="button"
                    className="link-button small-note"
                    onClick={async () => {
                      if (!a.archived && !window.confirm(t('teacher.archiveConfirm'))) return
                      await call('archiveCourse', { classId, courseId: a.courseId, archived: !a.archived }).catch(() => {})
                      await load()
                    }}
                  >
                    {a.archived ? t('teacher.unarchive') : t('teacher.archive')}
                  </button>
                )}
                {a.archived && <span className="badge badge-cleared">{t('teacher.archivedBadge')}</span>}
              </li>
            )
          })}
        </ul>
      </section>

      <Teachers classId={classId} names={data.teacherNames} onAdded={load} />
      <GiveForm classId={classId} students={current} lessons={lessons} courses={courses} onGiven={load} />
      <OpenEarlyForm
        classId={classId}
        students={current}
        courses={courses.filter((c) => data.assignments.some((a) => a.kind === 'course' && a.courseId === c.id))}
        openings={data.openings}
        nameOf={nameOf}
        onOpened={load}
      />
    </main>
  )
}

// The class code with Copy, Make a new code, and joining on or off (REQ-5.2).
function CodeBox({ classId, code, joiningOpen, onChange }: { classId: string; code: string; joiningOpen: boolean; onChange: () => Promise<void> }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function run(name: string, payload: unknown) {
    setBusy(true)
    setFailed(false)
    try {
      await call(name, payload)
      await onChange()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <div className="code-box">
      <div className="code-line">
        <span className="code-label">{t('teacher.code')}</span>
        <span className={`class-code${joiningOpen ? '' : ' closed'}`} dir="ltr">
          {code || '—'}
        </span>
        <button
          type="button"
          className="button secondary"
          disabled={!code}
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2500)
            })
          }}
        >
          {copied ? t('teacher.copied') : t('teacher.copy')}
        </button>
        {!confirming && (
          <button type="button" className="button secondary" disabled={busy} onClick={() => setConfirming(true)}>
            {t('teacher.newCode')}
          </button>
        )}
      </div>
      {confirming && (
        <div className="confirm-box" role="alertdialog" aria-label={t('teacher.newCode')}>
          <p>{t('teacher.newCodeConfirm')}</p>
          <div className="button-row">
            <button type="button" className="button primary" disabled={busy} onClick={() => void run('newClassCode', { classId })}>
              {t('teacher.yesNewCode')}
            </button>
            <button type="button" className="button secondary" onClick={() => setConfirming(false)}>
              {t('teacher.cancel')}
            </button>
          </div>
        </div>
      )}
      <div className="joining-line">
        <span className={`status-word ${joiningOpen ? 'status-done' : 'status-locked'}`}>
          {joiningOpen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" stroke="none" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          )}
          <span>{joiningOpen ? t('teacher.joiningOpen') : t('teacher.joiningClosed')}</span>
        </span>
        <button type="button" className="button secondary" disabled={busy} onClick={() => void run('setJoining', { classId, open: !joiningOpen })}>
          {joiningOpen ? t('teacher.turnOff') : t('teacher.turnOn')}
        </button>
      </div>
      {failed && <p className="notice" role="alert">{t('teacher.actionFailed')}</p>}
    </div>
  )
}

function StudentLine({ classId, student, onRemoved }: { classId: string; student: StudentRow; onRemoved: () => Promise<void> }) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <li className="student-line">
      <span className="student-who">
        <span className="student-name" dir="auto">
          {student.name}
        </span>
        <span className="muted student-email" dir="ltr">
          {student.email}
        </span>
      </span>
      {!confirming ? (
        <button type="button" className="button secondary small" onClick={() => setConfirming(true)}>
          {t('teacher.remove')}
        </button>
      ) : (
        <div className="confirm-box" role="alertdialog" aria-label={t('teacher.remove')}>
          <p>{t('teacher.removeConfirm', { name: student.name })}</p>
          <div className="button-row">
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setFailed(false)
                try {
                  await call('removeStudent', { classId, studentId: student.id })
                  await onRemoved()
                } catch {
                  setFailed(true)
                  setBusy(false)
                }
              }}
            >
              {t('teacher.yesRemove')}
            </button>
            <button type="button" className="button secondary" onClick={() => setConfirming(false)}>
              {t('teacher.cancel')}
            </button>
          </div>
          {failed && <p className="notice" role="alert">{t('teacher.actionFailed')}</p>}
        </div>
      )}
    </li>
  )
}

// Giving a course or lessons, to the whole class or to chosen students (REQ-5.7).
function GiveForm({ classId, students, lessons, courses, onGiven }: { classId: string; students: StudentRow[]; lessons: LessonSummary[]; courses: Course[]; onGiven: () => Promise<void> }) {
  const { t } = useTranslation()
  const [what, setWhat] = useState<'course' | 'lessons'>('course')
  const [courseId, setCourseId] = useState('')
  const [lessonIds, setLessonIds] = useState<string[]>([])
  const [to, setTo] = useState<'everyone' | 'some'>('everyone')
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [grades, setGrades] = useState<'usual' | 'show' | 'hide'>('usual')
  const [redoCounts, setRedoCounts] = useState(false)
  const [examStart, setExamStart] = useState('')
  const [examEnd, setExamEnd] = useState('')
  const [examTimer, setExamTimer] = useState(true)
  const [examLock, setExamLock] = useState<'none' | 'class' | 'all'>('none')
  const [order, setOrder] = useState<'oneByOne' | 'paired' | 'any'>('paired')
  const [due, setDue] = useState('')
  const [afterDue, setAfterDue] = useState<'reduce' | 'lock'>('reduce')
  const [reduceBy, setReduceBy] = useState('10')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ good: boolean; text: string } | null>(null)

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  // Exam settings show when an exam is among what is given (REQ-5.23).
  const chosenLessons = what === 'course' ? courses.find((c) => c.id === courseId)?.items.flatMap((it) => [it, ...it.practice]).map((l) => l.lessonId) || [] : lessonIds
  const hasExam = chosenLessons.some((id) => lessons.find((l) => l.id === id)?.type === 'exam')

  async function give() {
    setMessage(null)
    const points = Number(reduceBy)
    if (due && afterDue === 'reduce' && (!Number.isInteger(points) || points < 0 || points > 100)) return setMessage({ good: false, text: t('teacher.pointsRange') })
    if (what === 'course' && !courseId) return setMessage({ good: false, text: t('teacher.needCourse') })
    if (what === 'lessons' && lessonIds.length === 0) return setMessage({ good: false, text: t('teacher.needLessons') })
    if (to === 'some' && studentIds.length === 0) return setMessage({ good: false, text: t('teacher.needStudents') })
    if ((examStart || examEnd) && !(examStart && examEnd && new Date(examEnd) > new Date(examStart))) return setMessage({ good: false, text: t('exam.windowProblem') })
    setBusy(true)
    try {
      await call('assign', {
        classId,
        ...(what === 'course' ? { courseId } : { lessonIds }),
        studentIds: to === 'everyone' ? null : studentIds,
        grades,
        redoCounts,
        examStart: examStart && examEnd ? new Date(examStart).getTime() : null,
        examEnd: examStart && examEnd ? new Date(examEnd).getTime() : null,
        examTimer,
        examLock,
        order,
        due: due ? new Date(due).getTime() : null,
        afterDue,
        reduceBy: due && afterDue === 'reduce' ? points : 0,
      })
      setMessage({ good: true, text: t('teacher.givenDone') })
      setDue('')
      setCourseId('')
      setLessonIds([])
      setStudentIds([])
      await onGiven()
    } catch {
      setMessage({ good: false, text: t('teacher.actionFailed') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card list-card-padded give-form" aria-labelledby="give-title">
      <h2 id="give-title" className="section-title">
        {t('teacher.give')}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void give()
        }}
      >
        <fieldset>
          <legend>{t('teacher.giveWhat')}</legend>
          <label className="radio-line">
            <input type="radio" name="what" checked={what === 'course'} onChange={() => setWhat('course')} />
            {t('teacher.aCourse')}
          </label>
          <label className="radio-line">
            <input type="radio" name="what" checked={what === 'lessons'} onChange={() => setWhat('lessons')} />
            {t('teacher.someLessons')}
          </label>
          {what === 'course' ? (
            <label className="select-line">
              <span className="visually-hidden">{t('teacher.chooseCourse')}</span>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">{t('teacher.chooseCourse')}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="check-list">
              {lessons.map((l) => (
                <label key={l.id} className="check-line">
                  <input type="checkbox" checked={lessonIds.includes(l.id)} onChange={() => setLessonIds((v) => toggle(v, l.id))} />
                  <TypeChip type={l.type} />
                  <span dir="auto">{l.title}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <fieldset>
          <legend>{t('teacher.giveTo')}</legend>
          <label className="radio-line">
            <input type="radio" name="to" checked={to === 'everyone'} onChange={() => setTo('everyone')} />
            {t('teacher.wholeClass')}
          </label>
          <label className="radio-line">
            <input type="radio" name="to" checked={to === 'some'} onChange={() => setTo('some')} disabled={students.length === 0} />
            {t('teacher.chosenStudents')}
          </label>
          {to === 'some' && (
            <div className="check-list">
              {students.map((s) => (
                <label key={s.id} className="check-line">
                  <input type="checkbox" checked={studentIds.includes(s.id)} onChange={() => setStudentIds((v) => toggle(v, s.id))} />
                  <span dir="auto">{s.name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <fieldset>
          <legend>{t('teacher.orderTitle')}</legend>
          {(['paired', 'oneByOne', 'any'] as const).map((o) => (
            <label key={o} className="radio-line">
              <input type="radio" name="order" checked={order === o} onChange={() => setOrder(o)} />
              {t(`teacher.order.${o}`)}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>{t('teacher.dueTitle')}</legend>
          <label className="select-line">
            <span>{t('teacher.dueDate')} </span>
            <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="date-input" />
          </label>
          {due && (
            <>
              <label className="radio-line">
                <input type="radio" name="after" checked={afterDue === 'reduce'} onChange={() => setAfterDue('reduce')} />
                {t('teacher.afterReduce')}
                <input className="points-input" value={reduceBy} onChange={(e) => setReduceBy(e.target.value)} inputMode="numeric" dir="ltr" aria-label={t('teacher.points')} />
                {t('teacher.points')}
              </label>
              <label className="radio-line">
                <input type="radio" name="after" checked={afterDue === 'lock'} onChange={() => setAfterDue('lock')} />
                {t('teacher.afterLock')}
              </label>
            </>
          )}
        </fieldset>
        {hasExam && (
          <fieldset>
            <legend>{t('exam.settings')}</legend>
            <p className="muted small-note">{t('exam.settingsExplain')}</p>
            <label className="select-line">
              <span>{t('exam.start')} </span>
              <input type="datetime-local" className="date-input" value={examStart} onChange={(e) => setExamStart(e.target.value)} />
            </label>
            <label className="select-line">
              <span>{t('exam.end')} </span>
              <input type="datetime-local" className="date-input" value={examEnd} onChange={(e) => setExamEnd(e.target.value)} />
            </label>
            <label className="check-line">
              <input type="checkbox" checked={examTimer} onChange={(e) => setExamTimer(e.target.checked)} />
              {t('exam.timer')}
            </label>
            {(['none', 'class', 'all'] as const).map((k) => (
              <label key={k} className="radio-line">
                <input type="radio" name="exam-lock" checked={examLock === k} onChange={() => setExamLock(k)} />
                {t(`exam.lock.${k}`)}
              </label>
            ))}
          </fieldset>
        )}
        <label className="check-line">
          <input type="checkbox" checked={redoCounts} onChange={(e) => setRedoCounts(e.target.checked)} />
          {t('teacher.redoCounts')}
        </label>
        <fieldset>
          <legend>{t('teacher.gradesTitle')}</legend>
          {(['usual', 'show', 'hide'] as const).map((g) => (
            <label key={g} className="radio-line">
              <input type="radio" name="grades" checked={grades === g} onChange={() => setGrades(g)} />
              {t(`teacher.grades.${g}`)}
            </label>
          ))}
        </fieldset>
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? t('teacher.giving') : t('teacher.giveButton')}
        </button>
        {message && (
          <p role="status" className={message.good ? 'notice good' : 'notice'}>
            {message.text}
          </p>
        )}
      </form>
    </section>
  )
}

// Opening a lesson of a course early, for the whole class or chosen students (REQ-5.20). It is
// then open for them whatever comes before it (D-55).
function OpenEarlyForm({
  classId,
  students,
  courses,
  openings,
  nameOf,
  onOpened,
}: {
  classId: string
  students: StudentRow[]
  courses: Course[]
  openings: ClassData['openings']
  nameOf: (id: string) => string
  onOpened: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [lessonId, setLessonId] = useState('')
  const [to, setTo] = useState<'everyone' | 'some'>('some')
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ good: boolean; text: string } | null>(null)
  const lessonsInCourses = courses.flatMap((c) => c.items.flatMap((it) => [it, ...it.practice]).map((l) => ({ ...l, course: c.title })))
  const titleOf = (id: string) => lessonsInCourses.find((l) => l.lessonId === id)?.title || id
  if (lessonsInCourses.length === 0) return null

  async function open() {
    setMessage(null)
    if (!lessonId) return setMessage({ good: false, text: t('teacher.needLesson') })
    if (to === 'some' && studentIds.length === 0) return setMessage({ good: false, text: t('teacher.needStudents') })
    setBusy(true)
    try {
      await call('openEarly', { classId, lessonId, studentIds: to === 'everyone' ? null : studentIds })
      setMessage({ good: true, text: t('teacher.openedDone') })
      setLessonId('')
      setStudentIds([])
      await onOpened()
    } catch {
      setMessage({ good: false, text: t('teacher.actionFailed') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card list-card-padded give-form" aria-labelledby="early-title">
      <h2 id="early-title" className="section-title">
        {t('teacher.openEarly')}
      </h2>
      <p className="muted">{t('teacher.openEarlyExplain')}</p>
      {openings.length > 0 && (
        <ul className="given-list">
          {openings.map((o) => (
            <li key={o.id}>
              <span className="given-title" dir="auto">
                {titleOf(o.lessonId)}
              </span>
              <span className="muted given-to">
                {o.everyone ? t('teacher.toEveryone') : t('teacher.toSome', { count: o.studentIds.length, names: o.studentIds.map(nameOf).join(', ') })}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void open()
        }}
      >
        <label className="select-line">
          <span className="visually-hidden">{t('teacher.chooseLesson')}</span>
          <select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
            <option value="">{t('teacher.chooseLesson')}</option>
            {lessonsInCourses.map((l) => (
              <option key={l.lessonId} value={l.lessonId}>
                {l.title} ({l.course})
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>{t('teacher.giveTo')}</legend>
          <label className="radio-line">
            <input type="radio" name="early-to" checked={to === 'some'} onChange={() => setTo('some')} />
            {t('teacher.chosenStudents')}
          </label>
          <label className="radio-line">
            <input type="radio" name="early-to" checked={to === 'everyone'} onChange={() => setTo('everyone')} />
            {t('teacher.wholeClassNow')}
          </label>
          {to === 'some' && (
            <div className="check-list">
              {students.map((s) => (
                <label key={s.id} className="check-line">
                  <input type="checkbox" checked={studentIds.includes(s.id)} onChange={() => setStudentIds((v) => (v.includes(s.id) ? v.filter((x) => x !== s.id) : [...v, s.id]))} />
                  <span dir="auto">{s.name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? t('teacher.giving') : t('teacher.openButton')}
        </button>
        {message && (
          <p role="status" className={message.good ? 'notice good' : 'notice'}>
            {message.text}
          </p>
        )}
      </form>
    </section>
  )
}

// An assignment's due date, with changing it for the whole class or extending it for one student
// (REQ-5.9). A later date opens a locked lesson again.
function toLocalInput(ms: number | null | undefined): string {
  if (!ms) return ''
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function DueLine({ classId, assignment, students, nameOf, onChanged }: { classId: string; assignment: AssignmentRow; students: StudentRow[]; nameOf: (id: string) => string; onChanged: () => Promise<void> }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState('')
  const [value, setValue] = useState(toLocalInput(assignment.due))
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const show = (ms: number) => new Date(ms).toLocaleString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const extensions = Object.entries(assignment.extensions || {})
  return (
    <span className="due-line">
      <span className="muted small-note">
        {assignment.due
          ? `${t('teacher.dueOn', { date: show(assignment.due) })} · ${assignment.afterDue === 'lock' ? t('teacher.afterLockShort') : t('teacher.afterReduceShort', { n: assignment.reduceBy ?? 0 })}`
          : t('teacher.noDue')}
        {extensions.map(([uid, ms]) => ` · ${t('teacher.extended', { name: nameOf(uid), date: show(ms) })}`)}
      </span>
      {!open ? (
        <button type="button" className="link-button small-note" onClick={() => setOpen(true)}>
          {t('teacher.changeDue')}
        </button>
      ) : (
        <span className="due-form">
          <select value={who} onChange={(e) => setWho(e.target.value)} aria-label={t('teacher.giveTo')}>
            <option value="">{t('teacher.wholeClassNow')}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input type="datetime-local" className="date-input" value={value} onChange={(e) => setValue(e.target.value)} aria-label={t('teacher.dueDate')} />
          <button
            type="button"
            className="button primary small"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setFailed(false)
              try {
                await call('setDue', { classId, assignmentId: assignment.id, due: value ? new Date(value).getTime() : null, studentId: who || null })
                setOpen(false)
                await onChanged()
              } catch {
                setFailed(true)
              } finally {
                setBusy(false)
              }
            }}
          >
            {t('follow.save')}
          </button>
          <button type="button" className="button secondary small" onClick={() => setOpen(false)}>
            {t('teacher.cancel')}
          </button>
          {failed && <span className="notice">{t('teacher.actionFailed')}</span>}
        </span>
      )}
    </span>
  )
}

// The class's teachers, and adding a co-teacher by email (REQ-5.5).
function Teachers({ classId, names, onAdded }: { classId: string; names: string[]; onAdded: () => Promise<void> }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ good: boolean; text: string } | null>(null)
  return (
    <section className="card list-card-padded" aria-labelledby="teachers-title">
      <h2 id="teachers-title" className="section-title">
        {t('teacher.teachersTitle')}
      </h2>
      <ul className="given-list">
        {names.map((n) => (
          <li key={n} dir="auto">
            {n}
          </li>
        ))}
      </ul>
      <form
        className="join-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!email.trim()) return
          setBusy(true)
          setMessage(null)
          try {
            const r = await call<{ result: 'added' | 'already' | 'notTeacher' | 'notSignedIn'; name?: string }>('addTeacher', { classId, email })
            setMessage({ good: r.result === 'added' || r.result === 'already', text: t(`teacher.addTeacherResult.${r.result}`, { name: r.name || email }) })
            if (r.result === 'added') {
              setEmail('')
              await onAdded()
            }
          } catch {
            setMessage({ good: false, text: t('teacher.actionFailed') })
          } finally {
            setBusy(false)
          }
        }}
      >
        <label>
          <span className="visually-hidden">{t('teacher.teacherEmail')}</span>
          <input className="name-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('teacher.teacherEmail')} dir="ltr" />
        </label>
        <button type="submit" className="button primary" disabled={busy || !email.trim()}>
          {t('teacher.addTeacher')}
        </button>
      </form>
      {message && (
        <p role="status" className={message.good ? 'notice good' : 'notice'}>
          {message.text}
        </p>
      )}
    </section>
  )
}

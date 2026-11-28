import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { BlanksQuestion } from '../components/BlanksQuestion'
import { useClassLanguage } from '../i18n'
import { requiredLanguage } from '../classwork'
import { useTranslation } from 'react-i18next'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../site'
import { lessonAccess, loadClasswork } from '../classwork'
import { useSession } from '../session'
import { navigate } from '../router'
import { BlockView, QuestionImage, Ui } from '../lesson/Blocks'
import { Markdown } from '../lesson/Rich'
import { MarkedAnswer } from '../components/MarkedAnswer'
import { ExamPlayer } from './ExamPlayer'
import { DragQuestion } from '../components/DragQuestion'
import { Recorder, StoredAudio, uploadRecording } from '../components/Recorder'
import { QuestionCard } from '../lesson/QuestionCard'
import { isFinished, type QuestionState } from '../lesson/answers'
import type { Block, LessonVersion, Question } from '../lesson/types'
import { TypeChip } from '../components/TypeChip'
import { useLessonTime } from '../lessonTime'
import { BackButton } from '../components/BackButton'
import { RemovalControls, useRemovals } from '../components/RemovalControls'
import { CommentTool } from '../components/CommentTool'

// What the teacher did with an answer (REQ-5.12, 5.13, 5.15) and, when the student may see
// grades (REQ-5.22, D-59), the question's marks.
type Graded = QuestionState & { graded?: boolean; changedByTeacher?: boolean; teacherComment?: string | null; markup?: string | null; teacherAudio?: string | null; audioUrl?: string | null }

// An open or audio answer sent back for corrections (REQ-5.14, D-77): the student sees their last
// answer with the teacher's marks and comment, which can't be edited, and then writes a new one.
function PreviousAnswer({ state }: { state: Graded }) {
  const { t } = useTranslation()
  const answer = String(state.attempts?.[state.attempts.length - 1] ?? '')
  return (
    <div className="previous-answer" role="note">
      <span className="teacher-note-title">
        <Ui>{t('lesson.lastAnswer')}</Ui>
      </span>
      {state.audioUrl ? (
        <audio controls src={state.audioUrl} aria-label={t('lesson.lastAnswer')} />
      ) : state.markup ? (
        <MarkedAnswer original={answer} markup={state.markup} />
      ) : (
        <div className="marked-answer" dir="auto">
          {answer}
        </div>
      )}
      {state.teacherAudio && <audio controls src={state.teacherAudio} aria-label={t('audio.teacherComment')} />}
      {state.teacherComment && (
        <>
          <span className="teacher-note-title">
            <Ui>{t('lesson.teacherComment')}</Ui>
          </span>
          <p dir="auto">{state.teacherComment}</p>
        </>
      )}
      <p className="previous-answer-next">
        <Ui>{t('lesson.writeNewAnswer')}</Ui>
      </p>
    </div>
  )
}

function TeacherNote({ state, showGrades }: { state: Graded | undefined; showGrades: boolean }) {
  const { t } = useTranslation()
  if (!state?.result) return null
  const marked = state.result !== 'pending' || state.graded
  const marks = showGrades && marked && state.score != null ? Math.round(state.score * 100) : null
  if (marks === null && !state.teacherComment && !state.markup && !state.teacherAudio) return null
  return (
    <div className="teacher-note" role="note">
      {marks !== null && (
        <span className="teacher-note-title">
          <Ui>
            {t('lesson.marks', { percent: marks })}
            {state.changedByTeacher ? ` · ${t('lesson.changedByTeacher')}` : ''}
          </Ui>
        </span>
      )}
      {state.graded && state.markup && (
        <>
          <span className="teacher-note-title">
            <Ui>{t('markup.studentTitle')}</Ui>
          </span>
          <MarkedAnswer original={String(state.attempts?.[0] ?? '')} markup={state.markup} />
        </>
      )}
      {state.graded && state.teacherAudio && (
        <>
          <span className="teacher-note-title">
            <Ui>{t('audio.teacherComment')}</Ui>
          </span>
          <audio controls src={state.teacherAudio} aria-label={t('audio.teacherComment')} />
        </>
      )}
      {state.teacherComment && (
        <>
          <span className="teacher-note-title">
            <Ui>{t('lesson.teacherComment')}</Ui>
          </span>
          <p dir="auto">{state.teacherComment}</p>
        </>
      )}
    </div>
  )
}

type Item ={ kind: 'topic'; number: number; name: string } | { kind: 'block'; block: Block; key: string; topic: number }

interface Progress {
  version?: number
  questions?: Record<string, QuestionState>
  // Earlier answers, kept when questions are sent back for corrections (REQ-5.14)
  history?: Record<string, Graded[]>
  topics?: Record<string, { correct: number; flagged?: boolean }>
  grade?: { percent: number | null; pending: boolean; points: number; outOf: number }
  finished?: boolean
  sentBack?: { mode: 'review' | 'corrections'; questionIds: string[]; note: string | null; done: boolean }
  // Redo (REQ-6.5)
  redo?: { active: boolean; counts: boolean; n: number }
  // Exams (REQ-4.26)
  examAnswers?: Record<string, unknown>
  submitted?: boolean
  redos?: { grade: Progress['grade'] }[]
  keptGrade?: Progress['grade'] | null
}

// The lesson player (REQ-6.2, 4.5, 4.21, system-design 2.3). The student sees the lesson up to
// the next question; the rest appears once the question is finished. Answers are checked by the
// checking service, and the student's work is saved there, so they return to the same place.
export function LessonPlayer({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation()
  const { user, role, classIds } = useSession()
  // Teachers try the lesson (REQ-5.32): checked as for a student, nothing saved.
  const trying = role !== 'student'
  // A teacher sees the whole lesson at once, or chooses to see it step by step as a student (D-90).
  const [asStudent, setAsStudent] = useState(false)
  const whole = trying && !asStudent
  // Questions above the student's level are left out, without saying so (REQ-6.10).
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [minimumOverride, setMinimumOverride] = useState<number | null>(null)
  // Each topic's minimum, lowered for the class when the teacher removed questions (REQ-5.36).
  const [minimumByTopic, setMinimumByTopic] = useState<Record<string, number> | null>(null)
  // Questions the teacher removed are among the hidden ones (REQ-5.36), so an exam waits for this.
  const [viewReady, setViewReady] = useState(trying)
  useEffect(() => {
    if (trying || !user) return
    let live = true
    httpsCallable<{ lessonId: string }, { hidden: string[]; minimum?: number; minimumByTopic?: Record<string, number> }>(functions, 'lessonView')({ lessonId })
      .then((r) => {
        if (!live) return
        setHidden(new Set(r.data.hidden))
        // The teacher may change the lesson's minimum questions per topic (REQ-4.21, 5.9).
        if (typeof r.data.minimum === 'number') setMinimumOverride(r.data.minimum)
        if (r.data.minimumByTopic) setMinimumByTopic(r.data.minimumByTopic)
        setViewReady(true)
      })
      .catch(() => live && setViewReady(true))
    return () => {
      live = false
    }
  }, [trying, user, lessonId])
  // A student opens only lessons given to them that aren't locked (REQ-5.7, 6.12, D-55, D-57).
  const [gate, setGate] = useState<'checking' | 'open' | 'locked' | 'lockedByNotes' | 'lockedByDue' | 'lockedByExam' | 'notGiven'>(role === 'student' ? 'checking' : 'open')
  // Teachers always see grades; students only when the assignment shows them (REQ-5.22).
  const [showGrades, setShowGrades] = useState(role !== 'student')
  const [examInfo, setExamInfo] = useState<{ end: number | null; timer: boolean } | null>(null)
  // A lesson given by a class that requires its language is shown in that language (REQ-9.5).
  const [classLanguage, setClassLanguage] = useState<'he' | 'ar' | 'en' | null>(null)
  useClassLanguage(classLanguage)
  useEffect(() => {
    if (role !== 'student' || !user) return
    let live = true
    loadClasswork(user.uid, classIds)
      .then((c) => {
        if (!live) return
        const a = lessonAccess(c, lessonId)
        setClassLanguage(requiredLanguage(c, { lessonId }))
        setShowGrades(a.showGrades)
        if (a.exam) setExamInfo({ end: a.exam.end && Date.now() < a.exam.end ? a.exam.end : null, timer: a.exam.timer })
        setGate(a.access === 'locked' && a.lockedByExam ? 'lockedByExam' : a.access === 'locked' && a.lockedByDue ? 'lockedByDue' : a.access === 'locked' && a.lockedByNotes ? 'lockedByNotes' : a.access)
      })
      .catch(() => live && setGate('open'))
    return () => {
      live = false
    }
  }, [role, user, classIds, lessonId])
  const [currentVersion, setCurrentVersion] = useState<number | null>(null)
  const [lessonMinimum, setMinimum] = useState(0)
  const minimum = minimumOverride ?? lessonMinimum
  // A teacher who opened the lesson from a class's courses tab can remove questions for that class (REQ-5.35, 5.36).
  const removalClass = trying ? new URLSearchParams(location.search).get('class') : null
  const removal = useRemovals(removalClass, lessonId)
  const removedQuestions = useMemo(() => new Set(removal.info?.questions || []), [removal.info])
  // The minimum of a topic: for a student, as the checking service says; for a teacher looking at
  // a class, the class's; otherwise the lesson's.
  const minimumFor = (topicNumber: number | undefined) =>
    topicNumber === undefined ? minimum : (removal.info?.minimumByTopic?.[topicNumber] ?? minimumByTopic?.[topicNumber] ?? minimum)
  const [lesson, setLesson] = useState<LessonVersion | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [local, setLocal] = useState<Record<string, QuestionState>>({})
  const [problem, setProblem] = useState<'notFound' | 'notAllowed' | null>(null)
  const scrolled = useRef(false)
  // The lesson on the page, where teachers mark words to comment on (REQ-4.27).
  const articleRef = useRef<HTMLElement>(null)

  // Lesson details, and the student's saved work (live)
  useEffect(() => {
    let live = true
    getDoc(doc(db, 'lessons', lessonId))
      .then((s) => {
        if (!live) return
        if (!s.exists()) return setProblem('notFound')
        setCurrentVersion(s.data().currentVersion)
        setMinimum(s.data().minimumPerTopic || 0)
      })
      .catch(() => live && setProblem('notAllowed'))
    if (trying) setProgress({})
    const unsub = user && !trying
      ? onSnapshot(
          doc(db, 'progress', `${user.uid}__${lessonId}`),
          (s) => live && setProgress(s.exists() ? (s.data() as Progress) : {}),
          () => live && setProgress({}),
        )
      : () => {}
    return () => {
      live = false
      unsub()
    }
  }, [lessonId, user, trying])

  // The version the student started stays theirs (REQ-4.7).
  const versionNumber = progress === null || currentVersion === null ? null : progress.version || currentVersion
  useEffect(() => {
    if (versionNumber === null) return
    let live = true
    getDoc(doc(db, 'lessons', lessonId, 'versions', String(versionNumber)))
      .then((v) => {
        if (!live) return
        if (!v.exists()) return setProblem('notFound')
        setLesson(v.data() as LessonVersion)
      })
      .catch(() => live && setProblem('notAllowed'))
    return () => {
      live = false
    }
  }, [lessonId, versionNumber])

  const states = useMemo(() => ({ ...(progress?.questions || {}), ...local }), [progress, local])
  // The grade that counts (REQ-6.5): kept from before a redo, or the latest.
  const countingGrade = progress?.keptGrade || (progress?.redo?.active ? progress.redos?.[progress.redos.length - 1]?.grade : null) || progress?.grade
  // While trying, right answers per topic are counted here, as the checking service does for students.
  const tryCorrect = useMemo(() => {
    const out: Record<number, number> = {}
    if (!trying || !lesson) return out
    const right = (r?: string | null) => r === 'correct1' || r === 'correct2' || r === 'correct3'
    for (const topic of lesson.topics) for (const b of topic.blocks) if (b.type === 'question') out[topic.number] = (out[topic.number] || 0) + (right(states[b.id]?.result) ? 1 : 0) + (right(states[b.id]?.checkAgain?.result) ? 1 : 0)
    return out
  }, [trying, lesson, states])
  const topicCorrect = (n: number) => (trying ? tryCorrect[n] ?? 0 : progress?.topics?.[n]?.correct ?? 0)

  const items = useMemo<Item[]>(() => {
    if (!lesson) return []
    const out: Item[] = []
    for (const topic of lesson.topics) {
      if (topic.name) out.push({ kind: 'topic', number: topic.number, name: topic.name })
      topic.blocks.forEach((block, i) => out.push({ kind: 'block', block, key: `${topic.number}-${i}`, topic: topic.number }))
    }
    return out
  }, [lesson])

  // Extra practice questions are asked only until the topic's minimum is reached (REQ-4.21).
  // In the whole lesson, the teacher sees every question (D-90).
  const skipped = (it: Item) =>
    !whole &&
    ((it.kind === 'block' && it.block.type === 'question' && hidden.has(it.block.id)) ||
    // A teacher seeing the lesson as the class's students do doesn't see questions removed for the class (REQ-5.36).
    (it.kind === 'block' && it.block.type === 'question' && removedQuestions.has(it.block.id)) ||
    (it.kind === 'block' && it.block.type === 'question' && it.block.extra && !states[it.block.id] && minimumFor(it.topic) > 0 && topicCorrect(it.topic) >= minimumFor(it.topic)))

  const shown = items.filter((it) => !skipped(it))
  const stop = shown.findIndex((it) => it.kind === 'block' && it.block.type === 'question' && !isFinished(states[(it.block as Question).id]))
  const visible = whole || stop === -1 ? shown : shown.slice(0, stop + 1)
  const finished = lesson !== null && (whole || stop === -1)
  const activeTopic = visible.length ? (visible[visible.length - 1] as Item & { topic?: number }).topic : undefined

  // An open answer sent back for corrections: the last one, with the teacher's marks, above the new box (D-77).
  const previousFor = (q: Question) => {
    const h = progress?.history?.[q.id]
    if (trying || !h?.length || states[q.id]?.result || (q.kind !== 'open' && q.kind !== 'audio')) return null
    return <PreviousAnswer state={h[h.length - 1]} />
  }

  // Time on the lesson and time away (REQ-5.33): measured for students until the lesson is finished.
  useLessonTime(lessonId, role === 'student' && gate === 'open' && progress !== null && !progress.finished)

  // Reaching the end of a lesson without questions marks it finished (D-55); lessons with
  // questions are marked by the checking service with the last answer.
  const askedToFinish = useRef(false)
  useEffect(() => {
    if (!finished || role !== 'student' || progress === null || progress.finished || askedToFinish.current) return
    askedToFinish.current = true
    httpsCallable(functions, 'finishLesson')({ lessonId }).catch(() => {
      askedToFinish.current = false
    })
  }, [finished, role, progress, lessonId])

  // Opening a comment from the comments inbox (REQ-4.27): the lesson opens at the comment's place.
  const jumped = useRef(false)
  useEffect(() => {
    if (jumped.current || !lesson || !trying || !location.hash.startsWith('#place-')) return
    const place = decodeURIComponent(location.hash.slice('#place-'.length))
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-place="${CSS.escape(place)}"]`)
      const target = (el?.firstElementChild as HTMLElement | null) || (el as HTMLElement | null)
      if (!target) return
      jumped.current = true
      target.scrollIntoView({ block: 'center' })
      target.classList.add('place-flash')
      window.setTimeout(() => target.classList.remove('place-flash'), 2500)
    })
  }, [lesson, trying])

  // Coming back to a lesson: scroll to where the student stopped (REQ-6.2).
  useEffect(() => {
    // Wait until the questions are on the page: while the lesson is still being checked, it shows "Loading".
    if (scrolled.current || !lesson || progress === null || gate === 'checking') return
    scrolled.current = true
    if (Object.keys(progress.questions || {}).length === 0) return
    // Sent back for review: stay at the top, where the teacher's note is (REQ-5.14).
    if (progress.sentBack && !progress.sentBack.done && progress.sentBack.mode === 'review') return
    requestAnimationFrame(() => {
      const cards = document.querySelectorAll('.block-question')
      cards[cards.length - 1]?.scrollIntoView({ block: 'center' })
    })
  }, [lesson, progress, gate])

  if (gate === 'locked' || gate === 'lockedByNotes' || gate === 'lockedByDue' || gate === 'lockedByExam' || gate === 'notGiven') {
    return (
      <main className="page narrow">
        <BackButton />
        <div className="card message-card">
          <p>{gate === 'locked' ? t('lesson.locked') : gate === 'lockedByNotes' ? t('lesson.lockedByNotes') : gate === 'lockedByDue' ? t('lesson.lockedByDue') : gate === 'lockedByExam' ? t('exam.lockedByExam') : t('lesson.notAllowed')}</p>
          <button type="button" className="button primary" onClick={() => navigate('/')}>
            {t('common.toHome')}
          </button>
        </div>
      </main>
    )
  }
  if (problem) {
    return (
      <main className="page narrow">
        <BackButton />
        <div className="card message-card">
          <p>{problem === 'notFound' ? t('lesson.notFound') : t('lesson.notAllowed')}</p>
          <button type="button" className="button primary" onClick={() => navigate('/')}>
            {t('common.toHome')}
          </button>
        </div>
      </main>
    )
  }
  if (!lesson || gate === 'checking') {
    return (
      <main className="page narrow">
        <p className="loading">{t('common.loading')}</p>
      </main>
    )
  }

  const d = lesson.details
  // Students take exams on the exam page (REQ-4.26); teachers try them like any lesson.
  if (d.type === 'exam' && role === 'student' && user) {
    if (!viewReady) {
      return (
        <main className="page narrow">
          <p className="loading">{t('common.loading')}</p>
        </main>
      )
    }
    // Questions removed for the class before the exam started are not part of it (REQ-5.36).
    const examLesson = { ...lesson, topics: lesson.topics.map((tp) => ({ ...tp, blocks: tp.blocks.filter((b) => b.type !== 'question' || !hidden.has(b.id)) })) }
    return <ExamPlayer lessonId={lessonId} lesson={examLesson} uid={user.uid} saved={progress?.examAnswers || {}} submitted={!!progress?.submitted} exam={examInfo} />
  }
  let questionNumber = 0
  const numbers: Record<string, number> = {}
  for (const it of shown) if (it.kind === 'block' && it.block.type === 'question') numbers[it.block.id] = ++questionNumber

  return (
    <main className="page narrow">
      <div className="player-top">
        <BackButton />
        {minimumFor(activeTopic) > 0 && activeTopic !== undefined && !finished && !whole && (
          <div className="topic-progress" aria-live="polite">
            <span>
              {t('q.topicCorrect')}: {Math.min(topicCorrect(activeTopic), minimumFor(activeTopic))} / {minimumFor(activeTopic)}
            </span>
            <span className="dots" aria-hidden="true">
              {Array.from({ length: minimumFor(activeTopic) }, (_, i) => (
                <span key={i} className={`dot${i < topicCorrect(activeTopic) ? ' full' : ''}`} />
              ))}
            </span>
          </div>
        )}
      </div>
      <article className="lesson" ref={articleRef} dir={d.language === 'en' ? 'ltr' : 'rtl'} lang={d.language}>
        <header className="lesson-head">
          <div className="lesson-meta">
            <TypeChip type={d.type} />
            <span>
              <bdi>{d.subject}</bdi> · <Ui>{t('lesson.grade', { grade: d.grade })}</Ui>
            </span>
          </div>
          <h1>{d.title}</h1>
          <p className="lesson-credit">
            <Ui>{t('lesson.by', { creator: d.creator })}</Ui> · <bdi>{d.licence}</bdi>
          </p>
        </header>

        {trying && (
          <div className="try-banner" role="note">
            <Ui>{t('lesson.trying')}</Ui>
            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                // Switching between the whole lesson and the student's view starts the try again (D-90).
                setLocal({})
                setAsStudent((v) => !v)
                window.scrollTo({ top: 0 })
              }}
            >
              <Ui>{asStudent ? t('lesson.seeWhole') : t('lesson.seeAsStudent')}</Ui>
            </button>
            <button type="button" className="button secondary small" onClick={() => setLocal({})}>
              <Ui>{t('lesson.tryAgain')}</Ui>
            </button>
          </div>
        )}
        <SentBackBanner lessonId={lessonId} sentBack={progress?.sentBack} isStudent={role === 'student'} />
        {progress?.redo?.active && (
          <div className="try-banner redo-banner" role="note">
            <Ui>{progress.redo.counts ? t('lesson.redoCounts') : t('lesson.redoPractice')}</Ui>
          </div>
        )}

        {visible.map((it) => (
          <Fragment key={it.kind === 'topic' ? `topic-${it.number}` : it.key}>
            {it.kind === 'topic' ? (
              <>
              <h2 className="topic-heading">
                <Ui className="topic-number">{t('lesson.topic', { number: it.number })}</Ui> <bdi>{it.name}</bdi>
              </h2>
              {whole && removal.info && removal.info.minimumByTopic[it.number] < removal.info.minimum && (
                <p className="removal-note" role="note">
                  <Ui>{t('removal.minimumLowered', { count: removal.info.minimumByTopic[it.number] })}</Ui>
                </p>
              )}
              </>
            ) : it.block.type === 'question' ? (
              <div className={`question-wrap${whole && removedQuestions.has(it.block.id) ? ' question-removed' : ''}`} data-place={it.key} data-topic={it.topic}>
              {whole && removal.info && (
                <RemovalControls
                  q={it.block}
                  lesson={lesson}
                  info={removal.info}
                  busy={removal.busy}
                  onChange={(checkAgainId, removed) => removal.set((it.block as Question).id, checkAgainId, removed)}
                />
              )}
              {whole && (it.block.extra || (it.block.level ?? 1) > 1) && (
                <p className="question-labels">
                  {it.block.extra && <span className="course-chip">{t('lesson.extraLabel')}</span>}
                  {(it.block.level ?? 1) > 1 && <span className="course-chip">{t('lesson.levelLabel', { level: it.block.level })}</span>}
                </p>
              )}
              {it.block.kind === 'blanks' && !(states[it.block.id] as TryState | undefined)?.tryShown ? (
                <BlanksQuestion
                  q={it.block}
                  state={states[it.block.id]}
                  lessonId={lessonId}
                  trying={trying}
                  uid={user?.uid || ''}
                  label={t('q.questionNumber', { number: numbers[it.block.id] })}
                  onState={(st) => setLocal((l) => ({ ...l, [(it.block as Question).id]: st }))}
                />
              ) : it.block.kind === 'drag' && !(states[it.block.id] as TryState | undefined)?.tryShown ? (
                <DragQuestion
                  q={it.block}
                  state={states[it.block.id]}
                  lessonId={lessonId}
                  trying={trying}
                  uid={user?.uid || ''}
                  label={t('q.questionNumber', { number: numbers[it.block.id] })}
                  onState={(st) => setLocal((l) => ({ ...l, [(it.block as Question).id]: st }))}
                />
              ) : it.block.kind === 'audio' && !(states[it.block.id] as TryState | undefined)?.tryShown ? (
                <AudioQuestion
                  q={it.block}
                  state={states[it.block.id]}
                  lessonId={lessonId}
                  trying={trying}
                  uid={user?.uid || ''}
                  label={t('q.questionNumber', { number: numbers[it.block.id] })}
                  onState={(st) => setLocal((l) => ({ ...l, [(it.block as Question).id]: st }))}
                />
              ) : (states[it.block.id] as TryState | undefined)?.tryShown ? (
                <ShownAnswer q={it.block} state={states[it.block.id] as TryState} label={t('q.questionNumber', { number: numbers[it.block.id] })} />
              ) : (
                <QuestionCard
                  q={shuffled(it.block, user?.uid || '')}
                  state={shuffledState(states[it.block.id], user?.uid || '')}
                  lessonId={lessonId}
                  trying={trying}
                  label={t('q.questionNumber', { number: numbers[it.block.id] })}
                  onState={(s) => setLocal((l) => ({ ...l, [(it.block as Question).id]: s }))}
                  beforeAnswer={previousFor(it.block)}
                />
              )}
              {trying && !isFinished(states[it.block.id]) && (
                <TryButtons
                  lessonId={lessonId}
                  q={it.block}
                  onDone={(st) => setLocal((l) => ({ ...l, [(it.block as Question).id]: st }))}
                />
              )}
              <TeacherNote state={states[it.block.id] as Graded | undefined} showGrades={showGrades} />
              </div>
            ) : (
              // data-place and data-topic tell a teacher's comment where it is (REQ-4.27).
              <div className="place" data-place={it.key} data-topic={it.topic}>
                <BlockView block={it.block} />
              </div>
            )}
          </Fragment>
        ))}

        {finished && (
          <footer className="lesson-end">
            <p>
              <Ui>{t('lesson.end')}</Ui>
            </p>
            {progress?.sentBack?.mode === 'review' && <SentBackBanner lessonId={lessonId} sentBack={progress.sentBack} isStudent={role === 'student'} />}
            {showGrades && countingGrade?.outOf ? (
              <p className="lesson-grade">
                <Ui>{countingGrade.pending ? t('lesson.gradePending') : t('lesson.yourGrade', { percent: countingGrade.percent })}</Ui>
              </p>
            ) : null}
            {role === 'student' && progress?.finished && !progress.redo?.active && !(progress.sentBack && !progress.sentBack.done) && Object.keys(states).length > 0 && (
              <button
                type="button"
                className="button secondary"
                onClick={async () => {
                  if (!window.confirm(t('lesson.redoConfirm'))) return
                  setLocal({})
                  scrolled.current = true
                  window.scrollTo(0, 0)
                  await httpsCallable(functions, 'startRedo')({ lessonId }).catch(() => {})
                }}
              >
                <Ui>{t('lesson.redo')}</Ui>
              </button>
            )}
            <button type="button" className="button primary" onClick={() => navigate('/')}>
              <Ui>{t('common.toHome')}</Ui>
            </button>
          </footer>
        )}
      </article>
      {/* Teachers comment on marked words (REQ-4.27); students never see this. */}
      {trying && <CommentTool lessonId={lessonId} version={versionNumber} containerRef={articleRef} />}
    </main>
  )
}

// A lesson the teacher sent back (REQ-5.14, D-59). For review: the teacher's comments come first,
// with "I've read the comments", which unlocks new lessons. For corrections: which questions to
// answer again.
function SentBackBanner({ lessonId, sentBack, isStudent }: { lessonId: string; sentBack: Progress['sentBack']; isStudent: boolean }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  if (!sentBack || sentBack.done) return null
  return (
    <div className="sent-back" role="note">
      <p className="sent-back-title">
        <Ui>{sentBack.mode === 'review' ? t('lesson.sentBackReview') : t('lesson.sentBackCorrections', { n: sentBack.questionIds.length })}</Ui>
      </p>
      {sentBack.note && (
        <p dir="auto" className="sent-back-note">
          {sentBack.note}
        </p>
      )}
      {sentBack.mode === 'review' && isStudent && (
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            httpsCallable(functions, 'readComments')({ lessonId }).catch(() => setBusy(false))
          }}
        >
          <Ui>{t('lesson.readComments')}</Ui>
        </button>
      )}
    </div>
  )
}

// Answers in a random order, the same every time for the same student (REQ-4.19): the order comes
// from the student's account and the question, so coming back shows the same order.
function seeded(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], seed: string): T[] {
  const out = [...items]
  const rand = seeded(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function shuffled(q: Question, uid: string): Question {
  return q.kind === 'choice' ? { ...q, choices: shuffle(q.choices, `${uid}:${q.id}`) } : q
}

function shuffledState(st: QuestionState | undefined, uid: string): QuestionState | undefined {
  const ca = st?.checkAgain
  if (!st || !ca || ca.question.kind !== 'choice') return st
  return { ...st, checkAgain: { ...ca, question: { ...ca.question, choices: shuffle(ca.question.choices, `${uid}:${ca.id}`) } } }
}

// Trying a lesson (REQ-5.32): Skip and Show answer, only for the teacher.
type TryState = QuestionState & { tryShown?: 'skipped' | 'shown'; tryCorrect?: { choices?: string[]; number?: number; cards?: string[]; blanks?: string[] } | null; trySolution?: string | null }

function TryButtons({ lessonId, q, onDone }: { lessonId: string; q: Question; onDone: (s: TryState) => void }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  return (
    <div className="try-buttons">
      <button type="button" className="button secondary small" onClick={() => onDone({ attempts: [], result: 'pending', score: null, tryShown: 'skipped' })}>
        <Ui>{t('lesson.skip')}</Ui>
      </button>
      <button
        type="button"
        className="button secondary small"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            const r = await httpsCallable<unknown, { correct: TryState['tryCorrect']; solution: string | null }>(functions, 'tryAnswer')({ lessonId, questionId: q.id, show: true })
            onDone({ attempts: [], result: 'pending', score: null, tryShown: 'shown', tryCorrect: r.data.correct, trySolution: r.data.solution })
          } finally {
            setBusy(false)
          }
        }}
      >
        <Ui>{t('lesson.showAnswer')}</Ui>
      </button>
    </div>
  )
}

function ShownAnswer({ q, state, label }: { q: Question; state: TryState; label: string }) {
  const { t } = useTranslation()
  const correct = state.tryCorrect
  const cardText = (id: string) => (q.cards || []).find((k) => k.id === id)?.text || ''
  const text = correct?.blanks ? correct.blanks.map((w: string, i: number) => `${i + 1}: ${w}`).join(' · ') : correct?.cards ? correct.cards.map((id, i) => `${i + 1}: ${cardText(id)}`).join(' · ') : correct?.number !== undefined ? `${correct.number}${q.unit ? ' ' + q.unit : ''}` :(correct?.choices || []).map((id) => q.choices.find((c) => c.id === id)?.text || '').join(' · ')
  return (
    <section className="block-question answered">
      <span className="block-label">{label}</span>
      <Markdown text={q.prompt} />
      <QuestionImage q={q} />
      {state.tryShown === 'skipped' ? (
        <p className="muted">
          <Ui>{t('lesson.skipped')}</Ui>
        </p>
      ) : (
        <div className="feedback solution">
          {text && (
            <p className="correct-line">
              <Ui>{t('q.theCorrectAnswer')}</Ui> <bdi>{text}</bdi>
            </p>
          )}
          {state.trySolution && <Markdown text={state.trySolution} />}
        </div>
      )}
    </section>
  )
}

// A question answered by recording (REQ-6.6, D-67): record up to 30 seconds, listen back, record
// again, then send. Once sent it can't be changed, like a written answer. While trying the lesson,
// a teacher records without anything being saved.
function AudioQuestion({ q, state, lessonId, label, trying, uid, onState }: { q: Question; state: QuestionState | undefined; lessonId: string; label: string; trying: boolean; uid: string; onState: (s: QuestionState) => void }) {
  const { t } = useTranslation()
  const [blob, setBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const sent = state?.result
  const path = typeof state?.attempts?.[0] === 'string' ? (state.attempts[0] as string) : null
  return (
    <section className={`block-question${sent ? ' answered' : ''}`}>
      <span className="block-label">
        <Ui>{label}</Ui>
      </span>
      <Markdown text={q.prompt} />
      <QuestionImage q={q} />
      {!sent ? (
        <>
          <Recorder onReady={setBlob} disabled={busy} />
          <button
            type="button"
            className="button primary check-button"
            disabled={!blob || busy}
            onClick={async () => {
              if (!blob) return
              setBusy(true)
              setFailed(false)
              try {
                if (trying) {
                  onState({ attempts: ['(trying)'], result: 'pending', score: null })
                } else {
                  const p = await uploadRecording(`recordings/${uid}/${lessonId}/${q.id}`, blob)
                  const r = await httpsCallable<unknown, { state: QuestionState }>(functions, 'answer')({ lessonId, questionId: q.id, value: p })
                  onState(r.data.state)
                }
              } catch {
                setFailed(true)
              } finally {
                setBusy(false)
              }
            }}
          >
            <Ui>{t('q.send')}</Ui>
          </button>
          {failed && (
            <p className="answer-problem" role="alert">
              <Ui>{t('q.problem.failed')}</Ui>
            </p>
          )}
        </>
      ) : (
        <>
          {path && path.startsWith('recordings/') && <StoredAudio path={path} label={t('audio.yours')} />}
          {!(state as Graded).graded && (
            <p className="feedback saved" role="status">
              <Ui>{t('q.savedForTeacher')}</Ui>
            </p>
          )}
        </>
      )}
    </section>
  )
}

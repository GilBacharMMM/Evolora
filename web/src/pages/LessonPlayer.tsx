import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db, IS_TEST_SITE } from '../site'
import { useSession } from '../session'
import { navigate } from '../router'
import { BlockView, Ui } from '../lesson/Blocks'
import { QuestionCard } from '../lesson/QuestionCard'
import { isFinished, type QuestionState } from '../lesson/answers'
import type { Block, LessonVersion, Question } from '../lesson/types'
import { TypeChip } from '../components/TypeChip'
import { BackButton } from '../components/BackButton'

type Item = { kind: 'topic'; number: number; name: string } | { kind: 'block'; block: Block; key: string; topic: number }

interface Progress {
  version?: number
  questions?: Record<string, QuestionState>
  topics?: Record<string, { correct: number; flagged?: boolean }>
  grade?: { percent: number | null; pending: boolean; points: number; outOf: number }
}

// The lesson player (REQ-6.2, 4.5, 4.21, system-design 2.3). The student sees the lesson up to
// the next question; the rest appears once the question is finished. Answers are checked by the
// checking service, and the student's work is saved there, so they return to the same place.
export function LessonPlayer({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation()
  const { user } = useSession()
  const [currentVersion, setCurrentVersion] = useState<number | null>(null)
  const [minimum, setMinimum] = useState(0)
  const [lesson, setLesson] = useState<LessonVersion | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [local, setLocal] = useState<Record<string, QuestionState>>({})
  const [problem, setProblem] = useState<'notFound' | 'notAllowed' | null>(null)
  const scrolled = useRef(false)

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
    const unsub = user
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
  }, [lessonId, user])

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
  const topicCorrect = (n: number) => progress?.topics?.[n]?.correct ?? 0

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
  const skipped = (it: Item) =>
    it.kind === 'block' && it.block.type === 'question' && it.block.extra && !states[it.block.id] && minimum > 0 && topicCorrect(it.topic) >= minimum

  const shown = items.filter((it) => !skipped(it))
  const stop = shown.findIndex((it) => it.kind === 'block' && it.block.type === 'question' && it.block.kind !== 'audio' && !isFinished(states[(it.block as Question).id]))
  const visible = stop === -1 ? shown : shown.slice(0, stop + 1)
  const finished = lesson !== null && stop === -1
  const activeTopic = visible.length ? (visible[visible.length - 1] as Item & { topic?: number }).topic : undefined

  // Coming back to a lesson: scroll to where the student stopped (REQ-6.2).
  useEffect(() => {
    if (scrolled.current || !lesson || progress === null) return
    scrolled.current = true
    if (Object.keys(progress.questions || {}).length === 0) return
    requestAnimationFrame(() => {
      const cards = document.querySelectorAll('.block-question')
      cards[cards.length - 1]?.scrollIntoView({ block: 'center' })
    })
  }, [lesson, progress])

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
  if (!lesson) {
    return (
      <main className="page narrow">
        <p className="loading">{t('common.loading')}</p>
      </main>
    )
  }

  const d = lesson.details
  let questionNumber = 0
  const numbers: Record<string, number> = {}
  for (const it of shown) if (it.kind === 'block' && it.block.type === 'question') numbers[it.block.id] = ++questionNumber

  return (
    <main className="page narrow">
      <div className="player-top">
        <BackButton />
        {minimum > 0 && activeTopic !== undefined && !finished && (
          <div className="topic-progress" aria-live="polite">
            <span>
              {t('q.topicCorrect')}: {Math.min(topicCorrect(activeTopic), minimum)} / {minimum}
            </span>
            <span className="dots" aria-hidden="true">
              {Array.from({ length: minimum }, (_, i) => (
                <span key={i} className={`dot${i < topicCorrect(activeTopic) ? ' full' : ''}`} />
              ))}
            </span>
          </div>
        )}
      </div>
      <article className="lesson" dir={d.language === 'en' ? 'ltr' : 'rtl'} lang={d.language}>
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

        {visible.map((it) => (
          <Fragment key={it.kind === 'topic' ? `topic-${it.number}` : it.key}>
            {it.kind === 'topic' ? (
              <h2 className="topic-heading">
                <Ui className="topic-number">{t('lesson.topic', { number: it.number })}</Ui> <bdi>{it.name}</bdi>
              </h2>
            ) : it.block.type === 'question' ? (
              <QuestionCard
                q={it.block}
                state={states[it.block.id]}
                lessonId={lessonId}
                label={t('q.questionNumber', { number: numbers[it.block.id] })}
                onState={(s) => setLocal((l) => ({ ...l, [(it.block as Question).id]: s }))}
              />
            ) : (
              <BlockView block={it.block} />
            )}
          </Fragment>
        ))}

        {finished && (
          <footer className="lesson-end">
            <p>
              <Ui>{t('lesson.end')}</Ui>
            </p>
            {IS_TEST_SITE && progress?.grade?.outOf ? (
              <p className="part-note">
                <Ui>
                  {t('q.testScore', { points: progress.grade.points, outOf: progress.grade.outOf, percent: progress.grade.percent })}
                  {progress.grade.pending ? ` ${t('q.testScorePending')}` : ''}
                </Ui>
              </p>
            ) : null}
            <button type="button" className="button primary" onClick={() => navigate('/')}>
              <Ui>{t('common.toHome')}</Ui>
            </button>
          </footer>
        )}
      </article>
    </main>
  )
}

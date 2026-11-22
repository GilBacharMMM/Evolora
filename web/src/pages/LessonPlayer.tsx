import { Fragment, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../site'
import { navigate } from '../router'
import { BlockView, QuestionView, Ui } from '../lesson/Blocks'
import type { Block, LessonVersion, Question } from '../lesson/types'
import { TypeChip } from '../components/TypeChip'
import { BackButton } from '../components/BackButton'

type Item = { kind: 'topic'; number: number; name: string } | { kind: 'block'; block: Block; key: string }

// The lesson player (REQ-6.2, 4.5, system-design 2.3): the student sees the lesson up to
// the next question; the rest appears after the question. In part 1 a question is passed
// with "Continue"; checking answers comes in part 2.
export function LessonPlayer({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation()
  const [lesson, setLesson] = useState<LessonVersion | null>(null)
  const [problem, setProblem] = useState<'notFound' | 'notAllowed' | null>(null)
  const [passed, setPassed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const summary = await getDoc(doc(db, 'lessons', lessonId))
        if (!summary.exists()) return live && setProblem('notFound')
        const version = await getDoc(doc(db, 'lessons', lessonId, 'versions', String(summary.data().currentVersion)))
        if (!version.exists()) return live && setProblem('notFound')
        if (live) setLesson(version.data() as LessonVersion)
      } catch {
        if (live) setProblem('notAllowed')
      }
    })()
    return () => {
      live = false
    }
  }, [lessonId])

  const items = useMemo<Item[]>(() => {
    if (!lesson) return []
    const out: Item[] = []
    for (const topic of lesson.topics) {
      if (topic.name) out.push({ kind: 'topic', number: topic.number, name: topic.name })
      topic.blocks.forEach((block, i) => out.push({ kind: 'block', block, key: `${topic.number}-${i}` }))
    }
    return out
  }, [lesson])

  // Everything up to and including the first question not yet passed is visible (REQ-4.5).
  const visibleCount = useMemo(() => {
    const stop = items.findIndex((it) => it.kind === 'block' && it.block.type === 'question' && !passed.has((it.block as Question).id))
    return stop === -1 ? items.length : stop + 1
  }, [items, passed])

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
  if (!lesson) return <main className="page narrow"><p className="loading">{t('common.loading')}</p></main>

  const d = lesson.details
  const finished = visibleCount === items.length
  const questionCount = items.filter((it) => it.kind === 'block' && it.block.type === 'question').length

  return (
    <main className="page narrow">
      <BackButton />
      <p className="part-banner">{t('lesson.partOneBanner')}</p>
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
            <Ui>{t('lesson.by', { creator: d.creator })}</Ui> · <bdi>{d.licence}</bdi> · <Ui>{t('lesson.questionsCount', { count: questionCount })}</Ui>
          </p>
          {lesson.imagesState === 'missing' && (
            <p className="notice">
              <Ui>{t('lesson.imagesNotYet')}</Ui>
            </p>
          )}
        </header>

        {items.slice(0, visibleCount).map((it) => (
          <Fragment key={it.kind === 'topic' ? `topic-${it.number}` : it.key}>
            {it.kind === 'topic' ? (
              <h2 className="topic-heading">
                <Ui className="topic-number">{t('lesson.topic', { number: it.number })}</Ui> <bdi>{it.name}</bdi>
              </h2>
            ) : it.block.type === 'question' ? (
              <QuestionView
                q={it.block}
                answered={passed.has(it.block.id)}
                onContinue={() => setPassed((p) => new Set(p).add((it.block as Question).id))}
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
            <button type="button" className="button primary" onClick={() => navigate('/')}>
              <Ui>{t('common.toHome')}</Ui>
            </button>
          </footer>
        )}
      </article>
    </main>
  )
}

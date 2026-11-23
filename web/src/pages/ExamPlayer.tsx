import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../site'
import { navigate } from '../router'
import { shuffle } from '../shuffle'
import { BlockView, Ui } from '../lesson/Blocks'
import { Markdown } from '../lesson/Rich'
import { BackButton } from '../components/BackButton'
import { TypeChip } from '../components/TypeChip'
import type { LessonVersion, Question } from '../lesson/types'

interface ExamResult {
  released: boolean
  questions: Record<string, { attempts: unknown[]; result: string; score: number | null; solution?: string | null; correct?: { choices?: string[]; number?: number }; graded?: boolean; teacherComment?: string | null }>
  grade: { percent: number | null; pending: boolean }
}

const save = httpsCallable(functions, 'examSave')
const submit = httpsCallable(functions, 'examSubmit')

// An exam (REQ-4.26, 5.23): every question on one page, one answer each, no hints, solutions or
// tips. Answers are saved as the student goes, and can be changed until "Submit exam". With a
// time window and timer, the time left shows, with a notice 5 minutes before the end, and the
// exam is submitted by itself at the end. Results show only after the teacher releases them.
export function ExamPlayer({
  lessonId,
  lesson,
  uid,
  saved,
  submitted,
  exam,
}: {
  lessonId: string
  lesson: LessonVersion
  uid: string
  saved: Record<string, unknown>
  submitted: boolean
  exam?: { end: number | null; timer: boolean } | null
}) {
  const { t } = useTranslation()
  const [answers, setAnswers] = useState<Record<string, unknown>>(saved)
  const [problem, setProblem] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<ExamResult | null | 'hidden'>(null)
  const [now, setNow] = useState(Date.now())
  const timers = useRef<Record<string, number>>({})
  const d = lesson.details

  // After submitting: the results, if the teacher released them.
  useEffect(() => {
    if (!submitted) return
    getDoc(doc(db, 'examResults', `${uid}__${lessonId}`))
      .then((s) => setResult(s.exists() ? (s.data() as ExamResult) : 'hidden'))
      .catch(() => setResult('hidden'))
  }, [submitted, uid, lessonId])

  // The timer, and submitting by itself when the window ends (REQ-5.23).
  const end = exam?.end ?? null
  useEffect(() => {
    if (submitted || !end) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [submitted, end])
  const left = end ? end - now : null
  useEffect(() => {
    if (!submitted && left !== null && left <= 0 && !sending) {
      setSending(true)
      submit({ lessonId }).catch(() => setSending(false))
    }
  }, [left, submitted, sending, lessonId])

  function change(q: Question, value: unknown, now = false) {
    setAnswers((a) => ({ ...a, [q.id]: value }))
    window.clearTimeout(timers.current[q.id])
    const send = () =>
      save({ lessonId, questionId: q.id, value })
        .then(() => setProblem(null))
        .catch((e: { message?: string }) => setProblem(e.message === 'closed' ? t('exam.closed') : t('exam.notSaved')))
    if (now) void send()
    else timers.current[q.id] = window.setTimeout(send, 1200)
  }

  const questions = lesson.topics.flatMap((tp) => tp.blocks.filter((b): b is Question => b.type === 'question' && b.kind !== 'audio'))
  const number = (id: string) => questions.findIndex((q) => q.id === id) + 1
  const mmss = (ms: number) => {
    const s = Math.max(0, Math.ceil(ms / 1000))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <main className="page narrow">
      <div className="player-top">
        <BackButton />
        {!submitted && exam?.timer && left !== null && (
          <div className={`exam-timer${left <= 5 * 60_000 ? ' ending' : ''}`} aria-live="polite">
            {t('exam.timeLeft', { time: mmss(left) })}
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
        </header>
        {!submitted && exam?.timer && left !== null && left <= 5 * 60_000 && (
          <p className="notice" role="alert">
            <Ui>{t('exam.fiveMinutes')}</Ui>
          </p>
        )}
        {!submitted && (
          <p className="muted">
            <Ui>{t('exam.explain')}</Ui>
          </p>
        )}

        {lesson.topics.flatMap((tp) =>
          tp.blocks.map((b, i) =>
            b.type !== 'question' ? (
              <BlockView key={`${tp.number}-${i}`} block={b} />
            ) : b.kind === 'audio' ? null : (
              <section key={b.id} className="block-question exam-question">
                <span className="block-label">
                  <Ui>{t('q.questionNumber', { number: number(b.id) })}</Ui>
                </span>
                <Markdown text={b.prompt} />
                {submitted ? (
                  <ExamAnswerView q={b} given={answers[b.id]} result={result && result !== 'hidden' ? result.questions[b.id] : undefined} />
                ) : (
                  <ExamInput q={b} uid={uid} value={answers[b.id]} onChange={(v, now) => change(b, v, now)} />
                )}
              </section>
            ),
          ),
        )}

        <footer className="lesson-end">
          {problem && (
            <p className="notice" role="alert">
              <Ui>{problem}</Ui>
            </p>
          )}
          {!submitted ? (
            <button
              type="button"
              className="button primary"
              disabled={sending}
              onClick={async () => {
                if (!window.confirm(t('exam.submitConfirm'))) return
                setSending(true)
                try {
                  await Promise.all(Object.entries(answers).map(([questionId, value]) => save({ lessonId, questionId, value }).catch(() => {})))
                  await submit({ lessonId })
                } catch {
                  setProblem(t('exam.notSubmitted'))
                  setSending(false)
                }
              }}
            >
              <Ui>{t('exam.submit')}</Ui>
            </button>
          ) : result === 'hidden' || result === null ? (
            <p>
              <Ui>{t('exam.submitted')}</Ui>
            </p>
          ) : (
            <p className="lesson-grade">
              <Ui>{result.grade.pending ? t('lesson.gradePending') : t('lesson.yourGrade', { percent: result.grade.percent })}</Ui>
            </p>
          )}
          <button type="button" className="button secondary" onClick={() => navigate('/')}>
            <Ui>{t('common.toHome')}</Ui>
          </button>
        </footer>
      </article>
    </main>
  )
}

function ExamInput({ q, uid, value, onChange }: { q: Question; uid: string; value: unknown; onChange: (v: unknown, now?: boolean) => void }) {
  const { t } = useTranslation()
  if (q.kind === 'choice') {
    const chosen = Array.isArray(value) ? (value as string[]) : []
    return (
      <fieldset className="choices">
        <legend className="visually-hidden">{t('lesson.chooseAnswer')}</legend>
        {q.multipleCorrect && (
          <p className="muted small-note">
            <Ui>{t('lesson.chooseAll')}</Ui>
          </p>
        )}
        {shuffle(q.choices, `${uid}:${q.id}`).map((c) => (
          <label key={c.id} className="choice">
            <input
              type={q.multipleCorrect ? 'checkbox' : 'radio'}
              name={q.id}
              checked={chosen.includes(c.id)}
              onChange={() => onChange(q.multipleCorrect ? (chosen.includes(c.id) ? chosen.filter((x) => x !== c.id) : [...chosen, c.id]) : [c.id], true)}
            />
            <Markdown text={c.text} inline />
          </label>
        ))}
      </fieldset>
    )
  }
  if (q.kind === 'number') {
    return (
      <label className="number-answer">
        <span className="visually-hidden">{t('lesson.yourAnswer')}</span>
        <input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} inputMode="decimal" dir="ltr" />
        {q.unit && <bdi> {q.unit}</bdi>}
      </label>
    )
  }
  return (
    <label className="open-answer">
      <span>{t('lesson.yourAnswer')}</span>
      <textarea value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} rows={5} dir="auto" />
    </label>
  )
}

// After submitting: the student's answer, and once the results are released, right or wrong,
// the correct answer and the full solution (REQ-4.26).
function ExamAnswerView({ q, given, result }: { q: Question; given: unknown; result?: ExamResult['questions'][string] }) {
  const { t } = useTranslation()
  const text = (v: unknown) =>
    q.kind === 'choice' ? (Array.isArray(v) ? (v as string[]).map((id) => q.choices.find((c) => c.id === id)?.text || '').join(' · ') : '') : String(v ?? '')
  return (
    <div className="exam-answer">
      <p>
        <Ui>{t('exam.yourAnswer')}</Ui> <bdi>{text(given) || '—'}</bdi>
      </p>
      {result && (
        <div className={`feedback ${result.result === 'correct1' ? 'correct' : result.result === 'pending' ? 'saved' : 'solution'}`}>
          <span className="feedback-title">
            <Ui>
              {result.result === 'correct1'
                ? t('q.correct')
                : result.result === 'pending'
                  ? result.graded
                    ? t('lesson.marks', { percent: Math.round((result.score ?? 0) * 100) })
                    : t('q.savedForTeacher')
                  : t('exam.wrong')}
            </Ui>
          </span>
          {result.result === 'wrong' && result.correct && (
            <p className="correct-line">
              <Ui>{t('q.theCorrectAnswer')}</Ui> <bdi>{result.correct.number !== undefined ? `${result.correct.number}${q.unit ? ' ' + q.unit : ''}` : text(result.correct.choices)}</bdi>
            </p>
          )}
          {result.teacherComment && <p dir="auto">{result.teacherComment}</p>}
          {result.solution && <Markdown text={result.solution} />}
        </div>
      )}
    </div>
  )
}

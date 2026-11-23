import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../site'
import { Markdown } from './Rich'
import { Ui } from './Blocks'
import type { Question } from './types'
import { isFinished, looksLikeNumber, type CheckAgainState, type QuestionState } from './answers'

export type { QuestionState }

// A question in the lesson player, checked by the checking service in the cloud (D-17):
// 2 attempts, a hint after the 1st wrong answer, the full solution after the 2nd, then a
// check-again question (REQ-4.16, 4.17, 4.22, 6.3). Open questions are saved for the teacher.

type Problem = 'notNumber' | 'chooseOne' | 'offline' | 'failed' | 'emptyAnswer' | null

function problemOf(e: unknown): Problem {
  const code = (e as { code?: string }).code || ''
  if (code === 'functions/invalid-argument') return 'notNumber'
  if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded' || code === 'functions/internal' || !navigator.onLine) return 'offline'
  return 'failed'
}

function ProblemLine({ problem }: { problem: Problem }) {
  const { t } = useTranslation()
  if (!problem) return null
  return (
    <p role="alert" className="answer-problem">
      <Ui>{t(`q.problem.${problem}`)}</Ui>
    </p>
  )
}

// Choices or a number box, with a "Check" button.
function AnswerForm({
  kind,
  choices,
  multiple,
  unit,
  name,
  finished,
  lastAnswer,
  correctChoices,
  onSubmit,
}: {
  kind: 'choice' | 'number'
  choices: { id: string; text: string }[]
  multiple: boolean
  unit: string | null
  name: string
  finished: boolean
  lastAnswer: unknown
  correctChoices: string[] | null
  onSubmit: (value: unknown) => Promise<void>
}) {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<string[]>([])
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<Problem>(null)
  const shownPicked = finished && Array.isArray(lastAnswer) ? (lastAnswer as string[]) : picked

  async function submit(e: FormEvent) {
    e.preventDefault()
    setProblem(null)
    let value: unknown
    if (kind === 'choice') {
      if (picked.length === 0) return setProblem('chooseOne')
      value = picked
    } else {
      if (!looksLikeNumber(typed)) return setProblem('notNumber')
      value = typed.trim()
    }
    setBusy(true)
    try {
      await onSubmit(value)
      setPicked([])
      setTyped('')
    } catch (err) {
      setProblem(problemOf(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="answer-form" onSubmit={submit}>
      {kind === 'choice' ? (
        <fieldset className="choices" disabled={finished || busy}>
          <legend className="visually-hidden">{t('lesson.chooseAnswer')}</legend>
          {multiple && (
            <p className="hint-line">
              <Ui>{t('lesson.chooseAll')}</Ui>
            </p>
          )}
          {choices.map((c) => {
            const isRight = correctChoices?.includes(c.id)
            return (
              <label key={c.id} className={`choice${isRight ? ' right' : ''}`}>
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name={name}
                  value={c.id}
                  checked={shownPicked.includes(c.id)}
                  onChange={(e) => {
                    setProblem(null)
                    if (multiple) setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))
                    else setPicked([c.id])
                  }}
                />
                <Markdown text={c.text} inline />
                {isRight && (
                  <span className="right-mark">
                    <Ui>{t('q.rightAnswer')}</Ui>
                  </span>
                )}
              </label>
            )
          })}
        </fieldset>
      ) : (
        <label className="number-answer">
          <Ui>{t('lesson.yourAnswer')}</Ui>
          <span className="number-row">
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              autoComplete="off"
              disabled={finished || busy}
              value={finished ? String(lastAnswer ?? '') : typed}
              onChange={(e) => {
                setProblem(null)
                setTyped(e.target.value)
              }}
            />
            {unit && <span>{unit}</span>}
          </span>
        </label>
      )}
      <ProblemLine problem={problem} />
      {!finished && (
        <button type="submit" className="button primary check-button" disabled={busy}>
          <Ui>{busy ? t('q.checking') : t('q.check')}</Ui>
        </button>
      )}
    </form>
  )
}

function correctText(kind: 'choice' | 'number', correct: QuestionState['correct'], choices: { id: string; text: string }[], unit: string | null) {
  if (!correct) return ''
  if (kind === 'number') return `${correct.number}${unit ? ` ${unit}` : ''}`
  return (correct.choices || []).map((id) => choices.find((c) => c.id === id)?.text || '').join(' · ')
}

export function QuestionCard({
  q,
  state,
  lessonId,
  onState,
  label,
}: {
  q: Question
  state: QuestionState | undefined
  lessonId: string
  onState: (s: QuestionState) => void
  label: string
}) {
  const { t } = useTranslation()
  const [tipsOpen, setTipsOpen] = useState(false)
  const [openTip, setOpenTip] = useState<number | null>(null)
  const [openText, setOpenText] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<Problem>(null)
  const answer = httpsCallable<{ lessonId: string; questionId: string; value: unknown; checkAgain?: boolean }, { state: QuestionState }>(functions, 'answer')
  const tip = httpsCallable(functions, 'openTip')

  const st = state
  const result = st?.result ?? null
  const mainFinished = Boolean(result)
  const lastMain = st?.attempts?.[st.attempts.length - 1]
  const ca = st?.checkAgain

  async function send(value: unknown, checkAgain = false) {
    const r = await answer({ lessonId, questionId: q.id, value, checkAgain })
    if (r.data.state) onState(r.data.state)
  }

  async function sendOpen(e: FormEvent) {
    e.preventDefault()
    setProblem(null)
    if (!openText.trim()) return setProblem('emptyAnswer')
    setBusy(true)
    try {
      await send(openText)
    } catch (err) {
      setProblem(problemOf(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`block-question${isFinished(st) ? ' answered' : ''}`} aria-label={label}>
      <Ui className="block-label">{label}</Ui>
      <Markdown text={q.prompt} className="question-prompt" />

      {(q.kind === 'choice' || q.kind === 'number') && (
        <AnswerForm
          kind={q.kind}
          choices={q.choices}
          multiple={q.multipleCorrect}
          unit={q.unit}
          name={q.id}
          finished={mainFinished}
          lastAnswer={lastMain}
          correctChoices={q.kind === 'choice' ? (result === 'correct1' || result === 'correct2' ? (lastMain as string[]) : st?.correct?.choices || null) : null}
          onSubmit={(v) => send(v)}
        />
      )}

      {q.kind === 'open' && (
        <form className="open-answer" onSubmit={sendOpen}>
          <label>
            <Ui>{t('lesson.yourAnswer')}</Ui>
            <textarea rows={4} dir="auto" disabled={mainFinished || busy} value={mainFinished ? String(lastMain ?? '') : openText} onChange={(e) => setOpenText(e.target.value)} />
          </label>
          <ProblemLine problem={problem} />
          {!mainFinished && (
            <button type="submit" className="button primary check-button" disabled={busy}>
              <Ui>{t('q.send')}</Ui>
            </button>
          )}
        </form>
      )}

      {q.kind === 'audio' && (
        <p className="hint-line">
          <Ui>{t('lesson.audioLater')}</Ui>
        </p>
      )}

      {/* Feedback on the answer (design language: no red for mistakes) */}
      {(result === 'correct1' || result === 'correct2') && (
        <p className="feedback correct" role="status">
          <Ui>{result === 'correct1' ? t('q.correct') : t('q.correctSecond')}</Ui>
        </p>
      )}
      {result === 'pending' && (
        <p className="feedback saved" role="status">
          <Ui>{t('q.savedForTeacher')}</Ui>
        </p>
      )}
      {!result && st?.hint !== undefined && (st?.attempts?.length ?? 0) === 1 && (
        <div className="feedback hint" role="status">
          <Ui className="feedback-title">{t('q.tryAgain')}</Ui>
          {st.hint && <Markdown text={st.hint} />}
        </div>
      )}
      {result === 'wrong' && (
        <div className="feedback solution" role="status">
          <Ui className="feedback-title">{t('q.fullSolution')}</Ui>
          {st?.solution && <Markdown text={st.solution} />}
          {q.kind === 'number' && st?.correct && (
            <p className="correct-line">
              <Ui>{t('q.theCorrectAnswer')}</Ui> <bdi dir="ltr">{correctText('number', st.correct, q.choices, q.unit)}</bdi>
            </p>
          )}
        </div>
      )}

      {ca && <CheckAgainCard ca={ca} onSubmit={(v) => send(v, true)} fallbackHint={st?.hint ?? null} />}

      {q.tips.length > 0 && (
        <div className="tips">
          <button type="button" className="link-button" onClick={() => setTipsOpen((v) => !v)} aria-expanded={tipsOpen}>
            <Ui>{t('lesson.tipsLink')}</Ui>
          </button>
          {tipsOpen && (
            <div className="tips-box">
              {q.tips.map((tp, i) => (
                <div key={i} className="tip">
                  <button
                    type="button"
                    className="tip-title"
                    aria-expanded={openTip === i}
                    onClick={() => {
                      const opening = openTip !== i
                      setOpenTip(opening ? i : null)
                      // Noted for the teacher (REQ-6.15); never changes the grade.
                      if (opening) void tip({ lessonId, questionId: q.id, tip: i }).catch(() => {})
                    }}
                  >
                    {tp.title}
                  </button>
                  {openTip === i && <Markdown text={tp.text} className="tip-text" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function CheckAgainCard({ ca, onSubmit, fallbackHint }: { ca: CheckAgainState; onSubmit: (v: unknown) => Promise<void>; fallbackHint: string | null }) {
  const { t } = useTranslation()
  const q = ca.question
  const last = ca.attempts[ca.attempts.length - 1]
  const finished = Boolean(ca.result)
  const correctChoices = q.kind === 'choice' ? (ca.result === 'correct1' || ca.result === 'correct2' ? (last as string[]) : ca.correct?.choices || null) : null
  return (
    <section className="check-again">
      <Ui className="block-label">{t('q.checkAgain')}</Ui>
      <p className="hint-line">
        <Ui>{t('q.checkAgainExplain')}</Ui>
      </p>
      <Markdown text={q.prompt} className="question-prompt" />
      <AnswerForm kind={q.kind} choices={q.choices} multiple={q.multipleCorrect} unit={q.unit} name={q.id} finished={finished} lastAnswer={last} correctChoices={correctChoices} onSubmit={onSubmit} />
      {(ca.result === 'correct1' || ca.result === 'correct2') && (
        <p className="feedback correct" role="status">
          <Ui>{t('q.correct')}</Ui>
        </p>
      )}
      {!ca.result && ca.attempts.length === 1 && (
        <div className="feedback hint" role="status">
          <Ui className="feedback-title">{t('q.tryAgain')}</Ui>
          {(ca.hint || fallbackHint) && <Markdown text={(ca.hint || fallbackHint) as string} />}
        </div>
      )}
      {ca.result === 'wrong' && (
        <>
          <div className="feedback solution" role="status">
            {q.kind === 'number' && ca.correct && (
              <p className="correct-line">
                <Ui>{t('q.theCorrectAnswer')}</Ui> <bdi dir="ltr">{correctText('number', ca.correct, q.choices, q.unit)}</bdi>
              </p>
            )}
            {ca.solution && <Markdown text={ca.solution} />}
          </div>
          <p className="feedback teacher" role="status">
            <Ui>{t('q.teacherTold')}</Ui>
          </p>
        </>
      )}
    </section>
  )
}

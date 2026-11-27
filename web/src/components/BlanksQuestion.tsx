import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../site'
import { Ui } from '../lesson/Blocks'
import { Markdown } from '../lesson/Rich'
import { shuffle } from '../shuffle'
import type { QuestionState } from '../lesson/answers'
import type { Question } from '../lesson/types'

// Fill-in-the-blanks questions (REQ-4.30, D-78). The text keeps "＿＿＿" where each blank is. Three
// kinds: typed, a choice in each blank (a dropdown), or a word list (cards placed by dragging, or by
// clicking a card and then a blank, each card used once). In lessons, checked like drag and drop
// (D-70): each blank marked right or wrong, right ones locked, wrong ones emptied; in exams, one attempt.

export const BLANK = '＿＿＿'

type Mark = 'right' | 'wrong' | 'solution' | ''

// The text with a control in every blank. `values` holds, per blank, the typed text, the chosen
// option's id or the placed card's id ('' when empty).
export function BlanksText({
  q,
  uid,
  values,
  marks = [],
  disabled = [],
  picked = null,
  onChange,
  onBlankClick,
}: {
  q: Question
  uid: string
  values: string[]
  marks?: Mark[]
  disabled?: boolean[]
  picked?: string | null
  onChange: (i: number, v: string) => void
  onBlankClick?: (i: number) => void
}) {
  const { t } = useTranslation()
  const parts = q.prompt.split(BLANK)
  const cardText = (id: string) => (q.cards || []).find((c) => c.id === id)?.text || ''
  const out: ReactNode[] = []
  parts.forEach((part, i) => {
    // A prefix written right before a blank ("ה____") stays on the same line as the blank.
    const last = i === parts.length - 1
    const prefix = !last ? (part.match(/\S+$/) || [''])[0] : ''
    const before = prefix ? part.slice(0, -prefix.length) : part
    if (before) out.push(<Markdown key={`t${i}`} text={before} inline />)
    if (last) return
    const group: ReactNode[] = prefix ? [<Markdown key={`p${i}`} text={prefix} inline />] : []
    const mark = marks[i] || ''
    const off = !!disabled[i]
    const label = t('blanks.blank', { n: i + 1 })
    const cls = `blank${mark ? ` ${mark}` : ''}`
    if (q.blanksKind === 'typed') {
      group.push(
        <input
          key={`b${i}`}
          className={`${cls} blank-typed`}
          value={values[i] || ''}
          disabled={off}
          aria-label={label}
          size={Math.max(6, (values[i] || '').length + 1)}
          dir="auto"
          onChange={(e) => onChange(i, e.target.value)}
        />,
      )
    } else if (q.blanksKind === 'choice') {
      const options = shuffle(q.blanks?.[i]?.options || [], `${uid}:${q.id}:${i}`)
      group.push(
        <select key={`b${i}`} className={`${cls} blank-choice`} value={values[i] || ''} disabled={off} aria-label={label} onChange={(e) => onChange(i, e.target.value)}>
          <option value="">…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.text}
            </option>
          ))}
        </select>,
      )
    } else {
      group.push(
        <button
          key={`b${i}`}
          type="button"
          className={`${cls} blank-slot${values[i] ? ' filled' : ''}${picked ? ' waiting' : ''}`}
          disabled={off}
          aria-label={values[i] ? `${label}: ${cardText(values[i])}` : label}
          onClick={() => onBlankClick?.(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            onChange(i, e.dataTransfer.getData('text/plain'))
          }}
        >
          {values[i] ? <bdi>{cardText(values[i])}</bdi> : <span className="blank-empty">{i + 1}</span>}
        </button>,
      )
    }
    if (mark === 'right') group.push(<span key={`m${i}`} className="blank-mark" aria-hidden="true">✓</span>)
    if (mark === 'wrong') group.push(<span key={`m${i}`} className="blank-mark" aria-hidden="true">✗</span>)
    out.push(<span key={`g${i}`} className="blank-group">{group}</span>)
  })
  return <div className="blanks-text">{out}</div>
}

// The word cards still free to place (word list).
export function WordBank({ q, uid, values, picked, onPick }: { q: Question; uid: string; values: string[]; picked: string | null; onPick: (id: string | null) => void }) {
  if (q.blanksKind !== 'words') return null
  return (
    <div className="drag-bank" role="list">
      {shuffle(q.cards || [], `${uid}:${q.id}`).map((c) => {
        const used = values.includes(c.id)
        return (
          <button
            key={c.id}
            type="button"
            role="listitem"
            className={`drag-card${picked === c.id ? ' picked' : ''}${used ? ' used' : ''}`}
            draggable={!used}
            aria-pressed={picked === c.id}
            disabled={used}
            onClick={() => onPick(picked === c.id ? null : c.id)}
            onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
          >
            <bdi>{c.text}</bdi>
          </button>
        )
      })}
    </div>
  )
}

type BlanksState = Omit<QuestionState, 'result'> & {
  result: QuestionState['result'] | 'correct3'
  correct?: { blanks?: string[] }
  marks?: boolean[]
  locked?: (string | null)[]
  attemptsAllowed?: number
}

// A fill-in-the-blanks question in a teaching or practice lesson.
export function BlanksQuestion({ q, state: raw, lessonId, label, uid, trying, onState }: { q: Question; state: QuestionState | undefined; lessonId: string; label: string; uid: string; trying: boolean; onState: (s: QuestionState) => void }) {
  const { t } = useTranslation()
  const state = raw as BlanksState | undefined
  const n = (q.blanks || []).length
  const locked = state?.locked || Array.from({ length: n }, () => null)
  const [values, setValues] = useState<string[]>(() => locked.map((v) => v || ''))
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const finished = !!state?.result
  const made = state?.attempts?.length ?? 0
  const allowed = state?.attemptsAllowed ?? Math.max(2, (q.blanksKind === 'words' ? (q.cards || []).length : n) - 2)
  const last = (state?.attempts?.[made - 1] as string[] | undefined) || null

  // After each attempt: the right blanks stay, the wrong ones are emptied.
  const lockedKey = JSON.stringify(state?.locked || null)
  useEffect(() => {
    setValues((state?.locked || Array.from({ length: n }, () => null)).map((v) => v || ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedKey])

  const set = (i: number, v: string) => {
    if (finished || locked[i]) return
    setValues((vals) => vals.map((x, k) => (k === i ? v : q.blanksKind === 'words' && x === v ? '' : x)))
    setPicked(null)
  }

  async function check() {
    setProblem(null)
    if (values.some((v) => !v.trim())) return setProblem(t('blanks.fillAll'))
    setBusy(true)
    try {
      const r = await httpsCallable<unknown, { state: QuestionState }>(functions, trying ? 'tryAnswer' : 'answer')({ lessonId, questionId: q.id, value: values, ...(trying ? { before: raw } : {}) })
      onState(r.data.state)
    } catch {
      setProblem(t('q.problem.failed'))
    } finally {
      setBusy(false)
    }
  }

  // What each blank shows and its mark.
  const right = state?.result === 'correct1' || state?.result === 'correct2' || state?.result === 'correct3'
  let shown = values
  let marks: Mark[] = locked.map((v) => (v ? 'right' : ''))
  if (finished && last) {
    shown = last
    marks = (state?.marks || []).map((m) => (m ? 'right' : 'wrong'))
  }
  if (!finished && state?.marks && last) marks = marks.map((m, i) => m || (state.marks![i] === false && !values[i] ? 'wrong' : ''))
  const solution = state?.result === 'wrong' ? state.correct?.blanks : null

  return (
    <section className={`block-question${finished ? ' answered' : ''}`} aria-label={label}>
      <span className="block-label">
        <Ui>{label}</Ui>
      </span>
      <BlanksText
        q={q}
        uid={uid}
        values={shown}
        marks={marks}
        disabled={finished ? shown.map(() => true) : locked.map((v) => !!v)}
        picked={picked}
        onChange={set}
        onBlankClick={(i) => (picked ? set(i, picked) : values[i] && set(i, ''))}
      />
      {!finished && (
        <>
          {q.blanksKind === 'words' && (
            <>
              <p className="muted small-note">
                <Ui>{t('blanks.howToWords')}</Ui>
              </p>
              <WordBank q={q} uid={uid} values={values} picked={picked} onPick={setPicked} />
            </>
          )}
          <p className="muted small-note">
            <Ui>{t('drag.attemptsLeft', { count: allowed - made })}</Ui>
          </p>
          {made > 0 && state?.marks && (
            <div className="feedback hint">
              <span className="feedback-title">
                <Ui>{t('blanks.someWrong', { count: state.marks.filter((m) => !m).length })}</Ui>
              </span>
              {state.hint && <Markdown text={state.hint} />}
            </div>
          )}
          <button type="button" className="button primary check-button" disabled={busy} onClick={() => void check()}>
            <Ui>{busy ? t('q.checking') : t('q.check')}</Ui>
          </button>
          {problem && (
            <p className="answer-problem" role="alert">
              <Ui>{problem}</Ui>
            </p>
          )}
        </>
      )}
      {finished && (
        <div className={`feedback ${right ? 'correct' : 'solution'}`}>
          <span className="feedback-title">
            <Ui>{state?.result === 'correct1' ? t('q.correct') : state?.result === 'correct2' ? t('q.correctSecond') : state?.result === 'correct3' ? t('drag.correctLater') : t('q.fullSolution')}</Ui>
          </span>
          {solution && (
            <p className="correct-line">
              <Ui>{t('q.theCorrectAnswer')}</Ui> <bdi>{solution.map((w, i) => `${i + 1}: ${w}`).join(' · ')}</bdi>
            </p>
          )}
          {state?.whyRight && <Markdown text={state.whyRight} />}
          {state?.solution && <Markdown text={state.solution} />}
        </div>
      )}
    </section>
  )
}

// The text of each blank's answer, for showing answers elsewhere (exams, teacher pages).
export function blankAnswerTexts(q: Question, value: unknown): string[] {
  const vals = Array.isArray(value) ? (value as string[]) : []
  return vals.map((v, i) => (q.blanksKind === 'choice' ? q.blanks?.[i]?.options?.find((o) => o.id === v)?.text || '' : q.blanksKind === 'words' ? (q.cards || []).find((c) => c.id === v)?.text || '' : String(v ?? '')))
}

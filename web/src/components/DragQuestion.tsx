import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDownloadURL, ref } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { functions, storage } from '../site'
import { Ui } from '../lesson/Blocks'
import { Markdown } from '../lesson/Rich'
import { shuffle } from '../shuffle'
import type { QuestionState } from '../lesson/answers'
import type { Question } from '../lesson/types'

type DragState = Omit<QuestionState, 'result'> & {
  result: QuestionState['result'] | 'correct3'
  correct?: { cards?: string[] }
  // After each attempt (D-70, changed by Gil): which placed cards were right, the right ones that
  // stay locked on their spots, and how many attempts there are.
  marks?: boolean[]
  locked?: (string | null)[]
  attemptsAllowed?: number
}

// A drag-and-drop question (REQ-4.12, D-70): the student places word cards on spots on an image.
// Cards can be dragged, or clicked and then a spot clicked (which also works with the keyboard).
// After each attempt, right cards get a green outline and stay; wrong ones get a red outline and go
// back to the pile. Attempts: the number of cards minus 2, at least 2. The hint comes after the
// first wrong attempt; when all attempts fail, the solution shows the right card on every spot.
export function DragQuestion({ q, state: rawState, lessonId, label, uid, trying, onState }: { q: Question; state: QuestionState | undefined; lessonId: string; label: string; uid: string; trying: boolean; onState: (s: QuestionState) => void }) {
  const { t } = useTranslation()
  const state = rawState as DragState | undefined
  const spots = q.spots || []
  const cards = shuffle(q.cards || [], `${uid}:${q.id}`)
  const locked = state?.locked || spots.map(() => null)
  const [placed, setPlaced] = useState<(string | null)[]>(() => [...locked])
  const [picked, setPicked] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const finished = !!state?.result
  const attemptsMade = state?.attempts?.length ?? 0
  const allowed = state?.attemptsAllowed ?? Math.max(2, (q.cards || []).length - 2)
  const last = (state?.attempts?.[attemptsMade - 1] as string[] | undefined) || null
  const right = state?.result === 'correct1' || state?.result === 'correct2' || state?.result === 'correct3'
  const rightCards = state?.correct?.cards || (right ? last : null)

  // A new attempt was checked: start again from the locked (right) cards.
  const lockedKey = JSON.stringify(state?.locked || null)
  useEffect(() => {
    setPlaced(state?.locked ? [...state.locked] : spots.map(() => null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedKey])

  useEffect(() => {
    if (!q.image?.storagePath) return
    getDownloadURL(ref(storage, q.image.storagePath)).then(setUrl).catch(() => {})
  }, [q.image?.storagePath])

  const textOf = (id: string | null) => cards.find((c) => c.id === id)?.text || ''
  const put = (spot: number, card: string | null) => {
    if (finished || locked[spot]) return
    if (card && locked.includes(card)) return
    setPlaced((p) => p.map((c, i) => (i === spot ? card : c === card ? null : c)))
    setPicked(null)
  }

  async function check() {
    setProblem(null)
    if (placed.some((c) => !c)) return setProblem(t('drag.fillAll'))
    setBusy(true)
    try {
      const r = await httpsCallable<unknown, { state: QuestionState }>(functions, trying ? 'tryAnswer' : 'answer')({ lessonId, questionId: q.id, value: placed, ...(trying ? { before: rawState } : {}) })
      onState(r.data.state)
    } catch {
      setProblem(t('q.problem.failed'))
    } finally {
      setBusy(false)
    }
  }

  // What each spot shows: when finished, the last attempt (or the right cards when all failed);
  // before that, the locked cards, the student's new cards, and, on spots not filled again yet,
  // the wrong card of the last attempt with its red outline.
  const view = spots.map((_, i) => {
    if (finished) {
      const card = state?.result === 'wrong' && rightCards ? rightCards[i] : last?.[i] ?? null
      const ok = state?.result === 'wrong' ? (last?.[i] === rightCards?.[i] ? true : null) : rightCards ? rightCards[i] === card : null
      return { card, mark: ok === true ? 'right' : ok === false ? 'wrong' : state?.result === 'wrong' ? 'solution' : '', ghost: false }
    }
    if (locked[i]) return { card: locked[i], mark: 'right', ghost: false }
    if (placed[i]) return { card: placed[i], mark: '', ghost: false }
    if (state?.marks && last && state.marks[i] === false) return { card: last[i], mark: 'wrong', ghost: true }
    return { card: null, mark: '', ghost: false }
  })

  return (
    <section className={`block-question${finished ? ' answered' : ''}`}>
      <span className="block-label">
        <Ui>{label}</Ui>
      </span>
      <Markdown text={q.prompt} />
      <div className="drag-board">
        {url ? <img src={url} alt={q.image?.caption || ''} /> : <div className="image-missing">{t('lesson.imageLoading')}</div>}
        {spots.map((sp, i) => {
          const { card, mark, ghost } = view[i]
          const isLocked = !finished && !!locked[i]
          return (
            <button
              key={i}
              type="button"
              className={`drag-spot${card ? ' filled' : ''}${mark ? ` ${mark}` : ''}${ghost ? ' ghost' : ''}${isLocked ? ' locked' : ''}`}
              style={{ left: `${sp.x}%`, top: `${sp.y}%` }}
              aria-label={
                card
                  ? `${t('drag.spotWith', { n: i + 1, card: textOf(card) })}${mark === 'right' ? ` (${t('drag.markRight')})` : mark === 'wrong' ? ` (${t('drag.markWrong')})` : ''}`
                  : t('drag.spotEmpty', { n: i + 1 })
              }
              disabled={finished || isLocked}
              onClick={() => (picked ? put(i, picked) : placed[i] && put(i, null))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                put(i, e.dataTransfer.getData('text/plain'))
              }}
            >
              {card ? (
                <>
                  {mark === 'right' ? '✓ ' : mark === 'wrong' ? '✗ ' : ''}
                  <bdi>{textOf(card)}</bdi>
                </>
              ) : (
                <span className="drag-spot-number">{i + 1}</span>
              )}
            </button>
          )
        })}
      </div>
      {!finished && (
        <>
          <p className="muted small-note">
            <Ui>{t('drag.howTo')}</Ui> <Ui>{t('drag.attemptsLeft', { count: allowed - attemptsMade })}</Ui>
          </p>
          <div className="drag-bank" role="list">
            {cards
              .filter((c) => !locked.includes(c.id))
              .map((c) => {
                const used = placed.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="listitem"
                    className={`drag-card${picked === c.id ? ' picked' : ''}${used ? ' used' : ''}`}
                    draggable={!used}
                    aria-pressed={picked === c.id}
                    disabled={used}
                    onClick={() => setPicked(picked === c.id ? null : c.id)}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                  >
                    <bdi>{c.text}</bdi>
                  </button>
                )
              })}
          </div>
          {attemptsMade > 0 && state?.marks && (
            <div className="feedback hint">
              <span className="feedback-title">
                <Ui>{t('drag.someWrong', { count: state.marks.filter((m) => !m).length })}</Ui>
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
        <div className={`feedback ${state?.result === 'wrong' ? 'solution' : 'correct'}`}>
          <span className="feedback-title">
            <Ui>
              {state?.result === 'correct1'
                ? t('q.correct')
                : state?.result === 'correct2'
                  ? t('q.correctSecond')
                  : state?.result === 'correct3'
                    ? t('drag.correctLater')
                    : t('q.fullSolution')}
            </Ui>
          </span>
          {state?.result === 'wrong' && rightCards && (
            <p className="correct-line">
              <Ui>{t('q.theCorrectAnswer')}</Ui> {rightCards.map((id, i) => `${i + 1}: ${textOf(id)}`).join(' · ')}
            </p>
          )}
          {state?.whyRight && <Markdown text={state.whyRight} />}
          {state?.solution && <Markdown text={state.solution} />}
        </div>
      )}
    </section>
  )
}

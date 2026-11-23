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

type DragState = QuestionState & { correct?: { cards?: string[] } }

// A drag-and-drop question (REQ-4.12, D-70): the student places word cards on spots on an image.
// Cards can be dragged, or clicked and then a spot clicked (which also works with the keyboard).
// Checked like multiple choice: 2 attempts, a hint after the first, then the solution with the
// right card on every spot.
export function DragQuestion({ q, state, lessonId, label, uid, trying, onState }: { q: Question; state: DragState | undefined; lessonId: string; label: string; uid: string; trying: boolean; onState: (s: QuestionState) => void }) {
  const { t } = useTranslation()
  const spots = q.spots || []
  const cards = shuffle(q.cards || [], `${uid}:${q.id}`)
  const [placed, setPlaced] = useState<(string | null)[]>(() => spots.map(() => null))
  const [picked, setPicked] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const finished = !!state?.result
  const last = (state?.attempts?.[state.attempts.length - 1] as string[] | undefined) || null
  const shown = finished && last ? last : placed
  const rightCards = state?.correct?.cards || (state?.result === 'correct1' || state?.result === 'correct2' ? last : null)

  useEffect(() => {
    if (!q.image?.storagePath) return
    getDownloadURL(ref(storage, q.image.storagePath)).then(setUrl).catch(() => {})
  }, [q.image?.storagePath])

  const textOf = (id: string | null) => cards.find((c) => c.id === id)?.text || ''
  const put = (spot: number, card: string | null) => {
    if (finished) return
    setPlaced((p) => p.map((c, i) => (i === spot ? card : c === card ? null : c)))
    setPicked(null)
  }

  async function check() {
    setProblem(null)
    if (placed.some((c) => !c)) return setProblem(t('drag.fillAll'))
    setBusy(true)
    try {
      const r = await httpsCallable<unknown, { state: QuestionState }>(functions, trying ? 'tryAnswer' : 'answer')({ lessonId, questionId: q.id, value: placed, ...(trying ? { before: state } : {}) })
      onState(r.data.state)
    } catch {
      setProblem(t('q.problem.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`block-question${finished ? ' answered' : ''}`}>
      <span className="block-label">
        <Ui>{label}</Ui>
      </span>
      <Markdown text={q.prompt} />
      <div className="drag-board">
        {url ? <img src={url} alt={q.image?.caption || ''} /> : <div className="image-missing">{t('lesson.imageLoading')}</div>}
        {spots.map((sp, i) => {
          const card = shown[i]
          const ok = rightCards ? rightCards[i] === card : null
          return (
            <button
              key={i}
              type="button"
              className={`drag-spot${card ? ' filled' : ''}${ok === true ? ' right' : ok === false ? ' wrong' : ''}`}
              style={{ left: `${sp.x}%`, top: `${sp.y}%` }}
              aria-label={card ? t('drag.spotWith', { n: i + 1, card: textOf(card) }) : t('drag.spotEmpty', { n: i + 1 })}
              disabled={finished}
              onClick={() => (picked ? put(i, picked) : card && put(i, null))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                put(i, e.dataTransfer.getData('text/plain'))
              }}
            >
              {card ? (
                <>
                  {ok === true ? '✓ ' : ok === false ? '✗ ' : ''}
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
            <Ui>{t('drag.howTo')}</Ui>
          </p>
          <div className="drag-bank" role="list">
            {cards.map((c) => {
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
          {state?.hint && (state.attempts?.length ?? 0) === 1 && (
            <div className="feedback hint">
              <span className="feedback-title">
                <Ui>{t('q.tryAgain')}</Ui>
              </span>
              <Markdown text={state.hint} />
            </div>
          )}
          <button type="button" className="button primary check-button" disabled={busy} onClick={() => void check()}>
            <Ui>{busy ? t('q.checking') : t('q.check')}</Ui>
          </button>
          {problem && (
            <p className="answer-problem">
              <Ui>{problem}</Ui>
            </p>
          )}
        </>
      )}
      {finished && (
        <div className={`feedback ${state?.result === 'wrong' ? 'solution' : 'correct'}`}>
          <span className="feedback-title">
            <Ui>{state?.result === 'correct1' ? t('q.correct') : state?.result === 'correct2' ? t('q.correctSecond') : t('q.fullSolution')}</Ui>
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

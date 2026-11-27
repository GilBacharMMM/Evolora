import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../site'
import { Markdown } from '../lesson/Rich'
import { Ui } from '../lesson/Blocks'
import type { LessonVersion, Question } from '../lesson/types'

// What is removed for a class in one lesson (REQ-5.36, D-92), as the checking service tells the teacher.
export interface RemovalInfo {
  questions: string[]
  checkAgain: Record<string, string[]>
  minimum: number
  minimumByTopic: Record<string, number>
  answered: Record<string, number>
  checkAgainBank: Record<string, { id: string; prompt: string }[]>
  locked: boolean
}

const call = <T,>(name: string, data: unknown) => httpsCallable<unknown, T>(functions, name)(data).then((r) => r.data)

// Loads what is removed for the class, and changes it. Nothing happens without a class.
export function useRemovals(classId: string | null, lessonId: string) {
  const { t } = useTranslation()
  const [info, setInfo] = useState<RemovalInfo | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!classId) return
    let live = true
    call<RemovalInfo>('removalInfo', { classId, lessonId })
      .then((r) => live && setInfo(r))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [classId, lessonId])
  const set = useCallback(
    async (questionId: string, checkAgainId: string | null, removed: boolean) => {
      if (!classId) return
      setBusy(true)
      try {
        setInfo(await call<RemovalInfo>('setRemoval', { classId, lessonId, questionId, checkAgainId, removed }))
      } catch {
        window.alert(t('removal.failed'))
      } finally {
        setBusy(false)
      }
    },
    [classId, lessonId, t],
  )
  return { info, busy, set }
}

// The teacher's controls on one question: "Remove from the class", and the question's replacement
// (check-again) questions, each removable on its own. Asks to confirm when students already answered
// the question, when no replacement question would be left, and when the topic would have no question left.
export function RemovalControls({
  q,
  lesson,
  info,
  busy,
  onChange,
}: {
  q: Question
  lesson: LessonVersion
  info: RemovalInfo
  busy: boolean
  onChange: (checkAgainId: string | null, removed: boolean) => void
}) {
  const { t } = useTranslation()
  const removed = info.questions.includes(q.id)
  const bank = info.checkAgainBank[q.id] || []
  const removedReplacements = new Set(info.checkAgain[q.id] || [])
  const disabled = busy || info.locked

  const toggleQuestion = (remove: boolean) => {
    if (remove) {
      const answered = info.answered[q.id] || 0
      if (answered > 0 && !window.confirm(t('removal.confirmAnswered', { count: answered }))) return
      const topic = lesson.topics.find((tp) => tp.blocks.some((b) => b.type === 'question' && b.id === q.id))
      const othersLeft = topic?.blocks.some((b) => b.type === 'question' && b.id !== q.id && !info.questions.includes(b.id))
      if (!othersLeft && !window.confirm(t('removal.confirmEmptyTopic'))) return
    }
    onChange(null, remove)
  }
  const toggleReplacement = (id: string, remove: boolean) => {
    if (remove && bank.filter((c) => c.id !== id && !removedReplacements.has(c.id)).length === 0 && !window.confirm(t('removal.confirmLastReplacement'))) return
    onChange(id, remove)
  }

  return (
    <div className="removal-controls">
      {info.locked && (
        <p className="removal-note" role="note">
          <Ui>{t('removal.examLocked')}</Ui>
        </p>
      )}
      <label className="removal-check">
        <input type="checkbox" checked={removed} disabled={disabled} onChange={(e) => toggleQuestion(e.target.checked)} />
        <Ui>{t('removal.removeFromClass')}</Ui>
      </label>
      {removed && <span className="course-chip">{t('removal.removedChip')}</span>}
      {bank.length > 0 && (
        <details className="removal-replacements">
          <summary>
            <Ui>{t('removal.replacements', { count: bank.length - (removed ? 0 : removedReplacements.size) })}</Ui>
          </summary>
          <ul>
            {bank.map((c) => (
              <li key={c.id}>
                <label className="removal-check">
                  {/* A removed question takes its replacement questions with it (REQ-5.36). */}
                  <input type="checkbox" checked={removed || removedReplacements.has(c.id)} disabled={disabled || removed} onChange={(e) => toggleReplacement(c.id, e.target.checked)} />
                  <Markdown text={c.prompt} inline />
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

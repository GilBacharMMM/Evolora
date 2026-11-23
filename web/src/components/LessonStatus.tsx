import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../router'
import type { Status, WorkLesson } from '../classwork'
import { TypeChip } from './TypeChip'

// A lesson's status, always with an icon and a word, never only a colour (REQ-6.12, 12.3).
export function StatusIcon({ status }: { status: Status }) {
  if (status === 'done') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    )
  }
  if (status === 'locked') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" stroke="none" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="flip-rtl">
      <path d="M7 4l12 8-12 8z" fill="currentColor" />
    </svg>
  )
}

export function StatusWord({ status }: { status: Status }) {
  const { t } = useTranslation()
  return (
    <span className={`status-word status-${status}`}>
      <StatusIcon status={status} />
      <span>{t(`status.${status}`)}</span>
    </span>
  )
}

// One lesson in a course or class page. Locked lessons show their title greyed out and can't be opened.
export function WorkRow({ lesson, note }: { lesson: WorkLesson; note?: ReactNode }) {
  const { t } = useTranslation()
  const locked = lesson.status === 'locked'
  return (
    <button
      type="button"
      className={`lesson-row work-row status-row-${lesson.status}${lesson.notes ? ' has-notes' : ''}`}
      disabled={locked}
      aria-disabled={locked}
      title={locked ? (lesson.lockedByNotes ? t('status.lockedByNotes') : t('status.lockedExplain')) : undefined}
      onClick={() => !locked && navigate(`/lesson/${lesson.lessonId}`)}
    >
      <span className="lesson-row-icon" aria-hidden="true">
        <StatusIcon status={lesson.status} />
      </span>
      <span className="lesson-row-text">
        <TypeChip type={lesson.type} />
        <span className="lesson-row-title" dir="auto">
          {lesson.title}
        </span>
        {lesson.notes && <span className="notes-chip">{lesson.notes === 'review' ? t('status.notesReview') : t('status.notesCorrections')}</span>}
        {lesson.grade && (
          <span className="row-grade">{lesson.grade.pending ? t('status.gradePending') : lesson.grade.percent != null ? t('status.grade', { percent: lesson.grade.percent }) : null}</span>
        )}
        {note && (
          <span className="muted row-note">
            {note}
          </span>
        )}
      </span>
      <StatusWord status={lesson.notes ? 'open' : lesson.status} />
    </button>
  )
}

// Percentage done with a progress bar (REQ-6.4).
export function ProgressBar({ percent, done, total }: { percent: number; done: number; total: number }) {
  const { t } = useTranslation()
  return (
    <div className="progress">
      <div className="progress-text">
        <strong>{t('cls.percentDone', { percent })}</strong>
        <span className="muted">{t('cls.lessonsDone', { done, total })}</span>
      </div>
      <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t('cls.percentDone', { percent })}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

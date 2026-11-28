import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../site'
import { BackButton } from '../components/BackButton'
import { navigate } from '../router'

export interface CommentRow {
  id: string
  lessonId: string
  lessonTitle: string
  version: number
  topicNumber: number | null
  place: string | null
  quote: string
  text: string
  byName: string
  status: 'new' | 'done' | 'notTaken'
  at: number | null
}

const call = <T,>(name: string, data: unknown = {}) => httpsCallable<unknown, T>(functions, name)(data).then((r) => r.data)

// Teachers' comments on lessons (REQ-4.27, D-93).
// mode 'inbox': the system admin's comments inbox: every comment, newest first, each marked
// "done" or "not taken"; clicking one opens the lesson at its place.
// mode 'mine': the comments a teacher sent, with the admin's mark.
export function Comments({ mode }: { mode: 'inbox' | 'mine' }) {
  const { t, i18n } = useTranslation()
  const [rows, setRows] = useState<CommentRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<'all' | 'new'>('all')

  useEffect(() => {
    let live = true
    call<{ comments: CommentRow[] }>(mode === 'inbox' ? 'commentsInbox' : 'myComments')
      .then((r) => live && setRows(r.comments))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [mode])

  const mark = async (id: string, status: CommentRow['status']) => {
    setRows((r) => r && r.map((c) => (c.id === id ? { ...c, status } : c)))
    await call('setCommentStatus', { id, status }).catch(() => setFailed(true))
  }
  const when = (at: number | null) => (at ? new Date(at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }) : '')
  const open = (c: CommentRow) => navigate(`/lesson/${c.lessonId}${c.place ? `#place-${encodeURIComponent(c.place)}` : ''}`)
  const shown = rows?.filter((c) => filter === 'all' || c.status === 'new') || []

  return (
    <main className="page narrow">
      <BackButton />
      <h1 className="page-title">{mode === 'inbox' ? t('comments.inboxTitle') : t('comments.mineTitle')}</h1>
      <p className="muted">{mode === 'inbox' ? t('comments.inboxIntro') : t('comments.mineIntro')}</p>
      {failed && (
        <p className="form-error" role="alert">
          {t('comments.loadFailed')}
        </p>
      )}
      {rows === null && !failed && <p className="loading">{t('common.loading')}</p>}
      {rows && mode === 'inbox' && rows.length > 0 && (
        <div className="comment-filter" role="group" aria-label={t('comments.inboxTitle')}>
          <button type="button" className={`button small ${filter === 'all' ? 'primary' : 'secondary'}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            {t('comments.all')} ({rows.length})
          </button>
          <button type="button" className={`button small ${filter === 'new' ? 'primary' : 'secondary'}`} aria-pressed={filter === 'new'} onClick={() => setFilter('new')}>
            {t('comments.onlyNew')} ({rows.filter((c) => c.status === 'new').length})
          </button>
        </div>
      )}
      {rows && rows.length === 0 && <p className="card message-card">{mode === 'inbox' ? t('comments.noneInbox') : t('comments.noneMine')}</p>}
      <ul className="comment-list">
        {shown.map((c) => (
          <li key={c.id} id={c.id} className={`card comment-item status-${c.status}`}>
            <div className="comment-head">
              <button type="button" className="link-button comment-lesson" dir="auto" onClick={() => open(c)}>
                {c.lessonTitle}
              </button>
              <span className={`comment-status status-${c.status}`}>{t(`comments.status.${c.status}`)}</span>
            </div>
            <p className="muted small-note">
              {mode === 'inbox' && <bdi>{c.byName}</bdi>}
              {mode === 'inbox' && ' · '}
              {when(c.at)}
              {c.topicNumber ? ` · ${t('comments.topic', { number: c.topicNumber })}` : ''}
            </p>
            <blockquote className="comment-quote" dir="auto">
              {c.quote}
            </blockquote>
            <p className="comment-text" dir="auto">
              {c.text}
            </p>
            {mode === 'inbox' && (
              <div className="comment-actions">
                <button type="button" className="button small secondary" onClick={() => open(c)}>
                  {t('comments.openLesson')}
                </button>
                <button type="button" className={`button small ${c.status === 'done' ? 'primary' : 'secondary'}`} aria-pressed={c.status === 'done'} onClick={() => mark(c.id, c.status === 'done' ? 'new' : 'done')}>
                  {t('comments.status.done')}
                </button>
                <button type="button" className={`button small ${c.status === 'notTaken' ? 'primary' : 'secondary'}`} aria-pressed={c.status === 'notTaken'} onClick={() => mark(c.id, c.status === 'notTaken' ? 'new' : 'notTaken')}>
                  {t('comments.status.notTaken')}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}

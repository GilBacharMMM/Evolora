import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../site'
import { useDraft } from '../drafts'

interface Message {
  id: string
  from: 'student' | 'teacher'
  byName: string
  text: string
  at: Timestamp | null
}

// One private conversation between a student and the teachers of a class (REQ-5.16, 10.2).
// Teachers pass the student's id; students their own. Opening it marks new messages as read.
export function Messages({ classId, studentId, asTeacher }: { classId: string; studentId: string; asTeacher: boolean }) {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState<Message[] | null>(null)
  // A half-written message is kept as a draft (REQ-3.5).
  const [text, setText, clearText] = useDraft(`message.${classId}.${studentId}`)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query(collection(db, 'conversations', `${classId}__${studentId}`, 'messages'), orderBy('at'))
    return onSnapshot(
      q,
      (s) => setMessages(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }))),
      () => setMessages([]),
    )
  }, [classId, studentId])

  // Seen: the other side's messages are now read.
  const last = messages?.[messages.length - 1]
  useEffect(() => {
    if (!last) return
    if ((asTeacher && last.from === 'student') || (!asTeacher && last.from === 'teacher')) {
      void httpsCallable(functions, 'markRead')(asTeacher ? { classId, studentId } : { classId }).catch(() => {})
    }
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [last, asTeacher, classId, studentId])

  const when = (at: Timestamp | null) => (at ? at.toDate().toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

  return (
    <section className="card list-card-padded messages" aria-labelledby={`messages-${studentId}`}>
      <h2 id={`messages-${studentId}`} className="section-title">
        {asTeacher ? t('messages.titleTeacher') : t('messages.titleStudent')}
      </h2>
      <p className="muted small-note">{asTeacher ? t('messages.explainTeacher') : t('messages.explainStudent')}</p>
      <div className="message-list" aria-live="polite">
        {messages?.length === 0 && <p className="muted">{t('messages.none')}</p>}
        {messages?.map((m) => {
          const mine = (m.from === 'teacher') === asTeacher
          return (
            <div key={m.id} className={`message ${mine ? 'mine' : 'theirs'}`}>
              <span className="message-meta">
                <bdi>{m.byName}</bdi> · {when(m.at)}
              </span>
              <p dir="auto">{m.text}</p>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      <form
        className="comment-box"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!text.trim()) return
          setBusy(true)
          setFailed(false)
          try {
            await httpsCallable(functions, 'sendMessage')({ classId, text, ...(asTeacher ? { studentId } : {}) })
            clearText()
          } catch {
            setFailed(true)
          } finally {
            setBusy(false)
          }
        }}
      >
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} dir="auto" maxLength={5000} aria-label={t('messages.write')} placeholder={t('messages.write')} />
        <button type="submit" className="button primary" disabled={busy || !text.trim()}>
          {t('messages.send')}
        </button>
        {failed && <p className="notice" role="alert">{t('teacher.actionFailed')}</p>}
      </form>
    </section>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../site'
import { Ui } from '../lesson/Blocks'

interface Marked {
  quote: string
  place: string | null
  topicNumber: number | null
  // Where to show the button: just under the marked words, in page coordinates.
  top: number
  left: number
}

// Teachers' comments on a lesson (REQ-4.27, D-93). When a teacher marks words in the lesson (with
// the mouse, or a finger on a touch screen), a small button appears under them; it, or Ctrl+Alt+M,
// opens a window to write a comment, which is sent to the system admin. Each block of the lesson
// carries data-place and data-topic, so the comment records where it is.
export function CommentTool({ lessonId, version, containerRef }: { lessonId: string; version: number | null; containerRef: React.RefObject<HTMLElement | null> }) {
  const { t } = useTranslation()
  const [marked, setMarked] = useState<Marked | null>(null)
  const [open, setOpen] = useState<Marked | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [failed, setFailed] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)

  // What is marked inside the lesson, if anything.
  const readSelection = useCallback((): Marked | null => {
    const sel = window.getSelection()
    const root = containerRef.current
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !root) return null
    const quote = sel.toString().replace(/\s+/g, ' ').trim()
    if (!quote) return null
    const range = sel.getRangeAt(0)
    const start = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement
    if (!start || !root.contains(start) || start.closest('.comment-dialog, .removal-controls, .try-banner, input, textarea')) return null
    const placeEl = start.closest('[data-place]') as HTMLElement | null
    const rect = range.getBoundingClientRect()
    return {
      quote: quote.slice(0, 1000),
      place: placeEl?.dataset.place || null,
      topicNumber: placeEl?.dataset.topic ? Number(placeEl.dataset.topic) : null,
      top: rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX + rect.width / 2,
    }
  }, [containerRef])

  useEffect(() => {
    let timer: number | undefined
    const update = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMarked(readSelection()), 150)
    }
    // Ctrl+Alt+M opens the comment window for the marked words (the shortcut Google Docs uses).
    const key = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')) {
        const m = readSelection()
        if (m) {
          e.preventDefault()
          setOpen(m)
        }
      }
    }
    document.addEventListener('selectionchange', update)
    document.addEventListener('keydown', key)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('selectionchange', update)
      document.removeEventListener('keydown', key)
    }
  }, [readSelection])

  useEffect(() => {
    if (open) {
      setText('')
      setFailed(false)
      setTimeout(() => box.current?.focus(), 0)
    }
  }, [open])

  const send = async () => {
    if (!open || !text.trim()) return
    setSending(true)
    setFailed(false)
    try {
      await httpsCallable(functions, 'sendComment')({ lessonId, version, topicNumber: open.topicNumber, place: open.place, quote: open.quote, text: text.trim() })
      setOpen(null)
      setMarked(null)
      window.getSelection()?.removeAllRanges()
      setSent(true)
      window.setTimeout(() => setSent(false), 4000)
    } catch {
      setFailed(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {marked && !open && (
        <button
          type="button"
          className="comment-button"
          style={{ top: marked.top, left: marked.left }}
          // Keep the marked words marked while pressing the button.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen(marked)}
          title="Ctrl+Alt+M"
        >
          💬 <Ui>{t('comments.button')}</Ui>
        </button>
      )}
      {open && (
        <div className="comment-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !sending && setOpen(null)}>
          <div className="comment-dialog card" role="dialog" aria-modal="true" aria-labelledby="comment-title" onKeyDown={(e) => e.key === 'Escape' && !sending && setOpen(null)}>
            <h2 id="comment-title" className="section-title">
              {t('comments.title')}
            </h2>
            <blockquote className="comment-quote" dir="auto">
              {open.quote}
            </blockquote>
            <label className="comment-label" htmlFor="comment-text">
              {t('comments.yourComment')}
            </label>
            <textarea id="comment-text" ref={box} dir="auto" rows={5} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('comments.placeholder')} />
            <p className="muted small-note">{t('comments.noStudents')}</p>
            {failed && (
              <p className="form-error" role="alert">
                {t('comments.failed')}
              </p>
            )}
            <div className="comment-actions">
              <button type="button" className="button primary" disabled={sending || !text.trim()} onClick={send}>
                {t('comments.send')}
              </button>
              <button type="button" className="button secondary" disabled={sending} onClick={() => setOpen(null)}>
                {t('comments.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      {sent && (
        <div className="comment-toast" role="status">
          {t('comments.sent')}
        </div>
      )}
    </>
  )
}

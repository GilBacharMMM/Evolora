import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { backspace, deleteForward, deleteRange, insertText, lettersOf, lettersOfSegments, readMarkupV2, saveMarkup, segmentsFor, toggleHighlight, type Letter } from '../markup'

// Marking up a written answer in place (REQ-5.12, D-64 as changed by Gil): the student's answer on
// the grading page is the place to mark, as with "track changes" in Word. Deleted letters stay,
// crossed out; typed letters appear purple and underlined; selecting text shows a "Highlight"
// button; Ctrl+Z undoes the last change and "Undo all changes" brings back the original. Changes are
// kept letter by letter. `value` is the saved mark-up ('' when there is none).
export function TrackChangesBox({ original, value, onChange }: { original: string; value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const start = (): Letter[] => {
    if (!value) return lettersOf(original)
    return lettersOfSegments(readMarkupV2(value) ?? segmentsFor(original, value))
  }
  const [letters, setLetters] = useState<Letter[]>(start)
  const history = useRef<Letter[][]>([])
  const caretAfter = useRef<number | null>(null)
  const [tool, setTool] = useState<{ x: number; y: number; a: number; b: number } | null>(null)

  // Draw the letters as runs of the same kind; each letter is one character of text, so a place in
  // the text is the same number as a place in `letters`.
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.replaceChildren()
    let run: HTMLElement | null = null
    let key = ''
    for (const l of letters) {
      const k = `${l.kind}${l.hl ? 'h' : ''}`
      if (!run || k !== key) {
        run = document.createElement(l.kind === 'removed' ? 'del' : l.kind === 'added' ? 'ins' : 'span')
        run.className = [l.kind === 'removed' ? 'mark-removed' : l.kind === 'added' ? 'mark-added' : '', l.hl ? 'mark-highlight' : ''].filter(Boolean).join(' ')
        el.appendChild(run)
        key = k
      }
      run.textContent += l.ch
    }
    if (caretAfter.current !== null) {
      placeCaret(el, caretAfter.current)
      caretAfter.current = null
    }
  }, [letters])

  // If the saved mark-up changes from outside (another student or question), start again from it.
  const lastSaved = useRef(value)
  useEffect(() => {
    if (value === lastSaved.current) return
    lastSaved.current = value
    history.current = []
    setLetters(start())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, original])

  const apply = (next: Letter[], caret: number | null) => {
    history.current.push(letters)
    if (history.current.length > 200) history.current.shift()
    caretAfter.current = caret
    setLetters(next)
    const saved = saveMarkup(next)
    lastSaved.current = saved
    onChange(saved)
  }

  const selection = (): { a: number; b: number } | null => {
    const el = box.current
    const sel = window.getSelection()
    if (!el || !sel || !sel.rangeCount) return null
    const r = sel.getRangeAt(0)
    if (!el.contains(r.startContainer) || !el.contains(r.endContainer)) return null
    return { a: offsetOf(el, r.startContainer, r.startOffset), b: offsetOf(el, r.endContainer, r.endOffset) }
  }

  const onBeforeInput = (e: InputEvent) => {
    const s = selection()
    e.preventDefault()
    if (!s) return
    const { a, b } = s
    const type = e.inputType
    if (type === 'insertText' || type === 'insertReplacementText' || type === 'insertFromPaste' || type === 'insertFromDrop' || type === 'insertParagraph' || type === 'insertLineBreak') {
      const text = type === 'insertParagraph' || type === 'insertLineBreak' ? '\n' : e.data ?? e.dataTransfer?.getData('text/plain') ?? ''
      if (!text) return
      const r = insertText(letters, a, b, text.replace(/\r\n?/g, '\n'))
      apply(r.letters, r.caret)
    } else if (type.startsWith('delete')) {
      if (a !== b) {
        const r = deleteRange(letters, a, b)
        apply(r.letters, type === 'deleteContentForward' ? r.caret : a)
      } else if (type.includes('Backward')) {
        const r = backspace(letters, a)
        if (r.letters !== letters) apply(r.letters, r.caret)
      } else {
        const r = deleteForward(letters, a)
        if (r.letters !== letters) apply(r.letters, r.caret)
      }
    } else if (type === 'historyUndo') {
      undo()
    }
    // Bold, italics and other formatting are ignored.
  }

  const undo = () => {
    const prev = history.current.pop()
    if (!prev) return
    setLetters(prev)
    const saved = saveMarkup(prev)
    lastSaved.current = saved
    onChange(saved)
  }

  // React's own onBeforeInput doesn't tell the kind of change, so the browser's event is used.
  const handler = useRef(onBeforeInput)
  handler.current = onBeforeInput
  useEffect(() => {
    const el = box.current
    if (!el) return
    const h = (e: Event) => handler.current(e as InputEvent)
    el.addEventListener('beforeinput', h)
    return () => el.removeEventListener('beforeinput', h)
  }, [])

  // The floating "Highlight" button, next to selected text.
  useEffect(() => {
    const update = () => {
      const s = selection()
      const sel = window.getSelection()
      if (!s || s.a === s.b || !sel || !wrap.current) return setTool(null)
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      const base = wrap.current.getBoundingClientRect()
      setTool({ x: rect.left - base.left + rect.width / 2, y: rect.top - base.top, a: Math.min(s.a, s.b), b: Math.max(s.a, s.b) })
    }
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changedNow = !!saveMarkup(letters)
  return (
    <div className="track-wrap" ref={wrap}>
      <div
        ref={box}
        className="track-box marked-answer"
        contentEditable
        suppressContentEditableWarning
        dir="auto"
        role="textbox"
        aria-multiline="true"
        aria-label={t('markup.inPlaceLabel')}
        spellCheck={false}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault()
            undo()
          }
        }}
        onDrop={(e) => e.preventDefault()}
      />
      {tool && (
        <button
          type="button"
          className="highlight-tool"
          style={{ left: tool.x, top: tool.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            apply(toggleHighlight(letters, tool.a, tool.b), null)
            setTool(null)
          }}
        >
          {t('markup.highlight')}
        </button>
      )}
      <div className="track-bar">
        <span className="muted small-note">{t('markup.inPlaceHelp')}</span>
        <button type="button" className="link-button" disabled={!changedNow} onClick={() => apply(lettersOf(original), null)}>
          {t('markup.undoAll')}
        </button>
      </div>
    </div>
  )
}

// The place in the text (counting letters) of a DOM position inside the box.
function offsetOf(root: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange()
  range.selectNodeContents(root)
  range.setEnd(node, offset)
  return range.toString().length
}

function placeCaret(root: HTMLElement, at: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let left = at
  let node = walker.nextNode() as Text | null
  let last: Text | null = null
  while (node) {
    if (left <= node.data.length) break
    left -= node.data.length
    last = node
    node = walker.nextNode() as Text | null
  }
  const sel = window.getSelection()
  if (!sel) return
  const r = document.createRange()
  if (node) r.setStart(node, left)
  else if (last) r.setStart(last, last.data.length)
  else r.setStart(root, 0)
  r.collapse(true)
  sel.removeAllRanges()
  sel.addRange(r)
  root.focus()
}

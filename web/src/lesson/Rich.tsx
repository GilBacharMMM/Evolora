import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { convertLatexToMarkup } from 'mathlive/ssr'
import 'mathlive/fonts.css'
import 'mathlive/static.css'

// Links in lessons open in a new tab, so the student doesn't lose their place.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

marked.setOptions({ gfm: true, breaks: false })

// Formulas written inside a sentence, such as "P = π × D = 3.14 × 6 = 18.84", always read
// left-to-right, even inside a Hebrew or Arabic sentence (REQ-4.3, 9.3). Each run of math
// (Latin letters, digits, π and math signs, with at least one sign like = × ÷ ≈ or a power)
// is wrapped in a left-to-right island, so it doesn't break the sentence around it.
const MATH_RUN = /[A-Za-z0-9π(][A-Za-z0-9π²³⅐.,()\s×÷·+\-−=≈/<>≤≥]*[A-Za-z0-9π²³)]/g
const MATH_SIGN = /[=×÷≈·²³≤≥]|\d\s*[+\-−]\s*\d/

function wrapMathRuns(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const texts: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parent = (n as Text).parentElement
    if (parent && parent.closest('a, code, .math-run')) continue
    texts.push(n as Text)
  }
  for (const node of texts) {
    const text = node.data
    const parts: (string | HTMLElement)[] = []
    let last = 0
    for (const m of text.matchAll(MATH_RUN)) {
      if (!MATH_SIGN.test(m[0])) continue
      parts.push(text.slice(last, m.index))
      const span = document.createElement('span')
      span.className = 'math-run'
      span.dir = 'ltr'
      span.textContent = m[0]
      parts.push(span)
      last = (m.index ?? 0) + m[0].length
    }
    if (last === 0) continue
    parts.push(text.slice(last))
    node.replaceWith(...parts.filter((p) => p !== ''))
  }
  // A result written in bold right after the formula ("= **18.84** ס"מ") belongs to it.
  for (const span of (root as ParentNode).querySelectorAll('.math-run')) {
    const after = span.nextSibling
    const bold = after?.nextSibling
    if (after?.nodeType !== Node.TEXT_NODE || !bold || !(bold instanceof HTMLElement)) continue
    if (!/^\s*[=≈×÷+\-−]\s*$/.test((after as Text).data)) continue
    if (!['STRONG', 'B', 'EM'].includes(bold.tagName) || !/^\s*[0-9A-Za-zπ]/.test(bold.textContent || '')) continue
    span.append(after, bold)
  }
}

// Gil, D-53: a formula (with = or ≈) inside a Hebrew or Arabic sentence is shown on a line of
// its own, so the two directions are never mixed on one line (REQ-4.3). Not in table cells or
// in one-line places like answer choices. A full stop or comma right after it is dropped.
const RTL_LETTERS = /[֐-׿؀-ۿ]/
const FULL_FORMULA = /[=≈]/

function formulasOnTheirOwnLine(root: ParentNode) {
  for (const span of root.querySelectorAll('.math-run')) {
    if (!FULL_FORMULA.test(span.textContent || '')) continue
    const block = span.parentElement?.closest('p, li, div, blockquote, h1, h2, h3, h4') || null
    if (span.closest('td, th')) continue
    const blockText = block ? block.textContent || '' : ''
    if (!RTL_LETTERS.test(blockText.replace(span.textContent || '', ''))) continue
    // Find the outermost inline element holding the formula (for example, a bold part).
    let line: Element = span
    while (line.parentElement && line.parentElement !== block && ['STRONG', 'B', 'EM', 'I'].includes(line.parentElement.tagName)) line = line.parentElement
    const before = line.previousSibling
    const after = line.nextSibling
    // Gil: the unit is not part of the formula line. "… = 18.84 ס"מ." becomes the formula
    // ending in 18.84, and under it "כלומר 18.84 ס"מ." in Hebrew.
    const result = unitAfterFormula(span, after)
    if (result) {
      const said = document.createElement('span')
      said.className = 'math-result'
      said.append('כלומר ')
      const value = document.createElement(result.bold ? 'strong' : 'span')
      value.append(Object.assign(document.createElement('bdi'), { textContent: result.number }), ` ${result.unit}`)
      said.append(value, '.')
      line.after(said)
      if (after && after.nodeType === Node.TEXT_NODE && result.rest !== null) (after as Text).data = result.rest
      said.before(document.createElement('br'))
    }
    // A full stop or comma right after the formula is dropped.
    const next = (result ? line.nextSibling?.nextSibling?.nextSibling : line.nextSibling) || null
    if (next && next.nodeType === Node.TEXT_NODE) (next as Text).data = (next as Text).data.replace(/^\s*[.,;]?\s*/, '')
    const lastOfLine = result ? line.nextSibling?.nextSibling || null : null
    const hasBefore = before && (before.textContent || '').trim() !== ''
    const tail = result ? lastOfLine?.nextSibling : line.nextSibling
    const hasAfter = tail && (tail.textContent || '').trim() !== ''
    if (hasBefore) line.before(document.createElement('br'))
    if (hasAfter) (lastOfLine || line).after(document.createElement('br'))
    span.classList.add('math-line')
  }
}

// Finds a Hebrew or Arabic unit written right after the formula's final number, either inside
// a bold result ("= **7 ס"מ**") or as plain text ("= 18.84 ס"מ"). Removes it from the formula.
// Returns the number, the unit, whether it was bold, and the text left after the unit.
// A unit is a short abbreviation (ס"מ, סמ"ק, מ"ר, ק"מ) or a unit word, at most two words.
const UNIT_WORDS = new Set(['מטר', 'מטרים', 'סנטימטר', 'סנטימטרים', 'מילימטר', 'קילומטר', 'גרם', 'קילוגרם', 'ק"ג', 'ליטר', 'ליטרים', 'אמה', 'אמות', 'שניות', 'דקות', 'שעות', 'מעלות', 'לסמ"ק', 'למ"ק', 'לליטר', 'לשנייה', 'לשעה'])
const isUnitWord = (w: string) => UNIT_WORDS.has(w) || /^[֐-׿؀-ۿ]+["״׳'][֐-׿؀-ۿ]*$/.test(w)
function readUnit(text: string): { unit: string; rest: string } | null {
  const m = text.match(/^\s+(\S+?)(?=[\s.,;:!?)]|$)(?:\s+(\S+?)(?=[\s.,;:!?)]|$))?/)
  if (!m || !isUnitWord(m[1])) return null
  const two = m[2] && isUnitWord(m[2])
  const unit = two ? `${m[1]} ${m[2]}` : m[1]
  const used = two ? m[0] : text.match(/^\s+\S+?(?=[\s.,;:!?)]|$)/)![0]
  return { unit, rest: text.slice(used.length).replace(/^\s*[.,;]?\s*/, '') }
}
function unitAfterFormula(span: Element, after: ChildNode | null): { number: string; unit: string; bold: boolean; rest: string | null } | null {
  const bold = span.querySelector('strong, b')
  if (bold && span.lastElementChild === bold) {
    const m = (bold.textContent || '').match(/^\s*([0-9][0-9.,]*)\s+(\S.*?)\s*$/)
    if (!m || !m[2].split(/\s+/).every(isUnitWord)) return null
    bold.textContent = m[1]
    return { number: m[1], unit: m[2], bold: true, rest: null }
  }
  const text = span.textContent || ''
  const num = text.match(/([0-9][0-9.,]*)\s*$/)
  if (!num || !after || after.nodeType !== Node.TEXT_NODE) return null
  const u = readUnit((after as Text).data)
  if (!u) return null
  return { number: num[1], unit: u.unit, bold: false, rest: u.rest }
}

function toHtml(markdown: string, inline = false): string {
  const html = inline ? (marked.parseInline(markdown) as string) : (marked.parse(markdown) as string)
  const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true })
  wrapMathRuns(fragment)
  if (!inline) formulasOnTheirOwnLine(fragment)
  const box = document.createElement('div')
  box.appendChild(fragment)
  return box.innerHTML
}

// Lesson text with headings, bold, lists, links and tables (REQ-4.2).
export function Markdown({ text, inline = false, className }: { text: string; inline?: boolean; className?: string }) {
  const html = useMemo(() => toHtml(text, inline), [text, inline])
  if (inline) return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  return <div className={className ? `md ${className}` : 'md'} dangerouslySetInnerHTML={{ __html: html }} />
}

// A formula, written in LaTeX, always shown left-to-right (REQ-4.3, system-design 2.4).
export function Formula({ latex }: { latex: string }) {
  const html = useMemo(() => {
    try {
      return DOMPurify.sanitize(convertLatexToMarkup(latex))
    } catch {
      return DOMPurify.sanitize(latex)
    }
  }, [latex])
  return <span className="formula" dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
}

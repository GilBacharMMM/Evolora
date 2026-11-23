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

function toHtml(markdown: string, inline = false): string {
  const html = inline ? (marked.parseInline(markdown) as string) : (marked.parse(markdown) as string)
  const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true })
  wrapMathRuns(fragment)
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

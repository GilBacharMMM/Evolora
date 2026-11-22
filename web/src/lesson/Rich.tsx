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

function toHtml(markdown: string, inline = false): string {
  const html = inline ? (marked.parseInline(markdown) as string) : (marked.parse(markdown) as string)
  return DOMPurify.sanitize(html)
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

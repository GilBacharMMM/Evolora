// Marking up a written answer (REQ-5.12, D-64): the teacher edits a copy of the student's answer
// and may highlight parts of it by putting them between ⟦ and ⟧. The student sees their own words,
// crossed out where the teacher changed them, the teacher's words in the teacher's colour, and the
// highlights. Pure rules with no imports, tested in functions/markup.test.js.

export const HIGHLIGHT_START = '⟦'
export const HIGHLIGHT_END = '⟧'

export interface Segment {
  kind: 'same' | 'removed' | 'added'
  text: string
  highlight: boolean
}

// Words and the spaces between them, so the answer can be put back together exactly.
export function tokens(text: string): string[] {
  return text.match(/\s+|[^\s⟦⟧]+|[⟦⟧]/g) || []
}

// The teacher's text without highlight marks, and which of its tokens are highlighted.
function readMarks(teacherText: string): { words: string[]; highlighted: boolean[] } {
  const words: string[] = []
  const highlighted: boolean[] = []
  let on = false
  for (const t of tokens(teacherText)) {
    if (t === HIGHLIGHT_START) on = true
    else if (t === HIGHLIGHT_END) on = false
    else {
      words.push(t)
      highlighted.push(on)
    }
  }
  return { words, highlighted }
}

// Compares the student's answer with the teacher's marked-up copy, word by word.
export function markupSegments(original: string, teacherText: string): Segment[] {
  const a = tokens(original)
  const { words: b, highlighted } = readMarks(teacherText)
  const MAX = 4000
  if (a.length > MAX || b.length > MAX) {
    return [{ kind: 'same', text: original, highlight: false }]
  }
  // Longest common subsequence of tokens.
  const n = a.length
  const m = b.length
  const lcs: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
  const out: Segment[] = []
  const push = (kind: Segment['kind'], text: string, highlight: boolean) => {
    const last = out[out.length - 1]
    if (last && last.kind === kind && last.highlight === highlight) last.text += text
    else out.push({ kind, text, highlight })
  }
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      push('same', a[i], highlighted[j])
      i++
      j++
    } else if (i < n && (j === m || lcs[i + 1][j] >= lcs[i][j + 1])) {
      // The student's word first, crossed out; then the teacher's.
      push('removed', a[i], false)
      i++
    } else {
      push('added', b[j], highlighted[j])
      j++
    }
  }
  return out
}

// Did the teacher change or highlight anything?
export function hasMarkup(original: string, teacherText: string): boolean {
  return teacherText.includes(HIGHLIGHT_START) || readMarks(teacherText).words.join('') !== tokens(original).join('')
}

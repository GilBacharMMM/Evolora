// Marking up a written answer (REQ-5.12, D-64): the teacher edits a copy of the student's answer
// and may highlight parts of it by putting them between ⟦ and ⟧. The student sees their own words,
// crossed out where the teacher changed them, the teacher's words in the teacher's colour, and the
// highlights. Pure rules with no imports, tested in functions/markup.test.js.

export const HIGHLIGHT_START = '⟦'
export const HIGHLIGHT_END = '⟧'

export type Kind = 'same' | 'removed' | 'added'
export interface Segment {
  kind: Kind
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
  const v2 = readMarkupV2(teacherText)
  if (v2) return v2.some((g) => g.kind !== 'same' || g.highlight)
  return teacherText.includes(HIGHLIGHT_START) || readMarks(teacherText).words.join('') !== tokens(original).join('')
}

// ---------------------------------------------------------------------------------------------
// Track changes in place (D-64 as changed by Gil, 2026-11-25): the teacher edits the student's answer
// itself, letter by letter, as in Word. Every letter is the student's ("same"), the student's but
// deleted by the teacher ("removed", still shown, crossed out), or the teacher's ("added"); any of
// them can be highlighted.

export interface Letter {
  ch: string
  kind: Kind
  hl: boolean
}

export function lettersOf(original: string): Letter[] {
  return Array.from(original).map((ch) => ({ ch, kind: 'same', hl: false }))
}

// Typing at a place (after deleting the selection, if any). Returns the new letters and caret.
export function insertText(letters: Letter[], start: number, end: number, text: string): { letters: Letter[]; caret: number } {
  const r = start === end ? { letters, caret: start } : deleteRange(letters, start, end)
  const added: Letter[] = Array.from(text).map((ch) => ({ ch, kind: 'added', hl: false }))
  const out = [...r.letters.slice(0, r.caret), ...added, ...r.letters.slice(r.caret)]
  return { letters: out, caret: r.caret + added.length }
}

// Deleting a selection: the student's letters stay, crossed out; the teacher's own letters go.
export function deleteRange(letters: Letter[], start: number, end: number): { letters: Letter[]; caret: number } {
  const out: Letter[] = []
  let caret = start
  letters.forEach((l, i) => {
    if (i < start || i >= end) return out.push(l)
    if (l.kind === 'added') return
    out.push({ ...l, kind: 'removed' })
  })
  // The caret goes after what was crossed out, where typing continues.
  for (let i = start; i < end; i++) if (letters[i].kind !== 'added') caret++
  return { letters: out, caret: start === end ? start : caret }
}

// Backspace: the letter before the caret, skipping letters already crossed out.
export function backspace(letters: Letter[], caret: number): { letters: Letter[]; caret: number } {
  let k = caret - 1
  while (k >= 0 && letters[k].kind === 'removed') k--
  if (k < 0) return { letters, caret }
  if (letters[k].kind === 'added') return { letters: [...letters.slice(0, k), ...letters.slice(k + 1)], caret: k }
  const out = letters.slice()
  out[k] = { ...out[k], kind: 'removed' }
  return { letters: out, caret: k }
}

// Delete: the letter after the caret, skipping letters already crossed out.
export function deleteForward(letters: Letter[], caret: number): { letters: Letter[]; caret: number } {
  let k = caret
  while (k < letters.length && letters[k].kind === 'removed') k++
  if (k >= letters.length) return { letters, caret }
  if (letters[k].kind === 'added') return { letters: [...letters.slice(0, k), ...letters.slice(k + 1)], caret: k }
  const out = letters.slice()
  out[k] = { ...out[k], kind: 'removed' }
  return { letters: out, caret: k + 1 }
}

// Highlight on or off: off when everything selected is already highlighted.
export function toggleHighlight(letters: Letter[], start: number, end: number): Letter[] {
  const part = letters.slice(start, end)
  if (!part.length) return letters
  const on = !part.every((l) => l.hl)
  return letters.map((l, i) => (i >= start && i < end ? { ...l, hl: on } : l))
}

export function segmentsOfLetters(letters: Letter[]): Segment[] {
  const out: Segment[] = []
  for (const l of letters) {
    const last = out[out.length - 1]
    if (last && last.kind === l.kind && last.highlight === l.hl) last.text += l.ch
    else out.push({ kind: l.kind, text: l.ch, highlight: l.hl })
  }
  return out
}

export function lettersOfSegments(segments: Segment[]): Letter[] {
  return segments.flatMap((s) => Array.from(s.text).map((ch) => ({ ch, kind: s.kind, hl: s.highlight })))
}

export function changed(letters: Letter[]): boolean {
  return letters.some((l) => l.kind !== 'same' || l.hl)
}

// Saved as text with the answer: "v2:" and the segments, so earlier mark-ups (a marked-up copy of
// the answer, D-64 first version) can still be read.
export const V2 = 'v2:'
export function saveMarkup(letters: Letter[]): string {
  return changed(letters) ? V2 + JSON.stringify(segmentsOfLetters(letters).map((s) => [s.kind[0], s.text, s.highlight ? 1 : 0])) : ''
}
export function readMarkupV2(markup: string): Segment[] | null {
  if (!markup.startsWith(V2)) return null
  try {
    const rows = JSON.parse(markup.slice(V2.length)) as [string, string, number][]
    const kind = (k: string): Kind => (k === 'r' ? 'removed' : k === 'a' ? 'added' : 'same')
    return rows.map(([k, text, h]) => ({ kind: kind(k), text: String(text), highlight: h === 1 }))
  } catch {
    return null
  }
}

// What the student sees: the saved letter-by-letter mark-up, or an earlier marked-up copy.
export function segmentsFor(original: string, markup: string): Segment[] {
  return readMarkupV2(markup) ?? markupSegments(original, markup)
}

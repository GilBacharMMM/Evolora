// Reads a terms-of-use file (REQ-10.8, D-75):
//
//   version: 0.1
//   title: Terms of use
//   summary:
//   - first line of the summary
//   - second line
//   ---
//   # The full text, in simple Markdown (headings, paragraphs, lists, **bold**)
//
// Returns { version, title, summary: [...], text } and a list of problems.

export const TERMS_LANGUAGES = ['he', 'ar', 'en']

export function parseTerms(source) {
  const lines = source.replace(/\r\n/g, '\n').replace(/^﻿/, '').split('\n')
  const problems = []
  const out = { version: '', title: '', summary: [], text: '' }
  let i = 0
  let inSummary = false
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '---') {
      i++
      break
    }
    const field = line.match(/^(version|title|summary):\s*(.*)$/)
    if (field) {
      inSummary = field[1] === 'summary'
      if (!inSummary) out[field[1]] = field[2].trim()
      continue
    }
    if (inSummary && /^\s*-\s+/.test(line)) {
      out.summary.push(line.replace(/^\s*-\s+/, '').trim())
      continue
    }
    if (line.trim()) problems.push(`Line ${i + 1} isn't understood before the "---" line: ${line.trim().slice(0, 60)}`)
  }
  out.text = lines.slice(i).join('\n').trim()
  if (!/^\d+(\.\d+)*$/.test(out.version)) problems.push('The "version:" line is missing or not a number like 0.1 or 1.2.')
  if (!out.title) problems.push('The "title:" line is missing.')
  if (!out.summary.length) problems.push('The summary is empty: add "- " lines under "summary:".')
  if (out.summary.length > 8) problems.push('The summary is long: keep it to 8 lines at most.')
  if (!out.text) problems.push('The full text after the "---" line is missing.')
  return { terms: out, problems }
}

// All three languages must exist and have the same version.
export function checkSet(parsed) {
  const problems = []
  for (const lang of TERMS_LANGUAGES) {
    if (!parsed[lang]) problems.push(`terms.${lang}.md is missing.`)
    else for (const p of parsed[lang].problems) problems.push(`terms.${lang}.md: ${p}`)
  }
  const versions = new Set(TERMS_LANGUAGES.filter((l) => parsed[l]).map((l) => parsed[l].terms.version))
  if (versions.size > 1) problems.push(`The three files have different versions: ${[...versions].join(', ')}. They must be the same.`)
  return problems
}

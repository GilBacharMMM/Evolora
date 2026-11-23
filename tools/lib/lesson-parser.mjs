// Reads a lesson file (lessons/<name>/lesson.md) or a course file (courses/<name>.md)
// and turns it into the data the loading program saves (REQ-4.24, system-design 2.2).
//
// It follows the same reading rules as tools/check-lesson.mjs, which always runs first.
// Notes for Gil and Claude (lines starting with ">", headings that are not topics,
// and "[NEW: ...]" tags) are never shown to students, so they are left out here.
//
// The result is split in two:
// - "content": what a student may see (text, media, questions without their answers)
// - "secret": correct answers, hints, solutions, "why it's right" explanations (REQ-4.28),
//   check-again questions and grading
//   instructions, saved where students can never read them (D-17).

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const FIELD = /^- (Hint|Solution|Why it['’]s right|Answer|Unit|Grading instructions|Tip|file|caption|source|link|title|start|end|intro text|instructions for the student):\s*(.*)$/i
const LATEX = /\\[a-zA-Z]+|\^|_\{/
const WORDS = /[֐-׿؀-ۿA-Za-z]{2,}/
const TYPE_KEYS = {
  'teaching lesson': 'teaching',
  'practice lesson': 'practice',
  exam: 'exam',
}
const QUESTION_KINDS = {
  'QUESTION: multiple choice': 'choice',
  'QUESTION: number': 'number',
  'QUESTION: open': 'open',
  'QUESTION: audio': 'audio',
}

const stripNew = (s) => s.replace(/\[NEW[^\]]*\]\s*/g, '').trim()
const isNote = (s) => s.trim().startsWith('>')

function readMeta(lines) {
  const meta = {}
  let i = 0
  if ((lines[0] || '').trim() === '---') {
    for (i = 1; i < lines.length && lines[i].trim() !== '---'; i++) {
      const m = lines[i].match(/^([^:]+):\s*(.*)$/)
      if (m) meta[m[1].trim().toLowerCase()] = m[2].trim()
    }
    i++
  }
  return { meta, next: i }
}

function headingTags(line) {
  return [...line.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim())
}

// Splits block lines into: free text, choices, fields (with indented continuation lines) and tips.
function readBody(lines) {
  const text = []
  const choices = []
  const fields = {}
  const tips = []
  let lastField = null
  let seenFieldOrChoice = false
  for (const raw of lines) {
    if (isNote(raw)) continue
    const line = raw.trim()
    if (line === '---') { lastField = null; continue }
    const f = line.match(FIELD)
    if (f) {
      const key = f[1].toLowerCase().replace('’', "'")
      const value = stripNew(f[2])
      if (key === 'tip') {
        const [title, ...rest] = value.split('|')
        tips.push({ title: title.trim(), text: rest.join('|').trim() })
        lastField = null
      } else {
        fields[key] = value
        lastField = key
      }
      seenFieldOrChoice = true
      continue
    }
    // An indented line right after a field continues that field (for example, simulation instructions).
    if (lastField && /^\s+\S/.test(raw)) {
      fields[lastField] = (fields[lastField] ? fields[lastField] + '\n' : '') + stripNew(raw.replace(/^\s{1,3}/, ''))
      continue
    }
    if (/^- /.test(line) && !fields.hint && !fields.solution && tips.length === 0) {
      const correct = line.startsWith('- (✔)')
      choices.push({ text: stripNew(line.replace(/^- (\(✔\)\s*)?/, '')), correct })
      seenFieldOrChoice = true
      lastField = null
      continue
    }
    lastField = null
    if (!seenFieldOrChoice) text.push(stripNew(raw))
  }
  return { text: tidy(text.join('\n')), choices, fields, tips }
}

// Removes extra blank lines at the start and end, and runs of blank lines.
function tidy(s) {
  return s.replace(/\n{3,}/g, '\n\n').trim()
}

function seconds(value) {
  if (!value || value.startsWith('(')) return null
  const parts = value.split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return null
  return parts.reduce((total, n) => total * 60 + n, 0)
}

function youtubeId(link) {
  const m = link.match(/youtu\.be\/([\w-]{6,})/) || link.match(/[?&]v=([\w-]{6,})/)
  return m ? m[1] : null
}

function linkListMarkdown(body) {
  return body
    .split('\n')
    .map((l) => {
      const m = l.match(/^(\s*-\s+)(.+?):\s*(https?:\/\/\S+)\s*$/)
      return m ? `${m[1]}[${m[2]}](${m[3]})` : l
    })
    .join('\n')
}

function numberValue(s) {
  return Number(String(s).replace(/,/g, ''))
}

export function parseLesson(target) {
  let file = target
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) file = path.join(target, 'lesson.md')
  const dir = path.dirname(file)
  const id = path.basename(dir)
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const lines = source.split('\n')
  const { meta, next } = readMeta(lines)

  const details = {
    title: meta.title,
    language: meta.language,
    subject: meta.subject,
    grade: Number(meta.grade),
    creator: meta.creator,
    licence: meta.licence,
    type: TYPE_KEYS[meta.type] || meta.type,
    minimumPerTopic: parseInt(meta['minimum questions per topic'] || '', 10) || null,
  }

  // Group lines into topics and blocks.
  const topics = []
  let topic = null
  let block = null
  let inNotes = false
  const rawBlocks = []
  for (let i = next; i < lines.length; i++) {
    const text = lines[i]
    if (/^# /.test(text)) {
      const t = text.match(/^# \[TOPIC\s*(\d+)\s*:\s*(.+)\]\s*$/)
      if (t) {
        topic = { number: Number(t[1]), name: stripNew(t[2]), blocks: [] }
        topics.push(topic)
        inNotes = false
      } else inNotes = true
      block = null
      continue
    }
    if (/^## /.test(text)) {
      inNotes = false
      const tags = headingTags(text)
      if (!topic) {
        topic = { number: 1, name: null, blocks: [] }
        topics.push(topic)
      }
      block = { type: tags[0], tags, lines: [], checkAgain: [] }
      topic.blocks.push(block)
      rawBlocks.push(block)
      continue
    }
    if (inNotes || !block) continue
    if (/^### Check-again question/.test(text)) {
      block.checkAgain.push({ tags: headingTags(text), lines: [] })
      continue
    }
    const into = block.checkAgain.length ? block.checkAgain[block.checkAgain.length - 1].lines : block.lines
    into.push(text)
  }

  const images = []
  const secret = {}
  let questionNumber = 0

  const contentTopics = topics.map((t) => ({
    number: t.number,
    name: t.name,
    blocks: t.blocks.map((b) => {
      const body = readBody(b.lines)
      const allText = tidy(b.lines.filter((l) => !isNote(l)).map(stripNew).join('\n')).replace(/(^|\n)---\s*$/, '').trim()
      switch (b.type) {
        case 'TEXT':
          return { type: 'text', markdown: allText }
        case 'NOTE BOX':
          return { type: 'note', markdown: allText }
        case 'TABLE':
          return { type: 'table', markdown: allText }
        case 'SOLVED EXAMPLE':
          return { type: 'solvedExample', markdown: allText }
        case 'LINK LIST':
          return { type: 'linkList', markdown: linkListMarkdown(allText) }
        case 'FORMULA': {
          const content = b.lines.filter((l) => l.trim() && !isNote(l)).map((l) => stripNew(l))
          const latex = content.filter((l) => LATEX.test(l))
          // Lines in words (for example "צפיפות = מסה ÷ נפח") are shown as text. A plain-symbol
          // line is left out when the same formula is also written in LaTeX.
          const words = content.filter((l) => !LATEX.test(l) && (WORDS.test(l.replace(/[A-Za-z](?![A-Za-z])/g, '')) || latex.length === 0))
          return { type: 'formula', latex, words }
        }
        case 'IMAGE': {
          const image = { type: 'image', file: body.fields.file, caption: body.fields.caption || '', source: body.fields.source || '', storagePath: null }
          images.push({ block: image, localPath: path.join(dir, body.fields.file) })
          return image
        }
        case 'VIDEO':
          return {
            type: 'video',
            youtubeId: youtubeId(body.fields.link || ''),
            link: body.fields.link,
            title: body.fields.title || '',
            source: body.fields.source || '',
            start: seconds(body.fields.start),
            end: seconds(body.fields.end),
          }
        case 'AUDIO':
          return { type: 'audio', link: body.fields.link || null, file: body.fields.file || null, title: body.fields.title || '', intro: body.fields['intro text'] || '' }
        case 'SIMULATION':
          return { type: 'simulation', link: body.fields.link, title: body.fields.title || '', instructions: body.fields['instructions for the student'] || '' }
        default: {
          const kind = QUESTION_KINDS[b.type]
          if (!kind) throw new Error(`Unknown block type "${b.type}"`)
          questionNumber++
          const id = `q${questionNumber}`
          const levelTag = b.tags.find((tag) => /^LEVEL\s*\d$/.test(tag))
          const level = levelTag ? Number(levelTag.replace(/\D/g, '')) : null
          const choices = kind === 'choice' ? body.choices.map((c, n) => ({ id: `c${n + 1}`, text: c.text, correct: c.correct })) : []
          const q = {
            type: 'question',
            id,
            kind,
            level,
            extra: b.tags.includes('EXTRA'),
            prompt: body.text,
            choices: choices.map(({ id: cid, text }) => ({ id: cid, text })),
            multipleCorrect: choices.filter((c) => c.correct).length > 1,
            unit: body.fields.unit || null,
            tips: body.tips,
          }
          secret[id] = {
            correct: choices.filter((c) => c.correct).map((c) => c.id),
            answer: kind === 'number' ? numberValue(body.fields.answer) : null,
            hint: body.fields.hint || null,
            solution: body.fields.solution || null,
            whyRight: body.fields["why it's right"] || null,
            gradingInstructions: body.fields['grading instructions'] || null,
            checkAgain: b.checkAgain.map((ca, n) => {
              const cab = readBody(ca.lines)
              const caKind = cab.fields.answer ? 'number' : 'choice'
              const caChoices = cab.choices.map((c, k) => ({ id: `c${k + 1}`, text: c.text, correct: c.correct }))
              return {
                id: `${id}-check${n + 1}`,
                kind: caKind,
                prompt: cab.text,
                choices: caChoices.map(({ id: cid, text }) => ({ id: cid, text })),
                multipleCorrect: caChoices.filter((c) => c.correct).length > 1,
                correct: caChoices.filter((c) => c.correct).map((c) => c.id),
                answer: caKind === 'number' ? numberValue(cab.fields.answer) : null,
                unit: cab.fields.unit || null,
                hint: cab.fields.hint || null,
                solution: cab.fields.solution || null,
                whyRight: cab.fields["why it's right"] || null,
              }
            }),
          }
          return q
        }
      }
    }),
  }))

  const fingerprint = crypto.createHash('sha256').update(source)
  for (const img of images) if (fs.existsSync(img.localPath)) fingerprint.update(fs.readFileSync(img.localPath))

  return {
    id,
    details,
    content: { topics: contentTopics },
    secret: { questions: secret },
    images,
    fingerprint: fingerprint.digest('hex'),
    counts: { topics: contentTopics.length, blocks: rawBlocks.length, questions: questionNumber, images: images.length },
  }
}

export function parseCourse(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const lines = source.split('\n')
  const { meta, next } = readMeta(lines)
  const items = []
  for (let i = next; i < lines.length; i++) {
    const text = lines[i]
    if (!text.trim() || isNote(text)) continue
    const top = text.match(/^\d+\.\s*\[(TEACHING|EXAM)\]\s*(\S+)\s*$/)
    const sub = text.match(/^\s+-\s*\[PRACTICE\]\s*(\S+)\s*$/)
    if (top) items.push({ kind: top[1] === 'EXAM' ? 'exam' : 'teaching', lessonId: top[2], practice: [] })
    else if (sub && items.length) items[items.length - 1].practice.push(sub[1])
  }
  return {
    id: path.basename(file, '.md'),
    details: {
      title: meta.title,
      language: meta.language,
      subject: meta.subject,
      grade: Number(meta.grade),
      creator: meta.creator,
      licence: meta.licence,
    },
    items,
    lessonIds: items.flatMap((it) => [it.lessonId, ...it.practice]),
  }
}

#!/usr/bin/env node
// Evolora lesson file check (REQ-4.24).
// Checks that a lesson file follows the format in lessons/README.md before it is loaded.
// Usage: node tools/check-lesson.mjs <lesson folder or lesson.md> [more ...]
// Exit code: 0 when there are no errors (warnings are allowed), 1 otherwise.

import fs from 'node:fs'
import path from 'node:path'

const BLOCK_TYPES = new Set([
  'TEXT', 'NOTE BOX', 'IMAGE', 'TABLE', 'FORMULA', 'VIDEO', 'AUDIO', 'SIMULATION',
  'LINK LIST', 'SOLVED EXAMPLE', 'QUOTE',
  'QUESTION: multiple choice', 'QUESTION: number', 'QUESTION: open', 'QUESTION: audio', 'QUESTION: drag and drop',
])
const LESSON_TYPES = ['teaching lesson', 'practice lesson', 'exam']
const LANGUAGES = ['he', 'ar', 'en']
const FIELD = /^- (Hint|Solution|Why it's right|Answer|Unit|Grading instructions|Tip|Spot|Extra card|file|caption|source|link|title|start|end|intro text|instructions for the student):\s*(.*)$/i
const NUMBER = /^-?\d+(\.\d+)?$/
const TIME = /^\d{1,2}:\d{2}(:\d{2})?$/

function readLesson(target) {
  let file = target
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) file = path.join(target, 'lesson.md')
  if (!fs.existsSync(file)) return { file, error: `No lesson file found at ${file}` }
  return { file, dir: path.dirname(file), lines: fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n') }
}

function headingTags(line) {
  return [...line.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim())
}

function fieldsOf(lines) {
  const fields = {}
  const choices = []
  const tips = []
  const spots = []
  const extraCards = []
  for (const { text, n } of lines) {
    if (text.startsWith('>')) continue
    const f = text.match(FIELD)
    if (f) {
      const key = f[1].toLowerCase()
      const value = f[2].replace(/\[NEW[^\]]*\]\s*/g, '').trim()
      if (key === 'tip') tips.push({ value, n })
      else if (key === 'spot') spots.push({ value, n })
      else if (key === 'extra card') extraCards.push({ value, n })
      else fields[key] = { value, n }
    } else if (/^- /.test(text) && !fields.hint && !fields.solution && tips.length === 0) {
      choices.push({ text: text.slice(2).trim(), n, correct: text.startsWith('- (✔)') })
    }
  }
  return { fields, choices, tips, spots, extraCards }
}

function checkLesson(target) {
  const out = { errors: [], warnings: [], notes: [] }
  const err = (n, msg) => out.errors.push(n ? `line ${n}: ${msg}` : msg)
  const warn = (n, msg) => out.warnings.push(n ? `line ${n}: ${msg}` : msg)

  const lesson = readLesson(target)
  if (lesson.error) { err(0, lesson.error); return { file: lesson.file, ...out } }
  const { file, dir, lines } = lesson

  // Lesson details at the top
  const meta = {}
  let i = 0
  if ((lines[0] || '').trim() !== '---') err(1, 'The file must start with the lesson details between two "---" lines.')
  else {
    for (i = 1; i < lines.length && lines[i].trim() !== '---'; i++) {
      const m = lines[i].match(/^([^:]+):\s*(.*)$/)
      if (m) meta[m[1].trim().toLowerCase()] = m[2].trim()
    }
    i++
  }
  for (const key of ['title', 'language', 'subject', 'grade', 'creator', 'licence', 'type']) {
    if (!meta[key]) err(1, `Lesson details: "${key}" is missing.`)
  }
  if (meta.language && !LANGUAGES.includes(meta.language)) err(1, `Lesson details: language must be he, ar or en (found "${meta.language}").`)
  if (meta.grade && !(Number(meta.grade) >= 7 && Number(meta.grade) <= 12)) err(1, `Lesson details: grade must be 7 to 12 (found "${meta.grade}").`)
  if (meta.licence && meta.licence !== 'CC BY-SA 4.0') err(1, `Lesson details: licence must be "CC BY-SA 4.0" (found "${meta.licence}").`)
  if (meta.type && !LESSON_TYPES.includes(meta.type)) err(1, `Lesson details: type must be one of: ${LESSON_TYPES.join(', ')} (found "${meta.type}").`)
  const isExam = meta.type === 'exam'
  // Folder name convention (Gil, 2026-11-22): <topic>-teaching, <topic>-practice or <topic>-exam, optionally -2, -3...
  const folder = path.basename(dir)
  const suffix = { 'teaching lesson': 'teaching', 'practice lesson': 'practice', exam: 'exam' }[meta.type]
  if (suffix && !new RegExp('^[a-z0-9]+(-[a-z0-9]+)*-' + suffix + '(-[0-9]+)?$').test(folder)) {
    err(0, `The folder name "${folder}" must be <topic>-${suffix} in lowercase English with dashes (for example circles-${suffix}), to match the lesson's type.`)
  }
  const minimum = parseInt(meta['minimum questions per topic'] || '', 10)
  if (!isExam && !(minimum >= 1)) err(1, 'Lesson details: "minimum questions per topic" is missing or not a number.')

  // Split into topics and blocks
  const topics = []
  let topic = null
  let block = null
  let inNotes = false
  const blocks = []
  const startTopic = (name, n) => { topic = { name, n, level1: 0, extra: 0, autoQuestions: 0 }; topics.push(topic) }

  for (; i < lines.length; i++) {
    const text = lines[i]
    const n = i + 1
    // Explanations of words (REQ-4.29): [[word|explanation]], on one line.
    if ((text.match(/\[\[/g) || []).length !== (text.match(/\]\]/g) || []).length) err(n, 'A word explanation starts with "[[" but doesn\'t end with "]]" on the same line (or the other way round). Write it as [[word|explanation]].')
    for (const m of text.matchAll(/\[\[(.*?)\]\]/g)) {
      const parts = m[1].split('|')
      if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) err(n, `Word explanation "[[${m[1].slice(0, 40)}]]" must be written [[word|explanation]]: the word, one "|", then the explanation.`)
      else if (parts[1].length > 300) warn(n, `The explanation of "${parts[0].trim()}" is long (${parts[1].length} characters); keep it to a sentence or two.`)
    }
    if (/^# /.test(text)) {
      const t = text.match(/^# \[TOPIC\s*(\d+)\s*:\s*(.+)\]\s*$/)
      if (t) { startTopic(t[2].trim(), n); inNotes = false } else inNotes = true
      block = null
      continue
    }
    if (/^## /.test(text)) {
      inNotes = false
      const tags = headingTags(text)
      const type = tags[0] || ''
      if (!BLOCK_TYPES.has(type)) { err(n, `Unknown block "${text.trim()}". Allowed blocks are listed in lessons/README.md.`); block = null; continue }
      if (!topic) startTopic('(whole lesson, no topics)', n)
      block = { type, tags, n, lines: [], checkAgain: [], topic }
      blocks.push(block)
      continue
    }
    if (inNotes || !block) continue
    if (/^### Check-again question/.test(text)) {
      block.checkAgain.push({ n, tags: headingTags(text), lines: [] })
      continue
    }
    const target = block.checkAgain.length ? block.checkAgain[block.checkAgain.length - 1].lines : block.lines
    target.push({ text: text.trim(), n })
  }

  if (topics.length === 1 && topics[0].name.startsWith('(whole lesson')) {
    warn(0, 'The lesson has no topics ("# [TOPIC 1: name]"), so it is treated as one topic.')
  }

  let newTags = 0
  let tipCount = 0
  let noTips = 0
  let noWhy = 0
  for (const b of blocks) {
    const { fields, choices, tips, spots, extraCards } = fieldsOf(b.lines)
    const isQuestion = b.type.startsWith('QUESTION')
    const isAuto = b.type === 'QUESTION: multiple choice' || b.type === 'QUESTION: number' || b.type === 'QUESTION: drag and drop'
    const levelTag = b.tags.find((t) => /^LEVEL\s*\d$/.test(t))
    const level = levelTag ? Number(levelTag.replace(/\D/g, '')) : null
    const isExtra = b.tags.includes('EXTRA')
    if (b.tags.some((t) => t.startsWith('NEW'))) newTags++

    switch (b.type) {
      case 'IMAGE': {
        if (!fields.file) err(b.n, 'Image: the "file" line is missing.')
        else if (!fs.existsSync(path.join(dir, fields.file.value))) err(fields.file.n, `Image: the file "${fields.file.value}" doesn't exist.`)
        if (!fields.caption || !fields.caption.value) err(b.n, 'Image: the "caption" line is missing.')
        const src = fields.source ? fields.source.value : ''
        if (!src) err(b.n, 'Image: the "source" line is missing (REQ-4.15).')
        else if (!/^own work/i.test(src) && !/^AI-generated/i.test(src) && !(/https?:\/\//.test(src) && /(licen[cs]e|public domain|CC[ -]|creative commons)/i.test(src))) {
          err(fields.source.n, `Image: the source "${src}" must be "own work", "AI-generated (...)", or an author with a link and a licence (REQ-4.15).`)
        }
        break
      }
      case 'VIDEO': {
        if (!fields.link || !/(youtube\.com\/watch\?v=|youtu\.be\/)/.test(fields.link.value)) err(b.n, 'Video: a YouTube "link" is missing or not a YouTube link.')
        if (!fields.title) err(b.n, 'Video: the "title" line is missing.')
        if (!fields.source) err(b.n, 'Video: the "source" line (the YouTube channel) is missing (REQ-4.23).')
        for (const k of ['start', 'end']) {
          if (fields[k] && fields[k].value && !fields[k].value.startsWith('(') && !TIME.test(fields[k].value)) err(fields[k].n, `Video: "${k}" must be a time like 1:20.`)
        }
        break
      }
      case 'AUDIO':
        if (!fields.link && !fields.file) err(b.n, 'Audio: a "link" or "file" line is missing.')
        if (!fields.title) warn(b.n, 'Audio: the "title" line is missing.')
        break
      case 'SIMULATION':
        if (!fields.link) err(b.n, 'Simulation: the "link" line is missing.')
        if (!fields.title) warn(b.n, 'Simulation: the "title" line is missing.')
        if (!fields['instructions for the student']) warn(b.n, 'Simulation: there are no instructions for the student.')
        break
      case 'FORMULA': {
        const content = b.lines.filter((l) => l.text && !l.text.startsWith('>'))
        if (content.length === 0) err(b.n, 'Formula: the block is empty.')
        else if (!content.some((l) => /\\[a-zA-Z]+|\^|_\{/.test(l.text))) warn(b.n, 'Formula: no LaTeX line found (needed to display it properly).')
        break
      }
      case 'QUOTE': {
        const quoteText = b.lines.filter((l) => l.text && !l.text.startsWith('>') && !FIELD.test(l.text))
        if (quoteText.length === 0) err(b.n, 'Quote: the quote text is missing.')
        if (!fields.source || !fields.source.value) err(b.n, 'Quote: the "- source:" line is missing (where the quote comes from).')
        break
      }
      case 'SOLVED EXAMPLE': {
        const body = b.lines.map((l) => l.text).join('\n')
        if (!/\*\*(שאלה|سؤال|Question):\*\*/.test(body) || !/\*\*(תשובה|جواب|Answer):\*\*/.test(body)) err(b.n, 'Solved example: it needs a "Question:" part and an "Answer:" part, in bold.')
        break
      }
      default:
        break
    }

    if (!isQuestion) continue
    const what = `${b.type.replace('QUESTION: ', '')} question`
    if (!isExam && !level) err(b.n, `The ${what} has no level ([LEVEL 1], [LEVEL 2] or [LEVEL 3]).`)
    if (level && (level < 1 || level > 3)) err(b.n, `The ${what} has level ${level}; levels are 1 to 3.`)

    checkQuestionBody(b.type, fields, choices, b.n, what, err)

    // Help tips (REQ-6.15): "- Tip: title | text", never in exams, never the answer
    if (tips.length) {
      if (isExam) err(tips[0].n, 'Exams have no help tips (REQ-6.15).')
      for (const tip of tips) {
        const parts = tip.value.split('|')
        if (parts.length < 2 || !parts[0].trim() || !parts.slice(1).join('|').trim()) err(tip.n, 'Help tip: write it as "- Tip: title | text".')
        if (fields.answer) {
          const ans = fields.answer.value.replace(/,/g, '')
          const tipText = tip.value.replace(/,/g, '')
          if (ans.length > 1 && new RegExp('(^|[^0-9.])' + ans.replace('.', '\\.') + '([^0-9]|$)').test(tipText)) err(tip.n, `Help tip: it contains the answer (${fields.answer.value}). Tips must never give the answer.`)
        }
      }
      tipCount += tips.length
    } else if (!isExam) noTips++

    // Drag and drop (REQ-4.12, D-70): an image with spots; each spot names the card that belongs there.
    if (b.type === 'QUESTION: drag and drop') {
      if (isExam) err(b.n, 'Drag-and-drop questions are not used in exams yet (D-70).')
      if (!fields.file) err(b.n, 'Drag and drop: the "file" line (the image) is missing.')
      else if (!fs.existsSync(path.join(dir, fields.file.value))) err(fields.file.n, `Drag and drop: the image "${fields.file.value}" doesn't exist.`)
      const src = fields.source ? fields.source.value : ''
      if (!src) err(b.n, 'Drag and drop: the image\'s "source" line is missing (REQ-4.15).')
      if (spots.length < 2) err(b.n, 'Drag and drop: write at least 2 spots, as "- Spot: 30% 45% | card text".')
      const seen = new Set()
      for (const sp of spots) {
        const m = sp.value.match(/^\s*([\d.]+)%?\s+([\d.]+)%?\s*\|\s*(.+)$/)
        if (!m) err(sp.n, 'Drag and drop: write the spot as "- Spot: 30% 45% | card text" (across, then down, in percent of the image).')
        else {
          if (Number(m[1]) > 100 || Number(m[2]) > 100) err(sp.n, 'Drag and drop: a spot\'s place must be between 0% and 100%.')
          if (seen.has(m[3].trim())) err(sp.n, `Drag and drop: the card "${m[3].trim()}" is used for two spots; each spot needs its own card.`)
          seen.add(m[3].trim())
        }
      }
      for (const ex of extraCards) if (seen.has(ex.value)) err(ex.n, `Drag and drop: the extra card "${ex.value}" is also the card of a spot.`)
      if (b.checkAgain.length) err(b.checkAgain[0].n, 'Drag-and-drop questions have no check-again question yet (D-70).')
    }

    if (b.type === 'QUESTION: open' || b.type === 'QUESTION: audio') {
      if (!fields['grading instructions']) err(b.n, `The ${what} has no grading instructions.`)
    }

    if (isAuto) {
      if (isExam) {
        if (fields.hint) err(fields.hint.n, 'Exams have no hints (REQ-4.26).')
        if (b.checkAgain.length) err(b.checkAgain[0].n, 'Exams have no check-again questions (REQ-4.26).')
        if (isExtra) err(b.n, 'Exams have no extra practice questions (REQ-4.26).')
      } else {
        if (!fields.hint) err(b.n, `The ${what} has no hint (REQ-4.16).`)
        if (!fields.solution) err(b.n, `The ${what} has no full solution (REQ-4.16).`)
        if (!fields["why it's right"]) noWhy++
        if (!isExtra && b.checkAgain.length === 0 && b.type !== 'QUESTION: drag and drop') err(b.n, `The ${what} has no check-again question (REQ-4.17).`)
      }
      for (const ca of b.checkAgain) {
        const caf = fieldsOf(ca.lines)
        const caType = caf.fields.answer ? 'QUESTION: number' : 'QUESTION: multiple choice'
        checkQuestionBody(caType, caf.fields, caf.choices, ca.n, 'check-again question', err)
        if (ca.tags.some((t) => t.startsWith('NEW'))) newTags++
      }
      b.topic.autoQuestions++
      if ((level === 1 || isExam) && b.type !== 'QUESTION: drag and drop') { if (isExtra) b.topic.extra++; else b.topic.level1++ }
    }
  }

  // Topics: enough questions for the minimum (REQ-4.21)
  if (!isExam && minimum >= 1) {
    for (const t of topics) {
      if (t.level1 + t.extra < minimum) err(t.n, `Topic "${t.name}" has ${t.level1 + t.extra} level 1 multiple choice or number questions; the minimum is ${minimum} (REQ-4.21).`)
      else if (t.extra === 0 && t.level1 <= minimum && minimum > 1) warn(t.n, `Topic "${t.name}" has no extra practice questions ([EXTRA]); a student who makes a mistake may run out of questions.`)
    }
  }

  const all = lines.join('\n')
  const blueNotes = (all.match(/^> 🟦/gm) || []).length
  newTags = (all.match(/\[NEW[^\]]*\]/g) || []).length
  if (newTags) out.notes.push(`${newTags} part(s) are still marked [NEW] (suggested by Claude, not yet approved).`)
  if (blueNotes) out.notes.push(`${blueNotes} comment(s) from Claude (🟦) are still in the file.`)
  if (noWhy) warn(0, `${noWhy} question(s) have no "- Why it's right:" explanation. Good practice: write one for every multiple choice and number question (REQ-4.28); without it, the full solution is shown after a right answer.`)
  out.notes.push(`${tipCount} help tip(s); ${noTips} question(s) without tips.`)
  out.notes.push(`${topics.length} topic(s), ${blocks.length} blocks, ${blocks.filter((b) => b.type.startsWith('QUESTION')).length} questions.`)
  return { file, ...out }

  function checkQuestionBody(type, fields, choices, n, what, error) {
    if (type === 'QUESTION: multiple choice') {
      if (choices.length < 2) error(n, `The ${what} needs at least 2 choices.`)
      if (!choices.some((c) => c.correct)) error(n, `The ${what} has no choice marked (✔).`)
      if (choices.some((c) => /(all of the above|כל התשובות|جميع ما سبق|both a and b)/i.test(c.text))) error(n, `The ${what} has a choice that depends on the order of the choices; choices are shown in random order (REQ-4.19).`)
    }
    if (type === 'QUESTION: number') {
      if (!fields.answer) error(n, `The ${what} has no "Answer" line.`)
      else if (!NUMBER.test(fields.answer.value.replace(/,/g, ''))) error(fields.answer.n, `The ${what}'s answer "${fields.answer.value}" is not a number.`)
      if (!fields.unit) error(n, `The ${what} has no "Unit" line.`)
    }
  }
}

// Course files (REQ-4.10): numbered [TEACHING] or [EXAM] lines, each teaching lesson
// followed by zero or more "- [PRACTICE]" lines. Every name must be a lesson folder in
// lessons/, with the matching type, and the lesson itself must pass the lesson check.
function checkCourse(file) {
  const out = { errors: [], warnings: [], notes: [] }
  const err = (n, msg) => out.errors.push(n ? `line ${n}: ${msg}` : msg)
  if (!fs.existsSync(file)) { err(0, `No course file found at ${file}`); return { file, ...out } }
  const lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n')
  const meta = {}
  let i = 0
  if ((lines[0] || '').trim() !== '---') err(1, 'The course file must start with its details between two "---" lines.')
  else {
    for (i = 1; i < lines.length && lines[i].trim() !== '---'; i++) {
      const m = lines[i].match(/^([^:]+):\s*(.*)$/)
      if (m) meta[m[1].trim().toLowerCase()] = m[2].trim()
    }
    i++
  }
  for (const key of ['title', 'language', 'subject', 'grade', 'creator', 'licence']) {
    if (!meta[key]) err(1, `Course details: "${key}" is missing.`)
  }
  const lessonsDir = path.join(path.dirname(path.dirname(path.resolve(file))), 'lessons')
  const wanted = { TEACHING: 'teaching lesson', PRACTICE: 'practice lesson', EXAM: 'exam' }
  let count = 0
  let lastTeaching = false
  for (; i < lines.length; i++) {
    const text = lines[i]
    const n = i + 1
    if (!text.trim() || text.trim().startsWith('>')) continue
    const top = text.match(/^\d+\.\s*\[(TEACHING|EXAM)\]\s*(\S+)\s*$/)
    const sub = text.match(/^\s+-\s*\[PRACTICE\]\s*(\S+)\s*$/)
    let kind, name
    if (top) { kind = top[1]; name = top[2]; lastTeaching = kind === 'TEACHING' }
    else if (sub) {
      kind = 'PRACTICE'; name = sub[1]
      if (!lastTeaching) err(n, 'A practice lesson must come under a teaching lesson.')
    } else { err(n, `This line isn't a course entry: "${text.trim()}".`); continue }
    count++
    const lessonFile = path.join(lessonsDir, name, 'lesson.md')
    if (!fs.existsSync(lessonFile)) { err(n, `There is no lesson folder "lessons/${name}".`); continue }
    const type = (fs.readFileSync(lessonFile, 'utf8').match(/^type:\s*(.+)$/m) || [])[1]
    if ((type || '').trim() !== wanted[kind]) err(n, `"${name}" is listed as ${kind}, but its type is "${(type || '').trim()}".`)
    const r = checkLesson(lessonFile)
    if (r.errors.length) err(n, `The lesson "${name}" has ${r.errors.length} error(s); run the check on it.`)
  }
  if (count === 0) err(0, 'The course lists no lessons.')
  out.notes.push(`${count} lesson(s) in the course.`)
  return { file, ...out }
}

const targets = process.argv.slice(2)
if (targets.length === 0) {
  console.log('Usage: node tools/check-lesson.mjs <lesson folder, lesson.md or courses/<name>.md> [more ...]')
  process.exit(2)
}
let failed = false
for (const t of targets) {
  const isCourse = t.endsWith('.md') && path.basename(path.dirname(path.resolve(t))) === 'courses'
  const r = isCourse ? checkCourse(t) : checkLesson(t)
  console.log(`\n${r.file}`)
  if (r.errors.length === 0) console.log(isCourse ? '  OK: no errors. The course can be loaded.' : '  OK: no errors. The lesson can be loaded.')
  for (const e of r.errors) console.log(`  ERROR   ${e}`)
  for (const w of r.warnings) console.log(`  warning ${w}`)
  for (const n of r.notes) console.log(`  note    ${n}`)
  if (r.errors.length) failed = true
}
process.exit(failed ? 1 : 0)

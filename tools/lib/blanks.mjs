// Fill-in-the-blanks questions (REQ-4.30, D-78): reading the blanks in a question's text.
// Used by the lesson reader (lesson-parser.mjs) and the lesson check (check-lesson.mjs).
//
// A blank is 3 or more underscores, written right after the text before it (for example "ה____").
//   Typed:               ____ [זהב | הזהב]            right answers, separated by |
//   Choose in each blank: ____ [*זהב, כסף, אלומיניום]   words separated by commas, * before the right one
//   Word list:           ____                          no brackets; "- Words:" lists the right words in order

// What the lesson keeps in the text where a blank was (not a Markdown character).
export const BLANK = '＿＿＿'

export function readBlanks(text) {
  const brackets = []
  const out = text.replace(/_{3,}(?:[ \t]*\[([^\]\n]*)\])?/g, (m, br) => {
    brackets.push(br === undefined ? null : br.trim())
    return BLANK
  })
  return { text: out, brackets }
}

// Which kind the question is: 'typed', 'choice' or 'words', or a list of problems.
export function blanksKind(brackets, words) {
  const problems = []
  if (!brackets.length) return { kind: null, problems: ['Fill in the blanks: the text has no blank (3 or more underscores, ____).'] }
  const none = brackets.every((b) => b === null)
  const some = brackets.some((b) => b === null)
  let kind = null
  if (none) {
    kind = 'words'
    if (!words.length) problems.push('Fill in the blanks: the blanks have no [brackets], so a "- Words:" line is needed, with the right word for each blank in order.')
    else if (words.length !== brackets.length) problems.push(`Fill in the blanks: there are ${brackets.length} blanks but ${words.length} words in "- Words:".`)
  } else if (some) {
    problems.push('Fill in the blanks: some blanks have [brackets] and some don\'t. One question uses one kind (D-78).')
  } else {
    const choice = brackets.map((b) => b.includes('*'))
    if (choice.every(Boolean)) kind = 'choice'
    else if (!choice.some(Boolean)) kind = 'typed'
    else problems.push('Fill in the blanks: some blanks are typed ([answer]) and some are chosen ([*right, other]). One question uses one kind (D-78).')
    if (kind === 'choice') {
      brackets.forEach((b, i) => {
        const opts = choiceOptions(b)
        if (opts.length < 2) problems.push(`Fill in the blanks: blank ${i + 1} needs at least 2 words to choose from.`)
        if (opts.filter((o) => o.correct).length !== 1) problems.push(`Fill in the blanks: blank ${i + 1} needs exactly one word marked with *.`)
        if (opts.some((o) => !o.text)) problems.push(`Fill in the blanks: blank ${i + 1} has an empty word.`)
      })
    }
    if (kind === 'typed') {
      brackets.forEach((b, i) => {
        if (!typedAnswers(b).length) problems.push(`Fill in the blanks: blank ${i + 1} has no right answer in its [brackets].`)
      })
    }
    if (words.length) problems.push('Fill in the blanks: "- Words:" is only for blanks without [brackets]. One question uses one kind (D-78).')
  }
  return { kind: problems.length ? null : kind, problems }
}

export function typedAnswers(bracket) {
  return bracket.split('|').map((s) => s.trim()).filter(Boolean)
}

export function choiceOptions(bracket) {
  return bracket.split(',').map((s) => {
    const t = s.trim()
    return { text: t.replace(/^\*\s*/, '').trim(), correct: t.startsWith('*') }
  })
}

export function wordList(value) {
  return (value || '').split(',').map((s) => s.trim()).filter(Boolean)
}

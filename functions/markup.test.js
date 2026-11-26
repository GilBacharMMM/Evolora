// Marking up answers (REQ-5.12, D-64). The rules live in the website (web/src/markup.ts).
// Run: npm test (in this folder)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasMarkup, markupSegments } from '../web/src/markup.ts'

const show = (segs) => segs.map((s) => (s.kind === 'same' ? '' : s.kind === 'removed' ? '-' : '+') + (s.highlight ? '*' : '') + s.text).join('|')

test('an unchanged answer is all "same"', () => {
  assert.equal(show(markupSegments('the crown is gold', 'the crown is gold')), 'the crown is gold')
  assert.equal(hasMarkup('the crown is gold', 'the crown is gold'), false)
})

test('a replaced word: the student\'s word crossed out, the teacher\'s in colour', () => {
  assert.equal(show(markupSegments('the crown is silver', 'the crown is gold')), 'the crown is |-silver|+gold')
})

test('highlighting two words and replacing one (the acceptance example)', () => {
  const segs = markupSegments('the volume is 20 grams', 'the ⟦volume is⟧ 20 cm³')
  assert.equal(show(segs), 'the |*volume is| 20 |-grams|+cm³')
  assert.equal(hasMarkup('the volume is 20 grams', 'the ⟦volume is⟧ 20 grams'), true, 'a highlight alone counts')
})

test('Hebrew works the same way', () => {
  assert.equal(show(markupSegments('הכתר עשוי מכסף', 'הכתר עשוי מזהב')), 'הכתר עשוי |-מכסף|+מזהב')
})

test('added and removed sentences', () => {
  assert.equal(show(markupSegments('one two', 'one')), 'one|- two')
  assert.equal(show(markupSegments('one', 'one two')), 'one|+ two')
})

// Track changes in place (D-64 as changed by Gil, 2026-11-25): letter by letter, as in Word.
test('track changes: typing, deleting, highlighting and saving, letter by letter', async () => {
  const m = await import('../web/src/markup.ts')
  const segs = (letters) => show(m.segmentsOfLetters(letters))
  const original = 'Gold, is heavy'
  let L = m.lettersOf(original)
  assert.equal(m.saveMarkup(L), '', 'nothing changed: nothing saved')
  // Removing only the comma marks only the comma.
  let r = m.backspace(L, 5)
  assert.equal(segs(r.letters), 'Gold|-,| is heavy')
  assert.equal(r.caret, 4)
  // Backspace again skips what is already crossed out.
  r = m.backspace(r.letters, 5)
  assert.equal(segs(r.letters), 'Gol|-d,| is heavy')
  // Typing adds the teacher's letters where the caret is.
  L = m.lettersOf(original)
  r = m.insertText(L, 14, 14, '!')
  assert.equal(segs(r.letters), 'Gold, is heavy|+!')
  // Replacing a selection: the student's letters crossed out, then the teacher's.
  r = m.insertText(m.lettersOf(original), 9, 14, 'dense')
  assert.equal(segs(r.letters), 'Gold, is |-heavy|+dense')
  assert.equal(r.caret, 19)
  // Deleting the teacher's own letters removes them completely.
  const back = m.backspace(r.letters, r.caret)
  assert.equal(segs(back.letters), 'Gold, is |-heavy|+dens')
  // Highlight on, then off again.
  const hl = m.toggleHighlight(m.lettersOf(original), 0, 4)
  assert.equal(segs(hl), '*Gold|, is heavy')
  assert.equal(segs(m.toggleHighlight(hl, 0, 4)), 'Gold, is heavy')
  // Delete key, forward.
  assert.equal(segs(m.deleteForward(m.lettersOf(original), 4).letters), 'Gold|-,| is heavy')
  // Saved and read back the same; the student's view shows the same marks.
  const saved = m.saveMarkup(r.letters)
  assert.ok(saved.startsWith('v2:'))
  assert.equal(show(m.segmentsFor(original, saved)), 'Gold, is |-heavy|+dense')
  assert.equal(m.hasMarkup(original, saved), true)
  assert.equal(segs(m.lettersOfSegments(m.readMarkupV2(saved))), 'Gold, is |-heavy|+dense')
  // An earlier mark-up (a marked-up copy) is still shown.
  assert.equal(show(m.segmentsFor('the crown is gold', 'the crown is ⟦gold⟧')), 'the crown is |*gold')
})

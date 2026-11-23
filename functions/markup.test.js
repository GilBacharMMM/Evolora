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

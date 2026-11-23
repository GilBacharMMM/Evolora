// Class code tests (REQ-5.2, system-design 2.6). Run: npm test (in this folder)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALPHABET, CLASS_COLORS, MAX_WRONG, WAIT_MS, afterWrong, checkCharacter, makeCode, normalizeCode, validateCode, waitLeft } from './classcode.js'

test('the alphabet has 31 characters, without 0, O, 1, I and L', () => {
  assert.equal(ALPHABET.length, 31)
  assert.equal(new Set(ALPHABET).size, 31)
  for (const c of '0O1IL') assert.ok(!ALPHABET.includes(c), c)
})

test('new codes are 7 characters, valid, and different each time', () => {
  const seen = new Set()
  for (let i = 0; i < 2000; i++) {
    const code = makeCode()
    assert.equal(code.length, 7)
    assert.equal(validateCode(code), 'ok', code)
    seen.add(code)
  }
  assert.ok(seen.size > 1990)
})

test('any one mistyped character is caught ("check the code")', () => {
  for (let i = 0; i < 300; i++) {
    const code = makeCode()
    for (let pos = 0; pos < 7; pos++) {
      for (const c of ALPHABET) {
        if (c === code[pos]) continue
        const typo = code.slice(0, pos) + c + code.slice(pos + 1)
        assert.notEqual(validateCode(typo), 'ok', `${code} -> ${typo}`)
      }
    }
  }
})

test('swapping two neighbouring characters is caught', () => {
  for (let i = 0; i < 300; i++) {
    const code = makeCode()
    for (let pos = 0; pos < 6; pos++) {
      if (code[pos] === code[pos + 1]) continue
      const swapped = code.slice(0, pos) + code[pos + 1] + code[pos] + code.slice(pos + 2)
      assert.notEqual(validateCode(swapped), 'ok', `${code} -> ${swapped}`)
    }
  }
})

test('codes work in lower case, with spaces or dashes', () => {
  const code = 'ABCDEF' + checkCharacter('ABCDEF')
  assert.equal(validateCode(normalizeCode(code.toLowerCase())), 'ok')
  assert.equal(validateCode(normalizeCode(` ${code.slice(0, 3)}-${code.slice(3)} `)), 'ok')
})

test('wrong length and confusing characters are refused', () => {
  assert.equal(validateCode('ABC'), 'wrongLength')
  assert.equal(validateCode('ABCDEFGH'), 'wrongLength')
  assert.equal(validateCode('ABCDE0A'), 'badCharacter')
  assert.equal(validateCode(normalizeCode('abcdel2')), 'badCharacter')
})

test('a fixed random source gives the expected code', () => {
  assert.equal(makeCode(() => 0), 'AAAAAAA')
  const code = makeCode(() => 30)
  assert.equal(code.slice(0, 6), '999999')
  assert.equal(validateCode(code), 'ok')
})

test('10 wrong codes in a row mean a 5-minute wait, then counting starts again', () => {
  let state
  const now = 1_000_000
  for (let i = 1; i < MAX_WRONG; i++) {
    const r = afterWrong(state, now)
    assert.equal(r.mustWait, false)
    assert.equal(r.state.wrong, i)
    state = r.state
  }
  const tenth = afterWrong(state, now)
  assert.equal(tenth.mustWait, true)
  assert.equal(waitLeft(tenth.state, now), WAIT_MS)
  assert.equal(waitLeft(tenth.state, now + WAIT_MS - 1000), 1000)
  assert.equal(waitLeft(tenth.state, now + WAIT_MS), 0)
  const after = afterWrong(tenth.state, now + WAIT_MS + 1)
  assert.equal(after.state.wrong, 1)
  assert.equal(after.mustWait, false)
})

test('class colours are 8 different colours', () => {
  assert.equal(new Set(CLASS_COLORS).size, 8)
})

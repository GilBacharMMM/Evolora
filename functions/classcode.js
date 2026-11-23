// Class codes (REQ-5.2, system-design 2.6), kept apart from the cloud plumbing so they can be
// tested automatically.
//
// A code has 7 characters from ALPHABET (31 characters, without 0, O, 1, I and L).
// The first 6 are random; the 7th is a check character chosen so that
//   1*v1 + 2*v2 + ... + 7*v7  is divisible by 31   (v = the character's place in ALPHABET).
// Because 31 is a prime number, changing any one character, or swapping two neighbouring
// different characters, always breaks this, so a typing mistake is caught at once.

import crypto from 'node:crypto'

export const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 7
const N = ALPHABET.length // 31
const INVERSE_OF_7 = 9 // 7 * 9 = 63 = 2 * 31 + 1

// The weighted sum of the first characters, as numbers 0..30.
function weightedSum(values) {
  return values.reduce((sum, v, i) => sum + (i + 1) * v, 0)
}

export function checkCharacter(first6) {
  const values = [...first6].map((c) => ALPHABET.indexOf(c))
  if (values.length !== CODE_LENGTH - 1 || values.includes(-1)) throw new Error('Six characters from the alphabet are needed.')
  const v7 = (((-weightedSum(values) * INVERSE_OF_7) % N) + N) % N
  return ALPHABET[v7]
}

// A new random code. `randomInt(n)` returns a whole number from 0 to n-1 (replaceable in tests).
export function makeCode(randomInt = crypto.randomInt) {
  let first6 = ''
  for (let i = 0; i < CODE_LENGTH - 1; i++) first6 += ALPHABET[randomInt(N)]
  return first6 + checkCharacter(first6)
}

// What the student typed, tidied: capital letters, without spaces or dashes.
export function normalizeCode(typed) {
  return String(typed ?? '').toUpperCase().replace(/[\s-]/g, '')
}

// 'ok' | 'wrongLength' | 'badCharacter' | 'checkFailed'. Anything but 'ok' means "check the code".
export function validateCode(code) {
  if (code.length !== CODE_LENGTH) return 'wrongLength'
  const values = [...code].map((c) => ALPHABET.indexOf(c))
  if (values.includes(-1)) return 'badCharacter'
  return weightedSum(values) % N === 0 ? 'ok' : 'checkFailed'
}

// Too many wrong codes (REQ-5.2): after MAX_WRONG wrong codes in a row, wait WAIT_MS.
export const MAX_WRONG = 10
export const WAIT_MS = 5 * 60 * 1000

// `attempts` is the saved { wrong, waitUntil } (or undefined). Returns how long to wait, in ms (0 = may try).
export function waitLeft(attempts, now) {
  const until = attempts?.waitUntil || 0
  return until > now ? until - now : 0
}

// After a wrong code: the new saved state, and whether the student must now wait.
export function afterWrong(attempts, now) {
  const wrong = (waitLeft(attempts, now) ? 0 : attempts?.wrong || 0) + 1
  if (wrong >= MAX_WRONG) return { state: { wrong: 0, waitUntil: now + WAIT_MS }, mustWait: true }
  return { state: { wrong, waitUntil: 0 }, mustWait: false }
}

// The colours new classes get, in turn (D-57). All are dark enough for white text.
export const CLASS_COLORS = ['#0E6B73', '#3B5BA9', '#A8432F', '#2E7D4F', '#7A4EA3', '#8A5A00', '#B0306A', '#3D4752']

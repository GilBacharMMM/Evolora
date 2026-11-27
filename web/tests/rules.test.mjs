// Tests of the browser check (REQ-11.1, D-84, D-86) and the automatic sign-out rules (REQ-3.5, D-85).
// Run: npm test (in web/)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSupported, whichBrowser } from '../src/browser.ts'
import { IDLE_MS, MAX_MS, WARN_MS, signOutState } from '../src/signOutRules.ts'

const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
const CROS = 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)'
const chromeUa = (v, base = WIN) => `${base} AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`
const brands = (...b) => b.map(([brand, version]) => ({ brand, version: String(version) }))

const cases = [
  ['Chrome on Windows', chromeUa(158), brands(['Google Chrome', 158], ['Chromium', 158], ['Not A(Brand', 24]), 'chrome', true],
  ['Chrome on a Chromebook', chromeUa(156, CROS), brands(['Chromium', 156], ['Google Chrome', 156]), 'chrome', true],
  ['Chrome on a Mac', chromeUa(158, MAC), brands(['Google Chrome', 158]), 'chrome', true],
  ['Edge on Windows', `${chromeUa(158)} Edg/158.0.0.0`, brands(['Microsoft Edge', 158], ['Chromium', 158]), 'edge', true],
  ['Firefox on Windows', `${WIN}; rv:157.0) Gecko/20100101 Firefox/157.0`, null, 'firefox', true],
  ['Firefox ESR 153', `${WIN}; rv:153.0) Gecko/20100101 Firefox/153.0`, null, 'firefox', true],
  ['Firefox ESR 140 (too old)', `${WIN}; rv:140.0) Gecko/20100101 Firefox/140.0`, null, 'firefox', false],
  ['Safari 27 on a Mac', `${MAC} AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15`, null, 'safari', true],
  ['Safari 26 on a Mac', `${MAC} AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15`, null, 'safari', true],
  ['Old Chrome', chromeUa(120), brands(['Google Chrome', 120]), 'chrome', false],
  ['Old Firefox', `${WIN}; rv:115.0) Gecko/20100101 Firefox/115.0`, null, 'firefox', false],
  ['Old Safari', `${MAC} AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15`, null, 'safari', false],
  ['Brave (Chrome engine, own brand)', chromeUa(158), brands(['Brave', 158], ['Chromium', 158]), 'other', false],
  ['Opera', `${chromeUa(158)} OPR/120.0.0.0`, brands(['Opera', 120], ['Chromium', 158]), 'other', false],
  ['Chrome without a window (test robot)', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36', brands(['Google Chrome', 157]), 'chrome', true],
  ['Plain Chromium (test robot)', chromeUa(158), brands(['Chromium', 158]), 'other', false],
  ['Samsung Internet', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36', brands(['Samsung Internet', 27]), 'other', false],
  ['Internet Explorer', 'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko', null, 'other', false],
]

for (const [name, ua, b, expected, ok] of cases) {
  test(`browser: ${name}`, () => {
    const info = whichBrowser(ua, b)
    assert.equal(info.name, expected)
    assert.equal(isSupported(info), ok)
  })
}

const l = { idle: IDLE_MS, max: MAX_MS }
const MIN = 60_000

test('sign-out: active a minute ago, nothing happens', () => {
  assert.deepEqual(signOutState(100 * MIN, 99 * MIN, 0, l), { out: null, warnLeft: null })
})
test('sign-out: the warning comes after 28 minutes without activity', () => {
  assert.equal(signOutState(28 * MIN - 1000, 0, 0, l).warnLeft, null)
  assert.equal(signOutState(28 * MIN, 0, 0, l).warnLeft, WARN_MS)
  assert.equal(signOutState(29 * MIN, 0, 0, l).warnLeft, MIN)
})
test('sign-out: signed out after 30 minutes without activity', () => {
  assert.equal(signOutState(30 * MIN, 0, 0, l).out, 'idle')
})
test('sign-out: after 8 hours even when active all the time', () => {
  assert.equal(signOutState(8 * 60 * MIN - 1000, 8 * 60 * MIN - 2000, 0, l).out, null)
  assert.equal(signOutState(8 * 60 * MIN, 8 * 60 * MIN, 0, l).out, 'max')
})

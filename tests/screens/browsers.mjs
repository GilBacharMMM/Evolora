#!/usr/bin/env node
// Browser tests (REQ-11.1, REQ-3.5): in Google Chrome, Microsoft Edge, Firefox and WebKit
// (Safari's engine), on the test site:
//   1. the site opens (no "please use another browser" message);
//   2. a recording is made with a pretend microphone, in the format Evolora chooses;
//   3. every browser's recording plays in every other browser;
//   4. formulas in a lesson are drawn, and the time on the lesson is sent;
//   5. automatic sign-out: the warning after 28 minutes without activity, "Stay signed in",
//      signing out after 30 minutes, a half-typed open answer kept, the same page after signing
//      in again, and signing out after 8 hours even with activity. The browser's clock is moved
//      forward, so the test doesn't take 8 hours.
//
//   cd tests/screens
//   node browsers.mjs                  (all four)
//   node browsers.mjs firefox webkit   (some)

import { BROWSERS } from './lib/browsers.mjs'
import { SITE, signInAs, tr } from './lib/helpers.mjs'
import * as data from '../../tools/lib/screen-test-data.mjs'

const argv = process.argv.slice(2)
const asked = argv.filter((a) => a in BROWSERS)
const names = asked.length ? asked : Object.keys(BROWSERS)
const LANG = 'en'
const STUDENT = 'test-student-2'
const LESSON = 'archimedes-density-teaching-1'
const MIN = 60_000

let failures = 0
let count = 0
function check(label, ok, detail = '') {
  count++
  if (!ok) failures++
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${label}${!ok && detail ? ` (${detail})` : ''}`)
}

// The same choice as web/src/components/Recorder.tsx.
const FORMATS = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']

async function newPage(browser, { clock = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-US' })
  await context.addInitScript(() => {
    try {
      localStorage.setItem('evolora.language', 'en')
    } catch {}
  })
  if (clock) await context.clock.install()
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  return page
}

async function record(page) {
  return page.evaluate(async (formats) => {
    const format = formats.find((f) => MediaRecorder.isTypeSupported(f))
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const rec = format ? new MediaRecorder(stream, { mimeType: format }) : new MediaRecorder(stream)
    const chunks = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    const done = new Promise((r) => (rec.onstop = r))
    rec.start()
    await new Promise((r) => setTimeout(r, 2500))
    rec.stop()
    await done
    stream.getTracks().forEach((t) => t.stop())
    const blob = new Blob(chunks, { type: rec.mimeType || format || 'audio/webm' })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let bin = ''
    for (const b of bytes) bin += String.fromCharCode(b)
    return { format: format || '(browser default)', type: blob.type, size: blob.size, base64: btoa(bin) }
  }, FORMATS)
}

// Plays a recording in an <audio> element, as the teacher's page does; reports whether it loaded and how long it is.
async function plays(page, rec) {
  return page.evaluate(async ({ base64, type }) => {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const url = URL.createObjectURL(new Blob([bytes], { type: type.split(';')[0] }))
    const audio = new Audio()
    audio.muted = true
    const result = await new Promise((resolve) => {
      const t = setTimeout(() => resolve({ ok: false, why: 'timed out' }), 10000)
      audio.oncanplay = () => {
        clearTimeout(t)
        resolve({ ok: true })
      }
      audio.onerror = () => {
        clearTimeout(t)
        resolve({ ok: false, why: `error ${audio.error?.code}` })
      }
      audio.src = url
      audio.load()
    })
    if (!result.ok) return result
    try {
      await audio.play()
      await new Promise((r) => setTimeout(r, 400))
      const played = audio.currentTime > 0
      audio.pause()
      if (!played) return { ok: false, why: 'did not move forward while playing' }
    } catch (e) {
      return { ok: false, why: `play() refused: ${e.message}` }
    }
    return { ok: true }
  }, rec)
}

async function signIn(page) {
  await signInAs(page, LANG, 'Test Student 2')
}

// The first open question's answer box (the questions before it are answered: answerUpToOpen).
async function openAnswerBox(page) {
  const box = page.locator('form.open-answer textarea').first()
  await box.waitFor()
  await box.scrollIntoViewIfNeeded()
  return box
}

const recordings = {}
for (const name of names) {
  const b = BROWSERS[name]
  console.log(`\n=== ${b.label} ===`)
  const browser = await b.launch()
  try {
    // 1. The site opens.
    const page = await newPage(browser)
    if (name !== 'firefox') await page.context().grantPermissions(['microphone'], { origin: SITE }).catch(() => {})
    await page.goto(SITE)
    await page.locator('.top-bar, .browser-list').first().waitFor()
    check('the site opens (no "please use another browser" message)', (await page.locator('.browser-list').count()) === 0)

    // 2. Recording.
    try {
      const rec = await record(page)
      recordings[name] = rec
      check(`records a 2.5-second answer: ${rec.type || rec.format}, ${Math.round(rec.size / 1024)} KB`, rec.size > 1000, `${rec.size} bytes`)
    } catch (e) {
      check('records an answer', false, String(e.message || e).split('\n')[0])
    }
    await page.context().close()
  } finally {
    await browser.close()
  }
}

// 3. Every recording in every browser.
console.log('\n=== Recordings played in every browser ===')
for (const name of names) {
  const browser = await BROWSERS[name].launch()
  try {
    const page = await newPage(browser)
    await page.goto(SITE)
    for (const [from, rec] of Object.entries(recordings)) {
      const r = await plays(page, rec)
      check(`${BROWSERS[name].label} plays the recording made in ${BROWSERS[from].label} (${rec.type.split(';')[0]})`, r.ok, r.why)
    }
  } finally {
    await browser.close()
  }
}

// 4 and 5, in English (the student's own language is put back at the end).
const restoreLanguage = await data.rememberLanguages([STUDENT])
await data.setLanguage(STUDENT, LANG)
await data.freshStudentWork(STUDENT)
try {
  for (const name of names) {
    console.log(`\n=== ${BROWSERS[name].label}: lesson and automatic sign-out ===`)
    const browser = await BROWSERS[name].launch()
    try {
      // 4. Formulas and time on the lesson (no pretend clock here: real seconds).
      {
        const page = await newPage(browser)
        const sent = []
        page.on('request', (r) => {
          if (r.url().includes('/lessonTime')) sent.push(r.postData() || '')
        })
        await page.goto(SITE)
        await signIn(page)
        await page.goto(`${SITE}/lesson/${LESSON}`)
        await page.locator('article.lesson').waitFor()
        for (let i = 0; i < 24; i++) {
          await page.mouse.move(300 + (i % 5) * 40, 300)
          await page.keyboard.press('Shift')
          await page.waitForTimeout(1000)
        }
        const working = sent.map((s) => JSON.parse(s)?.data?.netMs ?? 0).reduce((a, b) => a + b, 0)
        check(`the time on the lesson is sent (${Math.round(working / 1000)} seconds working)`, working > 10_000, `${sent.length} reports`)
        await page.context().close()
      }

      // 5. Automatic sign-out, with the browser's clock moved forward.
      await data.freshStudentWork(STUDENT)
      await data.answerUpToOpen(STUDENT, LESSON)
      const page = await newPage(browser, { clock: true })
      await page.goto(SITE)
      await signIn(page)
      await page.goto(`${SITE}/lesson/${LESSON}`)
      await page.locator('article.lesson').waitFor()
      const box = await openAnswerBox(page)
      // Formulas (MathLive) are drawn: each has its drawn parts and takes up room on the page.
      const formulas = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('.formula'))
        return { count: all.length, drawn: all.filter((e) => e.getBoundingClientRect().width > 4 && e.querySelector('[class^="ML__"], [class*=" ML__"]')).length }
      })
      check(`formulas are drawn (${formulas.drawn} of ${formulas.count})`, formulas.count > 0 && formulas.drawn === formulas.count)
      const half = 'Half an answer, typed just before going away'
      await box.fill(half)
      const warning = page.locator('.signout-warning')

      await page.clock.runFor(27 * MIN)
      check('no warning after 27 minutes without activity', (await warning.count()) === 0)
      await page.clock.runFor(MIN + 2000)
      await warning.waitFor({ timeout: 5000 }).catch(() => {})
      const text = (await warning.count()) ? await warning.innerText() : ''
      check('the warning shows after 28 minutes, with "Stay signed in"', text.includes(tr(LANG, 'autoSignOut.warning')) && text.includes(tr(LANG, 'autoSignOut.stay')), text.slice(0, 80))
      await page.getByRole('button', { name: tr(LANG, 'autoSignOut.stay') }).click()
      await page.clock.runFor(2000)
      check('"Stay signed in" closes the warning', (await warning.count()) === 0)
      await page.clock.runFor(27 * MIN)
      check('still signed in 27 minutes later', (await page.locator('.account-name').count()) > 0 && (await warning.count()) === 0)
      await page.clock.runFor(3 * MIN + 2000)
      await page.locator('.signed-out-notice').waitFor({ timeout: 10000 }).catch(() => {})
      check('signed out 30 minutes after "Stay signed in", with a message why', (await page.locator('.signed-out-notice').count()) > 0 && (await page.locator('.account-name').count()) === 0)
      check('the address is still the lesson', page.url().endsWith(`/lesson/${LESSON}`), page.url())
      await signIn(page)
      await page.locator('article.lesson').waitFor()
      check('after signing in again, the same lesson opens', page.url().endsWith(`/lesson/${LESSON}`), page.url())
      const again = await openAnswerBox(page)
      check('the half-typed open answer is still there', (await again.inputValue()) === half, await again.inputValue())

      // 8 hours with activity all the time: a click every 20 minutes.
      let out = false
      for (let i = 0; i < 26 && !out; i++) {
        await page.mouse.click(10, 400)
        await page.clock.runFor(20 * MIN)
        out = (await page.locator('.account-name').count()) === 0
        if (out) check(`signed out after 8 hours even with activity (after ${Math.round(((i + 1) * 20) / 60 * 10) / 10} hours)`, i + 1 >= 24, `${i + 1} times 20 minutes`)
      }
      if (!out) check('signed out after 8 hours even with activity', false, 'still signed in after 8 hours 40 minutes')
      await page.locator('.signed-out-notice').waitFor({ timeout: 10000 }).catch(() => {})
      check('the message says 8 hours have passed', ((await page.locator('.signed-out-notice').innerText().catch(() => '')) || '').includes(tr(LANG, 'autoSignOut.signedOutMax').slice(0, 30)))
      await page.context().close()
    } catch (e) {
      check('the lesson and sign-out checks ran to the end', false, String(e.message || e).split('\n')[0])
    } finally {
      await browser.close()
    }
  }
} finally {
  await data.freshStudentWork(STUDENT)
  await restoreLanguage()
}

console.log(`\n${count} checks, ${failures} failed.`)
process.exit(failures ? 1 : 0)

#!/usr/bin/env node
// Browser tests (REQ-11.1, REQ-3.5): in Google Chrome, Microsoft Edge, Firefox and WebKit
// (Safari's engine), on the test site:
//   1. the site opens (no "please use another browser" message);
//   2. a recording is made with a pretend microphone, in the format Evolora chooses;
//   3. every browser's recording plays in every other browser;
//   4. formulas in a lesson are drawn, and the time on the lesson is sent;
//   5. automatic sign-out, with the test site's shortened times (3 minutes without activity,
//      1 minute in all): the warning 2 minutes before, "Stay signed in", signing out, a
//      half-typed open answer kept, the same page after signing in again, and signing out at the
//      time limit even with activity. It takes about 5 minutes per browser.
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
// A text in any of the three languages: lesson pages follow the class language (REQ-9.5),
// which may differ from the student's own.
const anyLang = (key) => ['he', 'ar', 'en'].map((l) => tr(l, key))
const hasText = (text, key) => anyLang(key).some((t) => text.includes(t))

let failures = 0
let count = 0
const notes = []
// Something the robot can't check here, said in the report.
function note(text) {
  notes.push(text)
  console.log(`  NOTE  ${text}`)
}
function check(label, ok, detail = '') {
  count++
  if (!ok) failures++
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${label}${!ok && detail ? ` (${detail})` : ''}`)
}

// The same choice as web/src/components/Recorder.tsx.
const FORMATS = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']

async function newPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-US' })
  await context.addInitScript(() => {
    try {
      localStorage.setItem('evolora.language', 'en')
    } catch {}
  })
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

    // The accessibility statement (REQ-12.10): its link at the bottom, reached with the keyboard
    // alone, opens the statement without signing in.
    {
      const link = page.locator('.site-footer a[href="/accessibility"]')
      check('the sign-in page has an "Accessibility" link at the bottom', (await link.count()) === 1)
      if (name === 'webkit') {
        // Safari's Tab key skips links unless "Press Tab to highlight each item" is turned on.
        await link.focus()
      } else {
        for (let i = 0; i < 80 && !(await link.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
      }
      const focused = await link.evaluate((el) => el === document.activeElement)
      if (name !== 'webkit') check('the link can be reached with the Tab key', focused)
      await page.keyboard.press('Enter')
      await page.waitForURL(/\/accessibility$/).catch(() => {})
      await page.locator('.terms-text h2').first().waitFor({ timeout: 15000 }).catch(() => {})
      const shown = await page.locator('main').innerText().catch(() => '')
      check('Enter opens the accessibility statement, without signing in', page.url().endsWith('/accessibility') && /bachargil@gmail\.com/.test(shown), page.url())
      await page.goto(SITE)
      await page.locator('.top-bar').waitFor()
    }

    // 2. Recording.
    const canRecord = await page.evaluate(() => typeof MediaRecorder !== 'undefined')
    if (!canRecord && name === 'webkit') {
      note('recording: not possible in WebKit for Windows (it has no recorder); check in Safari on a Mac')
    } else try {
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
      const base = rec.type.split(';')[0]
      if (name === 'webkit' && !(await page.evaluate((t) => new Audio().canPlayType(t), base))) {
        note(`${BROWSERS[name].label} can't play ${base} in its Windows build; check in Safari on a Mac`)
        continue
      }
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
      // 4. The time on the lesson.
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

      // 5. Automatic sign-out, in real time, with the test site's shortened times (REQ-3.5):
      //    3 minutes without activity (so the warning comes after 1 minute) and 60 minutes in all.
      //    The rules for the real times (28, 30 minutes and 8 hours) are tested in web/tests.
      await data.freshStudentWork(STUDENT)
      await data.answerUpToOpen(STUDENT, LESSON)
      const page = await newPage(browser)
      await page.goto(`${SITE}/?signout-test=3,60`)
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
      const signedIn = async () => (await page.locator('.account-name').count()) > 0

      await page.waitForTimeout(50_000)
      check('no warning 50 seconds after the last activity', (await warning.count()) === 0 && (await signedIn()))
      await warning.waitFor({ timeout: 20_000 }).catch(() => {})
      const text = (await warning.count()) ? await warning.innerText() : ''
      check('the warning shows 2 minutes before the sign-out, with "Stay signed in"', hasText(text, 'autoSignOut.warning') && hasText(text, 'autoSignOut.stay'), text.slice(0, 80))
      await page.waitForTimeout(5000)
      await warning.locator('button').click()
      await page.waitForTimeout(1500)
      check('"Stay signed in" closes the warning', (await warning.count()) === 0)
      const stayedAt = Date.now()
      await page.waitForTimeout(50_000)
      check('still signed in, with no warning, 50 seconds later', (await signedIn()) && (await warning.count()) === 0)
      await page.locator('.signed-out-notice').waitFor({ timeout: 150_000 }).catch(() => {})
      const outAfter = Math.round((Date.now() - stayedAt) / 1000)
      check(`signed out 3 minutes after "Stay signed in" (after ${outAfter} seconds), with a message why`, !(await signedIn()) && outAfter >= 175 && outAfter <= 190, `${outAfter} seconds`)
      check('the address is still the lesson', page.url().endsWith(`/lesson/${LESSON}`), page.url())
      await signIn(page)
      await page.locator('article.lesson').waitFor()
      check('after signing in again, the same lesson opens', page.url().endsWith(`/lesson/${LESSON}`), page.url())
      const again = await openAnswerBox(page)
      check('the half-typed open answer is still there', (await again.inputValue()) === half, await again.inputValue())
      await page.goto(`${SITE}/?signout-test=off`)
      await page.context().close()

      // The limit in all (8 hours on the real site), shortened to 1 minute: signed out even when
      // clicking every few seconds the whole time.
      const short = await newPage(browser)
      await short.goto(`${SITE}/?signout-test=30,1`)
      const began = Date.now()
      await signIn(short)
      let out = false
      while (!out && Date.now() - began < 100_000) {
        await short.mouse.click(10, 400)
        await short.waitForTimeout(3000)
        out = (await short.locator('.account-name').count()) === 0
      }
      const after = Math.round((Date.now() - began) / 1000)
      check(`signed out at the time limit even with activity (after ${after} seconds of a 60-second limit)`, out && after >= 55, out ? '' : 'still signed in')
      await short.locator('.signed-out-notice').waitFor({ timeout: 10000 }).catch(() => {})
      check('the message says 8 hours have passed', hasText((await short.locator('.signed-out-notice').innerText().catch(() => '')) || '', 'autoSignOut.signedOutMax'))
      await short.goto(`${SITE}/?signout-test=off`)
      await short.context().close()
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
if (notes.length) console.log(`Not checked here (${notes.length}): see the NOTE lines.`)
process.exit(failures ? 1 : 0)

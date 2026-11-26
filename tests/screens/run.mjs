#!/usr/bin/env node
// Automatic screen tests (system-design 8.1): a robot opens Google Chrome at a Chromebook size
// (1366 by 768) and goes through the main flows on the test site, in Hebrew, Arabic and English,
// checking every screen it visits. Screenshots and a report go to tests/screens/out/.
//
//   cd tests/screens
//   npm install          (once)
//   npm test             (all three languages)
//   npm test -- en       (one language)
//   npm test -- --show   (watch the robot in a Chrome window)

import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { Screens, OUT } from './lib/checks.mjs'
import { StepFailed, StepFailedGoOn } from './lib/helpers.mjs'
import { joinClass, studentLesson, teacherGrades, termsFirst } from './lib/flows.mjs'
import { writeReport } from './lib/report.mjs'
import * as data from '../../tools/lib/screen-test-data.mjs'

const argv = process.argv.slice(2)
const LANGS = argv.filter((a) => ['he', 'ar', 'en'].includes(a))
const langs = LANGS.length ? LANGS : ['he', 'ar', 'en']
const show = argv.includes('--show')

const USERS = ['test-student-1', 'test-student-5', 'test-student-7', 'test-teacher-1']

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

console.log('Preparing the test data...')
const restoreClass = await data.prepareClass()
const restoreLanguages = await data.rememberLanguages(USERS)
const { code: classCode } = await data.classInfo()
const titles = await data.contentTitles()

const browser = await chromium.launch({ channel: 'chrome', headless: !show, args: ['--disable-quic'] })
const results = []
const started = Date.now()
try {
  for (const lang of langs) {
    console.log(`\n=== ${lang} ===`)
    const screens = new Screens(lang, titles)
    for (const uid of USERS) await data.setLanguage(uid, lang)
    const flows = [
      ['1. A student goes through the Archimedes lesson', studentLesson, async () => data.freshStudentWork('test-student-1')],
      ['2. The terms of use come first for Test Student 7', termsFirst, async () => data.freshStudent7()],
      ['3. Test Student 7 joins the test class with its code', joinClass, null],
      ['4. A teacher grades Test Student 5\'s open answer', teacherGrades, async () => data.fillStudent5Work()],
    ]
    let page = null
    for (const [title, flow, prepare] of flows) {
      const result = { lang, title, steps: [] }
      results.push(result)
      console.log(title)
      // Flow 3 goes on from flow 2, in the same browser window (Test Student 7 has just agreed).
      if (prepare || !page) {
        if (page) await page.context().close()
        if (prepare) await prepare()
        const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: lang === 'en' ? 'en-US' : lang === 'he' ? 'he-IL' : 'ar' })
        await context.addInitScript((l) => {
          try {
            localStorage.setItem('evolora.language', l)
          } catch {}
        }, lang)
        page = await context.newPage()
        page.setDefaultTimeout(15000)
        screens.watch(page)
      }
      let stopped = false
      const step = async (label, fn) => {
        if (stopped) return result.steps.push({ label, status: 'skipped' })
        const before = screens.screens.length
        try {
          await fn()
          const problems = screens.screens.slice(before).flatMap((s) => s.problems)
          result.steps.push({ label, status: problems.length ? 'problems' : 'pass', screens: screens.screens.slice(before) })
          console.log(`  ${problems.length ? 'CHECK' : 'pass '}  ${label}`)
          for (const p of problems) console.log(`         ${p.check}: ${p.text}`)
        } catch (e) {
          stopped = !(e instanceof StepFailedGoOn)
          const message = e instanceof StepFailed ? e.message : String(e.message || e).split('\n')[0]
          let shot = null
          if (!(e instanceof StepFailedGoOn)) {
            try {
              await screens.check(page, 'failed', label.slice(0, 30))
              shot = screens.screens.at(-1)
            } catch {}
          }
          result.steps.push({ label, status: 'fail', message, screens: [...screens.screens.slice(before, shot ? -1 : undefined), ...(shot ? [shot] : [])] })
          console.log(`  FAIL   ${label}\n         ${message}`)
        }
      }
      await flow({ page, lang, screens, step, classCode })
    }
    if (page) await page.context().close()
    // Test Student 7 back as after a reset: not agreed, in no class.
    await data.freshStudent7()
  }
} finally {
  await browser.close()
  await data.freshStudentWork('test-student-1')
  await restoreLanguages()
  await restoreClass()
}

const file = writeReport(results, { classCode, seconds: Math.round((Date.now() - started) / 1000) })
const steps = results.flatMap((r) => r.steps)
const failed = steps.filter((s) => s.status === 'fail').length
const withProblems = steps.filter((s) => s.status === 'problems').length
console.log(`\n${steps.length} steps: ${steps.filter((s) => s.status === 'pass').length} passed, ${withProblems} with screen problems, ${failed} failed, ${steps.filter((s) => s.status === 'skipped').length} skipped.`)
console.log(`Report: ${path.relative(process.cwd(), file)}`)
process.exit(failed || withProblems ? 1 : 0)

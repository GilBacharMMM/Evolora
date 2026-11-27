// The checks made on every screen the robot visits (system-design 8.1):
// - no untranslated text (REQ-9.1)
// - the page direction matches the language (REQ-9.2)
// - no console errors
// - no sideways scrolling at a Chromebook size (REQ-11.1)
// - every status has a word, not only a colour (REQ-12.3)
// Each screen also gets a screenshot.

import fs from 'node:fs'
import path from 'node:path'

export const OUT = path.resolve(import.meta.dirname, '..', 'out')

// Words that may appear in Latin letters on a Hebrew or Arabic screen: the made-up test names,
// the product name, the language menu's own name for English, keyboard keys, and licence names.
const ALLOWED_LATIN = [
  /Test (Student|Teacher) \d+/g,
  /Test Class 7A/g,
  /Test English 7A/g,
  /Math and Science teacher/g, // the test teachers' shown names (REQ-12.6)
  /English teacher/g,
  /Test School/g,
  /\bEvolora\b/g,
  /\bGoogle( Chrome)?\b/g, // brand names, as in "Sign in with Google"
  /\bEnglish\b/g,
  /\b(Ctrl|Alt|Shift|Enter|Esc|Tab)\b/g,
  /\bCSV\b/g, // the name of a file type
  /CC BY(-SA|-NC|-ND)*( \d\.\d)?/g,
  /[\w.+-]+@[\w-]+(\.[\w-]+)+/g, // email addresses
  /https?:\/\/\S+/g,
]

// Runs inside the page: gathers what the checks need.
function inspect(lang) {
  const out = { lang: document.documentElement.lang, dir: document.documentElement.dir, foreign: [], colourOnly: [] }
  const doc = document.documentElement
  out.scrollWidth = doc.scrollWidth
  out.clientWidth = doc.clientWidth
  // Lesson content, lesson and course titles (marked with their own language), people's answers and
  // the test users' names are content, not interface text.
  const CONTENT = 'article.lesson, [lang]:not(html), textarea, input, select option[value="en"], .switch-name, .account-name, .account-popup, [contenteditable], code, .grading-answer, .answer-text, .track-changes'
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const latin = /[A-Za-z]{2,}/
  const hebArab = /[֐-׿؀-ۿ]/
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const el = n.parentElement
    if (!el || el.closest(CONTENT) || el.closest('script,style,noscript') || !visible(el)) continue
    if (lang === 'en' ? hebArab.test(text) : latin.test(text)) out.foreign.push(text.slice(0, 120))
  }
  // A status shown only as a colour: a small, coloured element with no word, no label and no title,
  // and no word right next to it.
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el) || el.closest('svg') || el.tagName === 'IMG' || el.tagName === 'svg') continue
    if (el.closest('article.lesson')) continue
    const r = el.getBoundingClientRect()
    if (r.width > 48 || r.height > 48 || r.width < 4 || r.height < 4) continue
    if (el.textContent.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || el.querySelector('svg, img')) continue
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'LABEL', 'BR', 'HR'].includes(el.tagName)) continue
    const s = getComputedStyle(el)
    const bg = s.backgroundColor
    const m = bg.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/)
    if (!m || (m[4] !== undefined && Number(m[4]) < 0.2)) continue
    const [r_, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])]
    const grey = Math.max(r_, g, b) - Math.min(r_, g, b) < 24
    if (grey) continue
    // A word right beside it (in its parent, or the parent's parent when the mark is in a decorative
    // group such as a row of progress dots) explains the colour.
    const p1 = el.parentElement
    const p2 = p1?.getAttribute('aria-hidden') === 'true' ? p1.parentElement : null
    if ([p1, p2].some((p) => p && (p.textContent.trim() || p.getAttribute('aria-label')))) continue
    out.colourOnly.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} (${bg})`)
  }
  return out
}

function stripAllowed(text) {
  let t = text
  for (const re of ALLOWED_LATIN) t = t.replace(re, '')
  return t
}

export class Screens {
  // titles: lesson and course titles, which are content in their own language.
  // folder: where the screenshots go, inside out/ (one per browser and language).
  constructor(lang, titles = [], folder = lang) {
    this.lang = lang
    this.titles = titles
    this.folder = folder
    this.dir = path.join(OUT, folder)
    fs.mkdirSync(this.dir, { recursive: true })
    this.screens = []
    this.count = 0
  }

  // Watches a page for console errors; they are reported on the next screen check.
  watch(page) {
    page._errors = []
    page.on('console', (m) => {
      // Messages from embedded videos and simulations (YouTube, PhET) are theirs, not Evolora's.
      if (m.type() !== 'error' || /youtube|ytimg|googlevideo|phet\.colorado/.test(m.location()?.url || '')) return
      // A test computer's own network dropping for a moment isn't a problem in the app.
      if (/net::ERR_(INTERNET_DISCONNECTED|NETWORK_CHANGED|CONNECTION_RESET|QUIC)/.test(m.text())) return
      page._errors.push(m.text().slice(0, 300))
    })
    page.on('pageerror', (e) => {
      const text = String(e.message || e)
      // The PhET simulations' sound, in WebKit's Windows test build, which has no sound decoding
      // (real Safari has it). It is the simulation's, not Evolora's.
      if (/decodeAudioData/.test(text) && /audioBufferProperty/.test(text)) return
      page._errors.push(`Page error: ${text.slice(0, 300)}`)
    })
  }

  async check(page, flow, name) {
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(400)
    const info = await page.evaluate(inspect, this.lang)
    const expectedDir = this.lang === 'en' ? 'ltr' : 'rtl'
    const problems = []
    if (info.lang !== this.lang) problems.push({ check: 'language', text: `The page says its language is "${info.lang}", expected "${this.lang}".` })
    if (info.dir !== expectedDir) problems.push({ check: 'direction', text: `The page direction is "${info.dir}", expected "${expectedDir}" (REQ-9.2).` })
    const withoutTitles = (t) => this.titles.reduce((acc, title) => acc.split(title).join(''), t)
    const foreignLetters = this.lang === 'en' ? /[֐-׿؀-ۿ]/ : /[A-Za-z]{2,}/
    const foreign = [...new Set(info.foreign.filter((t) => foreignLetters.test(stripAllowed(withoutTitles(t)))))]
    if (foreign.length) problems.push({ check: 'translation', text: `Text not in ${this.lang}: ${foreign.map((t) => `"${t}"`).join(', ')} (REQ-9.1).` })
    if (info.scrollWidth > info.clientWidth + 1) problems.push({ check: 'width', text: `The page scrolls sideways: ${info.scrollWidth} pixels wide in a ${info.clientWidth}-pixel window (REQ-11.1).` })
    const colourOnly = [...new Set(info.colourOnly)]
    if (colourOnly.length) problems.push({ check: 'status words', text: `Coloured marks with no word: ${colourOnly.slice(0, 5).join(', ')} (REQ-12.3).` })
    const errors = [...new Set(page._errors || [])]
    page._errors = []
    if (errors.length) problems.push({ check: 'console', text: `Console errors: ${errors.join(' | ')}` })
    this.count++
    const file = `${String(this.count).padStart(2, '0')}-${flow}-${name}.png`.replace(/[^\w.-]+/g, '-')
    await page.screenshot({ path: path.join(this.dir, file), fullPage: false })
    this.screens.push({ flow, name, file: `${this.folder}/${file}`, problems })
    return problems
  }
}

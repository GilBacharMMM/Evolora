// Accessibility checks on every screen (REQ-12.9, D-86): Israeli standard 5568, which is WCAG 2.0
// levels A and AA. Made with axe-core, the widely used checking library, plus three checks of our
// own that axe can't make:
// - text at least 15 pixels (REQ-12.9);
// - the page enlarged to 200% (as a 683-pixel-wide window) still fits, with nothing cut off sideways;
// - the keyboard: Tab moves through the page, the focused item is clearly marked, and Tab never
//   gets stuck.
// Not checked here (later, REQ-12.9): image descriptions inside lessons, which teachers write.

import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

// Plain-language names for the problems axe reports most often.
const NAMES = {
  'color-contrast': 'colour contrast too low (needs 4.5 to 1)',
  label: 'a field with no name for screen readers',
  'button-name': 'a button with no name for screen readers',
  'link-name': 'a link with no name for screen readers',
  'select-name': 'a list with no name for screen readers',
  'image-alt': 'a picture with no description',
  'aria-allowed-attr': 'a wrong screen-reader attribute',
  'aria-required-children': 'a screen-reader structure with missing parts',
  'aria-required-parent': 'a screen-reader structure in the wrong place',
  'nested-interactive': 'a button or link inside another one',
  'html-has-lang': 'the page has no language',
  'valid-lang': 'a wrong language code',
  'document-title': 'the page has no title',
  'frame-title': 'an embedded frame with no title',
  list: 'a list built wrongly',
  listitem: 'a list item outside a list',
  'duplicate-id-aria': 'two elements with the same name tag',
  'aria-hidden-focus': 'a hidden element that the keyboard can still reach',
}

// keyboard: false leaves out the Tab walk (pressing keys counts as activity for the sign-out timer).
export async function accessibilityProblems(page, { keyboard = true } = {}) {
  const problems = []
  if (!(await page.evaluate(() => Boolean(window.axe)))) await page.evaluate(AXE)
  const result = await page.evaluate(async () => {
    const r = await window.axe.run(
      { exclude: [['iframe']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, resultTypes: ['violations'], iframes: false },
    )
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, targets: v.nodes.map((n) => n.target.join(' ')).filter(Boolean), summaries: v.nodes.map((n) => n.failureSummary || '') }))
  })
  for (const v of result) {
    // Pictures inside lessons are described by the teachers who write them (later, REQ-12.9).
    const targets = v.id === 'image-alt' ? v.targets.filter((t) => !/article\.lesson|\.lesson /.test(t)) : v.targets
    if (!targets.length) continue
    const name = NAMES[v.id] || v.help
    problems.push({ check: 'accessibility', text: `${name} [${v.id}], ${targets.length} place${targets.length > 1 ? 's' : ''}: ${targets.slice(0, 4).join(' | ')}` })
  }

  // Text at least 15 pixels (formula parts, such as small powers, are drawn by MathLive).
  const small = await page.evaluate(() => {
    const out = new Set()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.nodeValue.trim()) continue
      const el = n.parentElement
      if (!el || el.closest('.formula, sup, sub, script, style, noscript, .visually-hidden, .test-banner')) continue
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none') continue
      const size = parseFloat(s.fontSize)
      if (size < 14.5) out.add(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} (${Math.round(size * 10) / 10}px: "${n.nodeValue.trim().slice(0, 30)}")`)
    }
    return [...out]
  })
  if (small.length) problems.push({ check: 'accessibility', text: `text smaller than 15 pixels, ${small.length} kinds: ${small.slice(0, 5).join(' | ')}` })

  // Enlarged to 200%: the same page in a window half as wide.
  const size = page.viewportSize()
  if (size) {
    await page.setViewportSize({ width: Math.round(size.width / 2), height: Math.round(size.height / 2) })
    await page.waitForTimeout(300)
    const wide = await page.evaluate(() => {
      const d = document.documentElement
      const over = []
      for (const el of document.body.querySelectorAll('button, a, input, select, textarea, h1, h2, h3, p, label')) {
        const r = el.getBoundingClientRect()
        if (r.width && (r.right > d.clientWidth + 2 || r.left < -2) && !el.closest('.table-scroll, table, pre, .formula, iframe')) over.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''}`)
      }
      return { scroll: d.scrollWidth - d.clientWidth, over: [...new Set(over)] }
    })
    await page.setViewportSize(size)
    await page.waitForTimeout(200)
    if (wide.scroll > 1 || wide.over.length) problems.push({ check: 'accessibility', text: `at 200% the page doesn't fit: ${wide.scroll > 1 ? `it scrolls ${wide.scroll} pixels sideways` : ''}${wide.over.length ? ` cut off: ${wide.over.slice(0, 5).join(', ')}` : ''}` })
  }

  // The keyboard: up to 40 presses of Tab from the top of the page.
  if (!keyboard) return problems
  const kb = await keyboardWalk(page)
  if (kb.unmarked.length) problems.push({ check: 'accessibility', text: `the keyboard focus isn't visible on: ${kb.unmarked.slice(0, 5).join(', ')}` })
  if (kb.stuck) problems.push({ check: 'accessibility', text: `the keyboard gets stuck on ${kb.stuck}` })
  return problems
}

async function keyboardWalk(page) {
  const before = await page.evaluate(() => ({ x: scrollX, y: scrollY, focus: document.activeElement }))
  await page.evaluate(() => {
    document.activeElement?.blur?.()
    window.focus()
  })
  const seen = []
  const unmarked = new Set()
  let stuck = null
  let same = 0
  let last = null
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const f = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body || el.tagName === 'IFRAME') return null
      const s = getComputedStyle(el)
      const marked = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 1) || (s.boxShadow && s.boxShadow !== 'none')
      const id = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''}${el.textContent ? ` "${el.textContent.trim().slice(0, 20)}"` : el.getAttribute('aria-label') ? ` "${el.getAttribute('aria-label').slice(0, 20)}"` : ''}`
      if (!el.dataset.kbWalk) el.dataset.kbWalk = String(Math.random())
      return { id, key: el.dataset.kbWalk, marked }
    })
    if (!f) {
      if (seen.length) break // back to the browser's own buttons: the walk went round the page
      continue
    }
    if (f.key === last) {
      same++
      if (same >= 3) {
        stuck = f.id
        break
      }
    } else same = 0
    last = f.key
    if (seen.includes(f.key)) break // round again
    seen.push(f.key)
    if (!f.marked) unmarked.add(f.id)
  }
  await page.evaluate(({ x, y }) => {
    document.activeElement?.blur?.()
    for (const el of document.querySelectorAll('[data-kb-walk]')) delete el.dataset.kbWalk
    scrollTo(x, y)
  }, before)
  return { unmarked: [...unmarked], stuck }
}

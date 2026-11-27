// A short report Gil can open in any browser: out/report.html, with the screenshots beside it.

import fs from 'node:fs'
import path from 'node:path'
import { OUT } from './checks.mjs'

const LANG_NAMES = { he: 'Hebrew', ar: 'Arabic', en: 'English' }
const STATUS = {
  pass: ['Passed', 'pass'],
  problems: ['Passed, with screen problems', 'warn'],
  fail: ['Failed', 'fail'],
  skipped: ['Not reached', 'skip'],
}
const h = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function writeReport(results, { seconds }) {
  const steps = results.flatMap((r) => r.steps)
  const n = (st) => steps.filter((s) => s.status === st).length
  const when = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  const langs = [...new Set(results.map((r) => r.lang))]
  const browsers = [...new Set(results.map((r) => r.browser))]
  const groups = browsers.flatMap((b) => langs.map((lang) => [b, lang]))
  const body = groups
    .map(([browser, lang]) => {
      const flows = results.filter((r) => r.lang === lang && r.browser === browser)
      if (!flows.length) return ''
      return `<section><h2>${h(browser)}: ${LANG_NAMES[lang]}</h2>${flows
        .map(
          (f) => `<h3>${h(f.title)}</h3><ol class="steps">${f.steps
            .map((s) => {
              const [word, cls] = STATUS[s.status]
              const problems = (s.screens || []).flatMap((sc) => sc.problems.map((p) => `<li><b>${h(p.check)}</b> on screen “${h(sc.name)}”: ${h(p.text)}</li>`))
              const shots = (s.screens || []).map((sc) => `<a href="${h(sc.file)}" target="_blank"><img src="${h(sc.file)}" alt="${h(sc.name)}" loading="lazy"><span>${h(sc.name)}</span></a>`).join('')
              return `<li><span class="badge ${cls}">${word}</span> ${h(s.label)}${s.message ? `<p class="why">${h(s.message)}</p>` : ''}${problems.length ? `<ul class="problems">${problems.join('')}</ul>` : ''}${shots ? `<div class="shots">${shots}</div>` : ''}</li>`
            })
            .join('')}</ol>`,
        )
        .join('')}</section>`
    })
    .join('')
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Screen test report</title>
<style>
body { font: 15px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 1100px; padding: 16px 24px 48px; color: #1d2733; background: #fff; }
h1 { margin-bottom: 4px; } h2 { margin-top: 36px; border-bottom: 2px solid #0E6B73; } h3 { margin: 20px 0 6px; }
.summary { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0; }
.summary div { border: 1px solid #ccd; border-radius: 8px; padding: 8px 14px; }
.steps { padding-inline-start: 20px; } .steps > li { margin: 8px 0; }
.badge { display: inline-block; font-size: 13px; font-weight: 600; padding: 1px 8px; border-radius: 10px; margin-inline-end: 6px; }
.pass { background: #dff3e4; color: #135c2a; } .warn { background: #fff1cc; color: #6b4b00; } .fail { background: #fbe0e0; color: #8a1616; } .skip { background: #eceff3; color: #4a5562; }
.why { margin: 4px 0; color: #8a1616; } .problems { margin: 4px 0; color: #6b4b00; }
.shots { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
.shots a { display: flex; flex-direction: column; font-size: 12px; color: #4a5562; text-decoration: none; }
.shots img { width: 220px; border: 1px solid #ccd; border-radius: 4px; }
</style></head><body>
<h1>Screen test report</h1>
<p>Run on ${h(when)} against the test site (evolora-test.web.app), in ${browsers.map(h).join(', ')}, at a Chromebook size of 1366 × 768, in ${langs.map((l) => LANG_NAMES[l]).join(', ')}. It took ${Math.round(seconds / 60)} minutes.</p>
<p>On every screen the robot checked: no text in another language (REQ-9.1), the page direction (REQ-9.2), no errors in the browser's console, no sideways scrolling (REQ-11.1), and no status shown by colour alone (REQ-12.3). Click a picture to see it full size.</p>
<div class="summary"><div><span class="badge pass">Passed</span> ${n('pass')}</div><div><span class="badge warn">Screen problems</span> ${n('problems')}</div><div><span class="badge fail">Failed</span> ${n('fail')}</div><div><span class="badge skip">Not reached</span> ${n('skipped')}</div></div>
${body}
</body></html>`
  const file = path.join(OUT, 'report.html')
  fs.writeFileSync(file, html)
  return file
}

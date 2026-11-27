import fs from 'node:fs'
import path from 'node:path'

export const SITE = 'https://evolora-test.web.app'
const LOCALES = path.resolve(import.meta.dirname, '..', '..', '..', 'web', 'src', 'locales')
const texts = Object.fromEntries(['he', 'ar', 'en'].map((l) => [l, JSON.parse(fs.readFileSync(path.join(LOCALES, `${l}.json`), 'utf8'))]))

// The interface text for a key in a language, as the app shows it (REQ-9.1).
export function tr(lang, key, vars = {}) {
  let v = key.split('.').reduce((o, k) => o?.[k], texts[lang])
  if (v === undefined) v = key.split('.').reduce((o, k) => o?.[k], texts[lang])?.[`${key}_other`]
  if (typeof v !== 'string') throw new Error(`No text "${key}" in ${lang}`)
  return v.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

// The part of a text before its first {{placeholder}}, for finding texts with numbers in them.
export function trStart(lang, key) {
  return tr(lang, key).split('{{')[0]
}

export class StepFailed extends Error {}
// A failure that doesn't stop the flow: the next steps can still run.
export class StepFailedGoOn extends StepFailed {}

export function expect(ok, message, { goOn = false } = {}) {
  if (!ok) throw new (goOn ? StepFailedGoOn : StepFailed)(message)
}

// Signs in as a test user through the test site's "Switch user" menu (REQ-12.5).
export async function signInAs(page, lang, name) {
  await page.getByRole('button', { name: tr(lang, 'test.switchUser'), exact: true }).first().click()
  const popup = page.locator('.switch-popup')
  await popup.waitFor()
  await popup.locator('.switch-item', { has: page.locator('.switch-name', { hasText: new RegExp(`^${name}$`) }) }).click()
  // The name shown at the top may differ from the list: Test Teacher 1 is shown as "Math and
  // Science teacher" and Test Teacher 2 as "English teacher" (REQ-12.6, Gil 2026-11-26).
  await page.locator('.account-name').first().waitFor({ timeout: 20000 })
  await page.waitForLoadState('networkidle').catch(() => {})
}

export async function openSite(page, address = '/') {
  await page.goto(`${SITE}${address}`)
  await page.locator('.top-bar').waitFor()
}

// Moves to another screen inside the app, as clicking a link would.
export async function goTo(page, address) {
  await page.evaluate((a) => {
    history.pushState(null, '', a)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, address)
  await page.waitForLoadState('networkidle').catch(() => {})
}

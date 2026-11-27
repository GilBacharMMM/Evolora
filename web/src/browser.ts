// Evolora works in the latest versions of Google Chrome, Microsoft Edge, Mozilla Firefox and
// Apple Safari (REQ-11.1, D-84). Other browsers, and older versions of these four, see a short
// message suggesting one of them (NotSupported.tsx).
//
// Chrome and Edge report themselves in their brand list ("Google Chrome", "Microsoft Edge");
// other browsers built on the same engine (Brave, Opera, Samsung Internet, plain Chromium)
// report their own names. Firefox and Safari don't have the brand list, so their name and
// version are read from the browser's description of itself (the "user agent").

export type BrowserName = 'chrome' | 'edge' | 'firefox' | 'safari' | 'other'

// The oldest version of each browser that Evolora lets in (D-86): about a year back, so that
// a school computer that updates a little late still works. Raise these about once a year.
export const MIN_VERSION: Record<Exclude<BrowserName, 'other'>, number> = {
  chrome: 140,
  edge: 140,
  firefox: 140,
  safari: 26,
}

export interface BrowserInfo {
  name: BrowserName
  version: number
}

interface Brand {
  brand: string
  version: string
}

function major(ua: string, re: RegExp): number {
  const m = ua.match(re)
  return m ? parseInt(m[1], 10) : 0
}

// Pure, so it can be tested with many browser descriptions (tools/test-browsers.mjs).
export function whichBrowser(ua: string, brands: Brand[] | null): BrowserInfo {
  // On iPhones and iPads every browser is Safari's engine; these name themselves in the description.
  if (/\bEdgiOS\/(\d+)/.test(ua)) return { name: 'edge', version: major(ua, /EdgiOS\/(\d+)/) }
  if (/\bCriOS\/(\d+)/.test(ua)) return { name: 'chrome', version: major(ua, /CriOS\/(\d+)/) }
  if (/\bFxiOS\/(\d+)/.test(ua)) return { name: 'firefox', version: major(ua, /FxiOS\/(\d+)/) }
  if (/\bFirefox\/(\d+)/.test(ua) && !/Seamonkey/i.test(ua)) return { name: 'firefox', version: major(ua, /Firefox\/(\d+)/) }
  if (/\b(Chrome|Chromium|Edg|EdgA)\/\d+/.test(ua)) {
    // Chrome's engine: trust only the brand list, so Brave, Opera and the others are not mistaken for Chrome.
    const edge = brands?.find((b) => b.brand === 'Microsoft Edge')
    if (edge) return { name: 'edge', version: parseInt(edge.version, 10) || 0 }
    const chrome = brands?.find((b) => b.brand === 'Google Chrome')
    if (chrome) return { name: 'chrome', version: parseInt(chrome.version, 10) || 0 }
    return { name: 'other', version: 0 }
  }
  if (/\bVersion\/(\d+)[.\d]* (Mobile\/\S+ )?Safari\//.test(ua)) return { name: 'safari', version: major(ua, /Version\/(\d+)/) }
  return { name: 'other', version: 0 }
}

export function thisBrowser(): BrowserInfo {
  const nav = navigator as Navigator & { userAgentData?: { brands: Brand[] } }
  return whichBrowser(navigator.userAgent, nav.userAgentData?.brands ?? null)
}

export function isSupported(b: BrowserInfo): boolean {
  return b.name !== 'other' && b.version >= MIN_VERSION[b.name]
}

const OVERRIDE_KEY = 'evolora.anyBrowser'

// On the test site only, Claude's automatic screen tests can also run in a test browser that is
// not on the list (plain Chromium); they open the site once with ?any-browser to let it through.
export function browserAllowed(isTestSite: boolean): boolean {
  if (isSupported(thisBrowser())) return true
  if (!isTestSite) return false
  try {
    if (new URLSearchParams(location.search).has('any-browser')) sessionStorage.setItem(OVERRIDE_KEY, '1')
    return sessionStorage.getItem(OVERRIDE_KEY) === '1'
  } catch {
    return false
  }
}

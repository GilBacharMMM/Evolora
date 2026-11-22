// Evolora works in Google Chrome only (REQ-11.1, D-45).
// Chrome reports itself as "Google Chrome" in its brand list; Edge, Brave, Opera and other
// browsers built on the same engine report their own names, and Safari and Firefox
// don't have the brand list at all.

interface Brand {
  brand: string
}
interface NavigatorWithBrands extends Navigator {
  userAgentData?: { brands: Brand[] }
}

const OVERRIDE_KEY = 'evolora.anyBrowser'

export function isGoogleChrome(): boolean {
  const nav = navigator as NavigatorWithBrands
  const brands = nav.userAgentData?.brands ?? []
  return brands.some((b) => b.brand === 'Google Chrome')
}

// On the test site only, Claude's automatic screen tests run in a test browser that is
// not branded Chrome; they open the site once with ?any-browser to let it through.
export function browserAllowed(isTestSite: boolean): boolean {
  if (isGoogleChrome()) return true
  if (!isTestSite) return false
  try {
    if (new URLSearchParams(location.search).has('any-browser')) sessionStorage.setItem(OVERRIDE_KEY, '1')
    return sessionStorage.getItem(OVERRIDE_KEY) === '1'
  } catch {
    return false
  }
}

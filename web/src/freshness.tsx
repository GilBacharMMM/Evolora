import { Component, lazy, type ComponentType, type ReactNode } from 'react'
import i18n from './i18n'

// After a new release, a page opened earlier (or an old copy kept by the browser) may ask for
// files of the old release, which no longer exist. Then the page loads itself again with a
// fresh address, so the browser fetches the new release instead of its old copy.

const KEY = 'evolora.freshReloadAt'

export function reloadFresh(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0)
    if (Date.now() - last < 60_000) return false // already tried a minute ago: don't loop
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false
  }
  const url = new URL(location.href)
  url.searchParams.set('fresh', String(Date.now()))
  location.replace(url.toString())
  return true
}

// Removes the "fresh" mark from the address once the page has loaded.
export function tidyAddress() {
  const url = new URL(location.href)
  if (url.searchParams.has('fresh')) {
    url.searchParams.delete('fresh')
    history.replaceState(null, '', url.pathname + url.search + url.hash)
  }
}

// Like React's lazy(), but loads the page again freshly if the file belongs to an old release.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyFresh<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load().catch((e) => {
      if (reloadFresh()) return new Promise<never>(() => {})
      throw e
    }),
  )
}

// If something still fails, show a message with a button, never a blank screen.
export class ErrorScreen extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="page narrow">
        <div className="card message-card">
          <p>{i18n.t('common.somethingWrong')}</p>
          <button type="button" className="button primary" onClick={() => reloadFresh() || location.reload()}>
            {i18n.t('common.reload')}
          </button>
        </div>
      </main>
    )
  }
}

import { useTranslation } from 'react-i18next'
import { Logo } from './components/Logo'

// Shown in browsers that are not on the list, and in old versions of the four (REQ-11.1, D-84).
const BROWSERS = [
  { name: 'Google Chrome', href: 'https://www.google.com/chrome/' },
  { name: 'Microsoft Edge', href: 'https://www.microsoft.com/edge' },
  { name: 'Mozilla Firefox', href: 'https://www.mozilla.org/firefox/' },
  { name: 'Apple Safari', href: 'https://www.apple.com/safari/' },
]

export function NotSupported() {
  const { t } = useTranslation()
  return (
    <main className="page narrow">
      <section className="card signin-card">
        <Logo size={64} />
        <h1>{t('appName')}</h1>
        <p className="big">{t('browser.message')}</p>
        <ul className="browser-list">
          {BROWSERS.map((b) => (
            <li key={b.name}>
              <a href={b.href} dir="ltr">
                {b.name}
              </a>
            </li>
          ))}
        </ul>
        <p className="muted">{t('browser.update')}</p>
      </section>
    </main>
  )
}

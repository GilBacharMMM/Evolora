import { useTranslation } from 'react-i18next'
import { Logo } from './components/Logo'

// Shown in any browser other than Google Chrome (REQ-11.1, D-45).
export function NotChrome() {
  const { t } = useTranslation()
  return (
    <main className="page narrow">
      <section className="card signin-card">
        <Logo size={64} />
        <h1>{t('appName')}</h1>
        <p className="big">{t('chrome.message')}</p>
        <a className="button primary" href="https://www.google.com/chrome/">
          {t('chrome.download')}
        </a>
      </section>
    </main>
  )
}

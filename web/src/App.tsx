import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage, type Language } from './i18n'

const isTestSite = import.meta.env.VITE_SITE !== 'production'

function App() {
  const { t, i18n } = useTranslation()

  return (
    <>
      {isTestSite && (
        <div className="test-banner" role="note">
          {t('testBanner')}
        </div>
      )}
      <header className="top-bar">
        <span className="app-name">{t('appName')}</span>
        <label className="language-picker">
          {t('language')}
          <select
            value={i18n.language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            {Object.entries(LANGUAGES).map(([code, { label }]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main className="home">
        <h1>{t('appName')}</h1>
        <p className="tagline">{t('tagline')}</p>
        <p>{t('comingSoon')}</p>
        {isTestSite && <p className="status">{t('status')}</p>}
      </main>
    </>
  )
}

export default App

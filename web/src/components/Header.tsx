import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, type Language } from '../i18n'
import { IS_TEST_SITE } from '../site'
import { useSession } from '../session'
import { navigate } from '../router'
import { Logo } from './Logo'

// Built only into the test site: on the real site this is never loaded (REQ-12.5).
const SwitchUser = IS_TEST_SITE ? lazy(() => import('../test-site/SwitchUser').then((m) => ({ default: m.SwitchUser }))) : null

export function Header() {
  const { t, i18n } = useTranslation()
  const session = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const user = session.user

  return (
    <header className="top-bar">
      <button type="button" className="brand" onClick={() => navigate('/')}>
        <Logo />
        <span className="app-name">{t('appName')}</span>
      </button>
      <div className="top-actions">
        {SwitchUser && (
          <Suspense fallback={null}>
            <SwitchUser />
          </Suspense>
        )}
        <label className="language-picker">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18 M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9 M12 3c-2.5 2.7-3.8 5.7-3.8 9s1.3 6.3 3.8 9" />
          </svg>
          <span>{t('language')}</span>
          <select value={i18n.language} onChange={(e) => session.chooseLanguage(e.target.value as Language)}>
            {Object.entries(LANGUAGES).map(([code, { label }]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {user && (
          <div className="account">
            <button type="button" className="account-button" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              <span className="avatar" aria-hidden="true">
                {(user.displayName || user.email || '?').slice(0, 1).toUpperCase()}
              </span>
              <span className="account-text">
                <span className="account-name">{user.displayName || user.email}</span>
                <span className="account-role">{t(`roles.${session.role}`)}</span>
              </span>
            </button>
            {menuOpen && (
              <div className="account-popup">
                <p className="muted">{user.email}</p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setMenuOpen(false)
                    void session.signOutNow()
                  }}
                >
                  {t('auth.signOut')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

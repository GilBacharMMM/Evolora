import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../site'
import { navigate } from '../router'
import testUsers from './test-users.json'

// "Switch user" menu, test site only (REQ-12.5). The real site is built without this file,
// so the menu can't appear there. The test users are made-up accounts that exist only in
// the test project (D-49).
export function SwitchUser({ variant = 'menu' }: { variant?: 'menu' | 'list' }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  async function become(email: string) {
    setBusy(email)
    setError(false)
    try {
      await signInWithEmailAndPassword(auth, email, testUsers.password)
      setOpen(false)
      navigate('/')
    } catch {
      setError(true)
    } finally {
      setBusy(null)
    }
  }

  const current = auth.currentUser?.email
  const list = (
    <ul className="switch-list" role="list">
      {testUsers.users.map((u) => {
        const role = u.role === 'teacher' ? t('roles.teacher') : t('roles.student')
        const extra = 'level' in u && u.level ? ` · ${t('test.level', { level: u.level })}` : 'noClass' in u && u.noClass ? ` · ${t('test.noClass')}` : ''
        return (
          <li key={u.uid}>
            <button type="button" className={`switch-item${current === u.email ? ' current' : ''}`} disabled={busy !== null} onClick={() => become(u.email)}>
              <span className="switch-name">{u.name}</span>
              <span className="switch-role">
                {role}
                {extra}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )

  if (variant === 'list') {
    return (
      <section className="card switch-card" aria-labelledby="switch-title">
        <h2 id="switch-title">{t('test.switchUser')}</h2>
        <p className="muted">{t('test.switchExplain')}</p>
        {list}
        {error && <p role="alert" className="error">{t('test.switchFailed')}</p>}
      </section>
    )
  }

  return (
    <div className="switch-menu" ref={box}>
      <button type="button" className="button test-button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>
        {t('test.switchUser')}
      </button>
      {open && (
        <div className="switch-popup" role="dialog" aria-label={t('test.switchUser')}>
          {list}
          {error && <p role="alert" className="error">{t('test.switchFailed')}</p>}
        </div>
      )}
    </div>
  )
}

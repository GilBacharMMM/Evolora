import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { signOut, type User } from 'firebase/auth'
import { auth, IS_TEST_SITE } from './site'
import { mediaPlaying } from './lessonTime'
import { saveBeforeSignOut } from './drafts'
import { IDLE_MS, MAX_MS, MINUTE, signOutState } from './signOutRules'

// Automatic sign-out (REQ-3.5, D-85): after 30 minutes with no activity (no typing, clicking or
// scrolling, and no video or audio playing), and after 8 hours from signing in, even with
// activity. A warning shows 2 minutes before an inactivity sign-out, with a "Stay signed in"
// button. Before signing out, work waiting to be saved is saved; half-typed text stays as a
// draft (drafts.ts). The page stays where it is, so after signing in again the person is back
// on the same page.
//
// Activity in any Evolora tab of this browser counts for all of them (kept in local storage).

const ACTIVITY_KEY = 'evolora.lastActivity'
const TEST_KEY = 'evolora.signOutTest'
// Why the person was signed out, so the sign-in page can say so and the same page can open again.
export const SIGNED_OUT_KEY = 'evolora.signedOut'

// Scrolling counts through the wheel, the keys, touch and dragging the scroll bar (a mouse press).
// The "scroll" event itself is not used: the page also fires it by itself, when its layout shifts.
const ACTIVITY_EVENTS = ['keydown', 'mousedown', 'pointerdown', 'touchstart', 'touchmove', 'wheel', 'input'] as const

// On the test site only, Claude can shorten both times for a demonstration (REQ-3.5):
// open the site with ?signout-test=3,10 (3 minutes without activity, 10 minutes in all),
// and with ?signout-test=off to go back to the normal times. The warning still comes
// 2 minutes before, so the shortest inactivity time is 3 minutes.
export function limits(): { idle: number; max: number } {
  if (!IS_TEST_SITE) return { idle: IDLE_MS, max: MAX_MS }
  try {
    const url = new URL(location.href)
    const asked = url.searchParams.get('signout-test')
    if (asked !== null) {
      if (asked === 'off') localStorage.removeItem(TEST_KEY)
      else localStorage.setItem(TEST_KEY, asked)
      url.searchParams.delete('signout-test')
      history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
    const saved = localStorage.getItem(TEST_KEY)
    if (saved) {
      const [idle, max] = saved.split(',').map(Number)
      return {
        idle: Number.isFinite(idle) && idle > 0 ? Math.max(3, idle) * MINUTE : IDLE_MS,
        max: Number.isFinite(max) && max > 0 ? Math.max(1, max) * MINUTE : MAX_MS,
      }
    }
  } catch {
    // Storage blocked: the normal times.
  }
  return { idle: IDLE_MS, max: MAX_MS }
}

function readActivity(): number {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY) || 0)
  } catch {
    return 0
  }
}

function writeActivity(at: number) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(at))
  } catch {
    // Storage blocked: activity still counts in this tab.
  }
}

// When this person signed in, by this computer's clock (so a computer whose clock is wrong
// still counts the 8 hours correctly). A sign-in Evolora hasn't seen before is happening now.
const SIGN_IN_KEY = 'evolora.signedInAt'
export function signedInAt(user: User): number {
  const mark = `${user.uid}|${user.metadata.lastSignInTime || ''}`
  try {
    const saved = JSON.parse(localStorage.getItem(SIGN_IN_KEY) || 'null') as { mark: string; at: number } | null
    if (saved?.mark === mark && Number.isFinite(saved.at)) return saved.at
    const at = Date.now()
    localStorage.setItem(SIGN_IN_KEY, JSON.stringify({ mark, at }))
    return at
  } catch {
    const at = Date.parse(user.metadata.lastSignInTime || '')
    return Number.isFinite(at) ? at : Date.now()
  }
}

export function AutoSignOut({ user }: { user: User }) {
  const { t } = useTranslation()
  const [warnLeft, setWarnLeft] = useState<number | null>(null)
  const stayButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const l = limits()
    const since = signedInAt(user)
    let last = Math.max(readActivity(), since)
    // Coming back to a page left open (or a computer that was asleep) counts from the last activity;
    // a fresh sign-in counts from now.
    if (Date.now() - since < 60_000) last = Date.now()
    writeActivity(last)
    let written = last
    let signingOut = false

    const active = () => {
      last = Date.now()
      // Written at most every 5 seconds, so typing doesn't write all the time.
      if (last - written > 5000) {
        written = last
        writeActivity(last)
      }
    }
    const tick = () => {
      if (signingOut) return
      if (mediaPlaying()) active()
      const shared = readActivity()
      if (shared > last) last = shared
      const s = signOutState(Date.now(), last, since, l)
      if (s.out) {
        signingOut = true
        void (async () => {
          try {
            sessionStorage.setItem(SIGNED_OUT_KEY, JSON.stringify({ uid: user.uid, reason: s.out }))
          } catch {
            // The sign-in page just won't say why.
          }
          await saveBeforeSignOut()
          await signOut(auth).catch(() => {})
        })()
        setWarnLeft(null)
        return
      }
      setWarnLeft(s.warnLeft)
    }
    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, active, { passive: true, capture: true })
    const onShow = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onShow)
    const id = window.setInterval(tick, 1000)
    tick()
    return () => {
      window.clearInterval(id)
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, active, { capture: true })
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [user])

  const showing = warnLeft !== null
  useEffect(() => {
    if (showing) stayButton.current?.focus()
  }, [showing])

  if (warnLeft === null) return null
  const s = Math.max(0, Math.ceil(warnLeft / 1000))
  const time = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  return (
    <div className="signout-backdrop">
      <div className="card signout-warning" role="alertdialog" aria-modal="true" aria-labelledby="signout-title" aria-describedby="signout-text">
        <h2 id="signout-title">{t('autoSignOut.warning')}</h2>
        <p id="signout-text">{t('autoSignOut.why')}</p>
        <p className="signout-time" dir="ltr" aria-hidden="true">
          {time}
        </p>
        <button
          ref={stayButton}
          type="button"
          className="button primary"
          onClick={() => {
            writeActivity(Date.now())
            setWarnLeft(null)
          }}
        >
          {t('autoSignOut.stay')}
        </button>
      </div>
    </div>
  )
}

// Read once on the sign-in page: why the person was signed out, if it was automatic.
export function signedOutReason(): { uid: string; reason: 'idle' | 'max' } | null {
  try {
    const v = sessionStorage.getItem(SIGNED_OUT_KEY)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

export function forgetSignedOut() {
  try {
    sessionStorage.removeItem(SIGNED_OUT_KEY)
  } catch {
    // Nothing to forget.
  }
}

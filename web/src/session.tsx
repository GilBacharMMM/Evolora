import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './site'
import i18n, { LANGUAGES, setLanguage, type Language } from './i18n'

// Roles (REQ-2.1, 2.2): everyone who signs in is a student, unless the system admin
// (Claude, D-47) has put their email address on the staff list.
export type Role = 'student' | 'teacher' | 'admin'

export interface Session {
  state: 'loading' | 'signedOut' | 'signedIn'
  user: User | null
  role: Role
  classIds: string[]
  signInWithGoogle: () => Promise<void>
  signOutNow: () => Promise<void>
  chooseLanguage: (lang: Language) => void
  // Reads the person's classes again, after joining one (REQ-5.2).
  reloadClasses: () => Promise<void>
  error: string | null
}

const SessionContext = createContext<Session | null>(null)

async function loadRole(user: User): Promise<Role> {
  if (!user.email || !user.emailVerified) return 'student'
  try {
    const staff = await getDoc(doc(db, 'staff', user.email.toLowerCase()))
    const role = staff.exists() ? staff.data().role : null
    return role === 'admin' || role === 'teacher' ? role : 'student'
  } catch {
    return 'student'
  }
}

async function loadClassIds(user: User): Promise<string[]> {
  try {
    const m = await getDoc(doc(db, 'memberships', user.uid))
    return m.exists() ? (m.data().classIds as string[]) || [] : []
  } catch {
    return []
  }
}

// Keeps the person's record up to date, and brings back their saved interface language,
// so it follows them to any computer (REQ-9.4).
async function syncProfile(user: User) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  const saved = snap.exists() ? (snap.data().language as string | undefined) : undefined
  if (saved && saved in LANGUAGES) {
    if (saved !== i18n.language) setLanguage(saved as Language)
  }
  const update: Record<string, unknown> = {
    name: user.displayName || user.email || '',
    email: user.email || '',
    lastSignIn: serverTimestamp(),
  }
  if (!snap.exists()) update.createdAt = serverTimestamp()
  if (!saved) update.language = i18n.language
  await setDoc(ref, update, { merge: true })
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Session['state']>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>('student')
  const [classIds, setClassIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null)
        setRole('student')
        setClassIds([])
        setState('signedOut')
        return
      }
      setState('loading')
      try {
        await syncProfile(u)
      } catch {
        // The record will be saved next time; the person can still continue.
      }
      const [r, c] = await Promise.all([loadRole(u), loadClassIds(u)])
      setUser(u)
      setRole(r)
      setClassIds(c)
      setState('signedIn')
    })
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    } catch (e) {
      const code = (e as { code?: string }).code || ''
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') setError(code || 'unknown')
    }
  }, [])

  const reloadClasses = useCallback(async () => {
    if (user) setClassIds(await loadClassIds(user))
  }, [user])

  const signOutNow = useCallback(async () => {
    await signOut(auth)
  }, [])

  const chooseLanguage = useCallback(
    (lang: Language) => {
      setLanguage(lang)
      if (user) void setDoc(doc(db, 'users', user.uid), { language: lang }, { merge: true }).catch(() => {})
    },
    [user],
  )

  return (
    <SessionContext.Provider value={{ state, user, role, classIds, signInWithGoogle, signOutNow, chooseLanguage, reloadClasses, error }}>
      {children}
    </SessionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): Session {
  const s = useContext(SessionContext)
  if (!s) throw new Error('useSession outside SessionProvider')
  return s
}

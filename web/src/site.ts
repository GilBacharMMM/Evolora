import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'
import configs from './firebase-config.json'

// Which site this build is for. The real site is built with VITE_SITE=production;
// everything else (the test site, and Claude's local preview) is the test site (REQ-12.4).
export const IS_TEST_SITE = import.meta.env.VITE_SITE !== 'production'

// The students-only test address (D-71): a test site build that lists only the test students,
// with no Google sign-in and no teachers' password in it.
export const STUDENTS_ONLY = IS_TEST_SITE && import.meta.env.VITE_STUDENTS_ONLY === 'true'

type SiteConfig = typeof configs.test
const config: SiteConfig | undefined = IS_TEST_SITE ? configs.test : (configs as Record<string, SiteConfig | string>).production as SiteConfig | undefined

export const siteReady = Boolean(config)

const app: FirebaseApp | null = config ? initializeApp(config) : null

export const auth = app ? getAuth(app) : (null as never)
export const db = app ? getFirestore(app) : (null as never)
export const storage = app ? getStorage(app) : (null as never)

// The checking service runs in Israel (me-west1), next to the database (system-design 5).
export const functions = app ? getFunctions(app, 'me-west1') : (null as never)

import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import configs from './firebase-config.json'

// Which site this build is for. The real site is built with VITE_SITE=production;
// everything else (the test site, and Claude's local preview) is the test site (REQ-12.4).
export const IS_TEST_SITE = import.meta.env.VITE_SITE !== 'production'

type SiteConfig = typeof configs.test
const config: SiteConfig | undefined = IS_TEST_SITE ? configs.test : (configs as Record<string, SiteConfig | string>).production as SiteConfig | undefined

export const siteReady = Boolean(config)

const app: FirebaseApp | null = config ? initializeApp(config) : null

export const auth = app ? getAuth(app) : (null as never)
export const db = app ? getFirestore(app) : (null as never)
export const storage = app ? getStorage(app) : (null as never)

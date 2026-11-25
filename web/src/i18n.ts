import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import he from './locales/he.json'
import ar from './locales/ar.json'
import en from './locales/en.json'

// Interface languages (REQ-9.1) and their text direction (REQ-9.2).
export const LANGUAGES = {
  he: { label: 'עברית', dir: 'rtl' },
  ar: { label: 'العربية', dir: 'rtl' },
  en: { label: 'English', dir: 'ltr' },
} as const

export type Language = keyof typeof LANGUAGES

const STORAGE_KEY = 'evolora.language'

// A new person starts in their browser's language if Evolora has it,
// and in English otherwise (REQ-9.4). On the students-only test address, a new person
// starts in Hebrew (REQ-12.8, D-71).
function browserLanguage(): Language {
  if (import.meta.env.VITE_STUDENTS_ONLY === 'true') return 'he'
  const preferred = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []
  for (const tag of preferred) {
    const code = String(tag || '').slice(0, 2).toLowerCase()
    if (code === 'iw') return 'he' // older name for Hebrew
    if (code in LANGUAGES) return code as Language
  }
  return 'en'
}

function savedLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && saved in LANGUAGES) return saved as Language
  } catch {
    // Storage can be blocked; use the browser's language instead.
  }
  return browserLanguage()
}

// Keeps the page's language and direction in step with the interface language.
function applyToDocument(lang: Language) {
  document.documentElement.lang = lang
  document.documentElement.dir = LANGUAGES[lang].dir
}

export function setLanguage(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Not saved, but the switch still works for this visit.
  }
  void i18n.changeLanguage(lang)
}

const initial = savedLanguage()
applyToDocument(initial)
i18n.on('languageChanged', (lang) => applyToDocument(lang as Language))

void i18n.use(initReactI18next).init({
  resources: { he: { translation: he }, ar: { translation: ar }, en: { translation: en } },
  lng: initial,
  fallbackLng: 'he',
  interpolation: { escapeValue: false },
})

export default i18n

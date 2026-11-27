import { doc, getDoc } from 'firebase/firestore'
import { db } from './site'

// The terms of use (REQ-10.8, D-75), loaded by Claude from the `terms` folder.
export interface TermsText {
  title: string
  summary: string[]
  text: string
}

export interface Terms {
  version: string
  languages: Record<string, TermsText>
}

let cached: Promise<Terms | null> | null = null

// The current terms, or null when none have been loaded yet (then nobody is asked to agree).
export function loadTerms(fresh = false): Promise<Terms | null> {
  if (!cached || fresh) {
    cached = getDoc(doc(db, 'terms', 'current'))
      .then((s) => (s.exists() ? (s.data() as Terms) : null))
      .catch(() => {
        cached = null
        return null
      })
  }
  return cached
}

// The text in the interface language, or in Hebrew, or in any language there is.
export function termsIn(terms: Terms, lang: string): TermsText {
  return terms.languages[lang] || terms.languages.he || Object.values(terms.languages)[0]
}

// The accessibility statement (REQ-12.10, D-87), loaded by Claude from the `terms` folder
// together with the terms of use. Anyone can read it, even before signing in.
export interface Statement {
  version: string
  languages: Record<string, { title: string; text: string }>
}

let statement: Promise<Statement | null> | null = null

export function loadStatement(): Promise<Statement | null> {
  if (!statement) {
    statement = getDoc(doc(db, 'terms', 'accessibility'))
      .then((s) => (s.exists() ? (s.data() as Statement) : null))
      .catch(() => {
        statement = null
        return null
      })
  }
  return statement
}

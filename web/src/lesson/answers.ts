// A question's saved state, as the checking service keeps it (functions/check.js).

export interface CheckAgainState {
  id: string
  question: { id: string; kind: 'choice' | 'number'; prompt: string; choices: { id: string; text: string }[]; multipleCorrect: boolean; unit: string | null }
  attempts: unknown[]
  result: null | 'correct1' | 'correct2' | 'wrong'
  hint?: string | null
  correct?: { choices?: string[]; number?: number }
  solution?: string | null
  whyRight?: string | null
}

export interface QuestionState {
  attempts: unknown[]
  result: null | 'correct1' | 'correct2' | 'wrong' | 'pending'
  score: number | null
  hint?: string | null
  solution?: string | null
  whyRight?: string | null
  correct?: { choices?: string[]; number?: number }
  checkAgain?: CheckAgainState
}

export function isFinished(st: QuestionState | undefined): boolean {
  if (!st || !st.result) return false
  if (st.checkAgain && !st.checkAgain.result) return false
  return true
}

// The same reading rule as the checking service: "7850", "7,850", "11.46" (REQ-4.22).
export function looksLikeNumber(text: string): boolean {
  const s = text.trim().replace(/\s/g, '')
  return /^-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(s) || /^-?\.\d+$/.test(s)
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { auth } from './site'

// Drafts (REQ-3.5, REQ-12.2, D-89): what a person has typed but not yet sent (an open answer,
// a number, a message, a teacher's comment) is kept in this browser tab as they type, so an
// automatic sign-out loses nothing: after signing in again, the text is back in its box.
//
// Drafts stay in this tab only. They are gone when the tab or the browser is closed, when the
// person signs out themselves, and when the text is sent. Each draft belongs to one person,
// so someone else signing in on the same computer never sees it.

const PREFIX = 'evolora.draft.'

function storageKey(uid: string, key: string) {
  return `${PREFIX}${uid}.${key}`
}

function read(uid: string | undefined, key: string | null): string | null {
  if (!uid || !key) return null
  try {
    return sessionStorage.getItem(storageKey(uid, key))
  } catch {
    return null
  }
}

function write(uid: string | undefined, key: string | null, value: string) {
  if (!uid || !key) return
  try {
    if (value) sessionStorage.setItem(storageKey(uid, key), value)
    else sessionStorage.removeItem(storageKey(uid, key))
  } catch {
    // Storage can be full or blocked; the text is still in its box.
  }
}

// Like useState for a text box, but the text is kept as a draft. A null key keeps no draft.
// clear() empties the box and removes the draft, after the text was sent.
export function useDraft(key: string | null, initial = ''): [string, (v: string) => void, () => void] {
  const uid = auth?.currentUser?.uid
  const [value, setValue] = useState(() => read(uid, key) ?? initial)
  const keyRef = useRef(key)
  // A different question in the same box (the grading page moves between answers).
  useEffect(() => {
    if (keyRef.current === key) return
    keyRef.current = key
    setValue(read(uid, key) ?? initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const set = useCallback(
    (v: string) => {
      setValue(v)
      write(uid, keyRef.current, v)
    },
    [uid],
  )
  const clear = useCallback(() => {
    setValue('')
    write(uid, keyRef.current, '')
  }, [uid])
  return [value, set, clear]
}

// The person signed out themselves: their drafts in this tab go too.
export function clearDrafts() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(PREFIX)) sessionStorage.removeItem(k)
    }
  } catch {
    // Nothing to clear.
  }
}

// Work that must be saved before an automatic sign-out (an exam answer waiting to be sent).
const beforeSignOut = new Set<() => Promise<unknown> | void>()

export function useBeforeSignOut(fn: () => Promise<unknown> | void) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const run = () => ref.current()
    beforeSignOut.add(run)
    return () => {
      beforeSignOut.delete(run)
    }
  }, [])
}

// Runs them all, waiting at most a few seconds.
export async function saveBeforeSignOut() {
  const all = Array.from(beforeSignOut).map((fn) => Promise.resolve().then(fn).catch(() => {}))
  await Promise.race([Promise.all(all), new Promise((r) => setTimeout(r, 4000))])
}

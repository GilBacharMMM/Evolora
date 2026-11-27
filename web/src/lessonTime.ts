import { useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from './site'
import { startPresence, stepPresence, type PresenceInput } from './presence'

// Time on each lesson and time away (REQ-5.33, D-73, D-76). While a student has a lesson open
// and hasn't finished it, the browser checks every second whether they are working on it, and
// every 20 seconds sends the working time and the times away to the checking service.

// Videos and audio playing in the lesson (the YouTube player tells us; audio and video
// elements are checked directly).
const playingVideos = new Set<string>()
export function setVideoPlaying(id: string, playing: boolean) {
  if (playing) playingVideos.add(id)
  else playingVideos.delete(id)
}
export function mediaPlaying(): boolean {
  if (playingVideos.size > 0) return true
  return Array.from(document.querySelectorAll('audio, video')).some((m) => !(m as HTMLMediaElement).paused)
}

const INPUT_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const
const SEND_EVERY_MS = 20000

export function useLessonTime(lessonId: string, active: boolean) {
  useEffect(() => {
    if (!active) return
    let lastInput = Date.now()
    const onInput = () => {
      lastInput = Date.now()
    }
    const input = (): PresenceInput => ({
      now: Date.now(),
      visible: document.visibilityState === 'visible',
      // Clicking into the lesson's video moves the focus into it; that is still the lesson.
      focused: document.hasFocus() || document.activeElement?.tagName === 'IFRAME',
      lastInput,
      mediaPlaying: mediaPlaying(),
    })
    let state = startPresence(input())
    // The first report says the lesson was opened again (a new sitting counts as coming back).
    let opened = true
    const tick = () => {
      state = stepPresence(state, input())
    }
    const send = () => {
      if (!opened && state.netMs < 1000 && state.away === 0) return
      const report = { lessonId, netMs: Math.round(state.netMs), away: state.away, opened }
      state = { ...state, netMs: 0, away: 0 }
      opened = false
      httpsCallable(functions, 'lessonTime')(report).catch(() => {})
    }
    const onVisibility = () => {
      tick()
      if (document.visibilityState === 'hidden') send()
    }
    for (const e of INPUT_EVENTS) window.addEventListener(e, onInput, { passive: true, capture: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', tick)
    window.addEventListener('focus', tick)
    const ticking = setInterval(tick, 1000)
    const sending = setInterval(send, SEND_EVERY_MS)
    return () => {
      tick()
      send()
      clearInterval(ticking)
      clearInterval(sending)
      for (const e of INPUT_EVENTS) window.removeEventListener(e, onInput, { capture: true })
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', tick)
      window.removeEventListener('focus', tick)
    }
  }, [lessonId, active])
}

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../site'

// A recording as text, to send it to the checking service (teachers' comments, D-67).
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Recordings last up to 30 seconds (D-67).
export const MAX_SECONDS = 30

// The recording format (REQ-11.1, D-84). Chrome, Edge and Firefox record WebM with Opus sound;
// Safari records MP4 with AAC sound. The latest versions of all four browsers play both, so a
// recording made in one browser plays in any other.
const FORMATS = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']

export function recordingFormat(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined
  return FORMATS.find((f) => MediaRecorder.isTypeSupported(f))
}

// The file name ending and saved type that go with a recording's format.
export function fileKind(type: string): { ext: string; contentType: string } {
  const base = type.split(';')[0].trim().toLowerCase()
  if (base === 'audio/mp4' || base === 'video/mp4' || base === 'audio/x-m4a') return { ext: 'm4a', contentType: 'audio/mp4' }
  if (base === 'audio/ogg') return { ext: 'ogg', contentType: 'audio/ogg' }
  return { ext: 'webm', contentType: 'audio/webm' }
}

// Uploads a recording to file storage and returns its path.
export async function uploadRecording(folder: string, blob: Blob): Promise<string> {
  const { ext, contentType } = fileKind(blob.type)
  const path = `${folder}/${Date.now()}.${ext}`
  await uploadBytes(ref(storage, path), blob, { contentType })
  return path
}

// Records up to MAX_SECONDS, lets the person listen back and record again (REQ-6.6, 5.13).
// The first time, the browser asks for permission to use the microphone.
export function Recorder({ onReady, disabled = false }: { onReady: (blob: Blob | null) => void; disabled?: boolean }) {
  const { t } = useTranslation()
  const [state, setState] = useState<'idle' | 'recording' | 'done' | 'denied' | 'unsupported'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [url, setUrl] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    window.clearInterval(timer.current)
    recorder.current?.stream.getTracks().forEach((tr) => tr.stop())
  }, [])

  async function start() {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return setState('unsupported')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: BlobPart[] = []
      const format = recordingFormat()
      const rec = format ? new MediaRecorder(stream, { mimeType: format }) : new MediaRecorder(stream)
      recorder.current = rec
      rec.ondataavailable = (e) => chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop())
        window.clearInterval(timer.current)
        const blob = new Blob(chunks, { type: rec.mimeType || format || chunks.map((c) => (c as Blob).type).find(Boolean) || 'audio/webm' })
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return URL.createObjectURL(blob)
        })
        setState('done')
        onReady(blob)
      }
      onReady(null)
      setSeconds(0)
      rec.start()
      setState('recording')
      const began = Date.now()
      timer.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - began) / 1000)
        setSeconds(s)
        if (s >= MAX_SECONDS && rec.state === 'recording') rec.stop()
      }, 250)
    } catch {
      setState('denied')
    }
  }

  return (
    <div className="recorder">
      {state === 'recording' ? (
        <>
          <span className="recording-dot" aria-hidden="true" />
          <span aria-live="polite">{t('audio.recording', { seconds, max: MAX_SECONDS })}</span>
          <button type="button" className="button primary small" onClick={() => recorder.current?.stop()}>
            {t('audio.stop')}
          </button>
        </>
      ) : (
        <button type="button" className="button secondary small" disabled={disabled} onClick={() => void start()}>
          {state === 'done' ? t('audio.again') : t('audio.record', { max: MAX_SECONDS })}
        </button>
      )}
      {state === 'done' && url && <audio controls src={url} aria-label={t('audio.listenBack')} />}
      {state === 'denied' && <p className="notice" role="alert">{t('audio.denied')}</p>}
      {state === 'unsupported' && <p className="notice" role="alert">{t('audio.unsupported')}</p>}
    </div>
  )
}

// Plays a recording kept in file storage, if this person may listen to it (D-67).
export function StoredAudio({ path, label }: { path: string; label: string }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    let live = true
    getDownloadURL(ref(storage, path))
      .then((u) => live && setUrl(u))
      .catch(() => live && setMissing(true))
    return () => {
      live = false
    }
  }, [path])
  if (missing) return <p className="muted small-note">{t('audio.missing')}</p>
  return url ? <audio controls src={url} aria-label={label} /> : <p className="loading">{t('common.loading')}</p>
}

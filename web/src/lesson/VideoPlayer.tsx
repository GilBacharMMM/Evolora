import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Ui } from './Blocks'
import { setVideoPlaying } from '../lessonTime'

// A YouTube video inside the lesson (REQ-4.23, D-32): YouTube's own player, in its
// privacy-enhanced mode, playing only from the start time to the end time when they are set.
// If the video's owner doesn't allow it to be shown inside other websites, the student sees
// an "Open on YouTube" button instead of an error.

interface YTPlayer {
  destroy: () => void
}
interface YTNamespace {
  Player: new (el: HTMLElement, options: Record<string, unknown>) => YTPlayer
}
declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YTNamespace> | null = null
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previous?.()
        if (window.YT) resolve(window.YT)
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.onerror = () => reject(new Error('YouTube could not be reached'))
      document.head.appendChild(script)
    })
  }
  return apiPromise
}

export function VideoPlayer({ youtubeId, title, source, start, end }: { youtubeId: string; title: string; source: string; start: number | null; end: number | null }) {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const [blocked, setBlocked] = useState(false)
  // A playing video counts as working on the lesson (REQ-5.33).
  const playId = useRef(Math.random().toString(36)).current
  const watch = `https://www.youtube.com/watch?v=${youtubeId}${start ? `&t=${start}s` : ''}`

  useEffect(() => {
    let player: YTPlayer | null = null
    let live = true
    loadYouTubeApi()
      .then((YT) => {
        if (!live || !box.current) return
        const target = document.createElement('div')
        box.current.replaceChildren(target)
        const playerVars: Record<string, number> = { rel: 0, modestbranding: 1 }
        if (start != null) playerVars.start = start
        if (end != null) playerVars.end = end
        player = new YT.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          videoId: youtubeId,
          playerVars,
          events: {
            onStateChange: (e: { data: number }) => setVideoPlaying(playId, e.data === 1),
            // 101 and 150: the owner doesn't allow the video inside other websites.
            onError: (e: { data: number }) => {
              if (e.data === 101 || e.data === 150 || e.data === 100) setBlocked(true)
            },
          },
        })
      })
      .catch(() => live && setBlocked(true))
    return () => {
      live = false
      setVideoPlaying(playId, false)
      player?.destroy()
    }
  }, [youtubeId, start, end, playId])

  return (
    <figure className="block-video">
      {blocked ? (
        <div className="video-blocked">
          <p>
            <Ui>{t('lesson.videoBlocked')}</Ui>
          </p>
          <a className="button primary" href={watch} target="_blank" rel="noopener noreferrer">
            <Ui>{t('lesson.openOnYouTubeButton')}</Ui>
          </a>
        </div>
      ) : (
        <div className="video-frame" ref={box} title={title} />
      )}
      <figcaption>
        <span className="video-title">{title}</span>
        <a href={watch} target="_blank" rel="noopener noreferrer" className="video-source">
          <Ui>{t('lesson.source')}:</Ui> <bdi>{source}</bdi> · <Ui>{t('lesson.openOnYouTube')}</Ui>
        </a>
      </figcaption>
    </figure>
  )
}

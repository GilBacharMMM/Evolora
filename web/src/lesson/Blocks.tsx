import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from '../site'
import { Formula, Markdown } from './Rich'
import type { Block } from './types'
import { VideoPlayer } from './VideoPlayer'

// Interface words (in the person's language) inside a lesson (in the lesson's language)
// keep their own direction, so mixed Hebrew and English read correctly (REQ-9.3).
export function Ui({ children, className }: { children: ReactNode; className?: string }) {
  const { i18n } = useTranslation()
  return (
    <span className={className} dir={i18n.dir()}>
      {children}
    </span>
  )
}

// Shows one lesson block (REQ-4.2). The lesson's own language and direction are set
// on the surrounding <article>, so lesson text always reads in its own direction (REQ-9.3).
export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'text':
      return <Markdown text={block.markdown} className="block-text" />
    case 'note':
      return (
        <aside className="block-note">
          <Markdown text={block.markdown} />
        </aside>
      )
    case 'table':
      return <Markdown text={block.markdown} className="block-table" />
    case 'linkList':
      return <Markdown text={block.markdown} className="block-links" />
    case 'quote':
      // A quotation, such as a verse from the Bible, in a classic Hebrew font (D-54)
      return (
        <figure className="block-quote">
          <blockquote>
            <Markdown text={block.markdown} />
          </blockquote>
          {block.source && <figcaption>{block.source}</figcaption>}
        </figure>
      )
    case 'solvedExample':
      return <SolvedExample markdown={block.markdown} />
    case 'formula':
      return (
        <div className="block-formula">
          {block.words.map((w, i) => (
            <p key={`w${i}`} className="formula-words" dir="auto">
              {w}
            </p>
          ))}
          {block.latex.map((l, i) => (
            <Formula key={`l${i}`} latex={l} />
          ))}
        </div>
      )
    case 'image':
      return <ImageBlock block={block} />
    case 'video':
      return <VideoBlock block={block} />
    case 'audio':
      return <AudioBlock block={block} />
    case 'simulation':
      return <SimulationBlock block={block} />
    case 'question':
      return null
  }
}

function SolvedExample({ markdown }: { markdown: string }) {
  const { t } = useTranslation()
  return (
    <section className="block-solved">
      <Ui className="block-label">{t('lesson.solvedExample')}</Ui>
      <Markdown text={markdown} />
    </section>
  )
}

function ImageBlock({ block }: { block: Extract<Block, { type: 'image' }> }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!block.storagePath) return
    let live = true
    getDownloadURL(ref(storage, block.storagePath))
      .then((u) => live && setUrl(u))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [block.storagePath])

  return (
    <figure className="block-image">
      {url ? (
        <img src={url} alt={block.caption} loading="lazy" />
      ) : (
        <div className="image-missing" role="img" aria-label={block.caption}>
          {block.storagePath && !failed ? t('lesson.imageLoading') : t('lesson.imageNotYet')}
        </div>
      )}
      <figcaption>
        <span>{block.caption}</span>
        {block.source && (
          <span className="image-source">
            <Ui>{t('lesson.source')}:</Ui> <bdi>{block.source}</bdi>
          </span>
        )}
      </figcaption>
    </figure>
  )
}

function VideoBlock({ block }: { block: Extract<Block, { type: 'video' }> }) {
  if (!block.youtubeId) return null
  return <VideoPlayer youtubeId={block.youtubeId} title={block.title} source={block.source} start={block.start} end={block.end} />
}

function AudioBlock({ block }: { block: Extract<Block, { type: 'audio' }> }) {
  const { t } = useTranslation()
  const src = block.file || block.link || ''
  const playable = /\.(mp3|m4a|ogg|wav|aac)(\?|$)/i.test(src)
  return (
    <section className="block-audio">
      <Ui className="block-label">{t('lesson.audio')}</Ui>
      {block.intro && <p>{block.intro}</p>}
      <p className="audio-title">{block.title}</p>
      {playable ? (
        <audio controls preload="none" src={src} />
      ) : (
        <a className="button secondary" href={src} target="_blank" rel="noopener noreferrer">
          <Ui>{t('lesson.listenNewTab')}</Ui>
        </a>
      )}
    </section>
  )
}

function SimulationBlock({ block }: { block: Extract<Block, { type: 'simulation' }> }) {
  const { t } = useTranslation()
  return (
    <section className="block-simulation">
      <Ui className="block-label">{t('lesson.simulation')}</Ui>
      <p className="sim-title">{block.title}</p>
      {block.instructions && <Markdown text={block.instructions} />}
      <div className="sim-frame">
        <iframe src={block.link} title={block.title} allow="fullscreen" allowFullScreen />
      </div>
      {/* Some websites refuse to be shown inside another site, so the button is always there (REQ-4.2). */}
      <a className="button secondary" href={block.link} target="_blank" rel="noopener noreferrer">
        <Ui>{t('lesson.openNewTab')}</Ui>
      </a>
    </section>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from '../site'
import { Formula, Markdown } from './Rich'
import type { Block, Question } from './types'

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
  const { t } = useTranslation()
  if (!block.youtubeId) return null
  // YouTube's privacy-enhanced player, inside the lesson (REQ-4.23, D-32).
  const params = new URLSearchParams({ rel: '0' })
  if (block.start != null) params.set('start', String(block.start))
  if (block.end != null) params.set('end', String(block.end))
  const watch = `https://www.youtube.com/watch?v=${block.youtubeId}${block.start ? `&t=${block.start}s` : ''}`
  return (
    <figure className="block-video">
      <div className="video-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${block.youtubeId}?${params}`}
          title={block.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <figcaption>
        <span className="video-title">{block.title}</span>
        <a href={watch} target="_blank" rel="noopener noreferrer" className="video-source">
          <Ui>{t('lesson.source')}:</Ui> <bdi>{block.source}</bdi> · <Ui>{t('lesson.openOnYouTube')}</Ui>
        </a>
      </figcaption>
    </figure>
  )
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

// A question, shown so the lesson can be read. Checking answers (two attempts, hint,
// full solution, check-again questions) comes in part 2 (REQ-4.16, 4.17, 6.3).
export function QuestionView({ q, onContinue, answered }: { q: Question; onContinue: () => void; answered: boolean }) {
  const { t } = useTranslation()
  const [tipsOpen, setTipsOpen] = useState(false)
  const [openTip, setOpenTip] = useState<number | null>(null)
  return (
    <section className={`block-question${answered ? ' answered' : ''}`} aria-label={t('lesson.question')}>
      <Ui className="block-label">{t('lesson.question')}</Ui>
      <Markdown text={q.prompt} className="question-prompt" />

      {q.kind === 'choice' && (
        <fieldset className="choices" disabled={answered}>
          <legend className="visually-hidden">{t('lesson.chooseAnswer')}</legend>
          {q.multipleCorrect && <p className="hint-line"><Ui>{t('lesson.chooseAll')}</Ui></p>}
          {q.choices.map((c) => (
            <label key={c.id} className="choice">
              <input type={q.multipleCorrect ? 'checkbox' : 'radio'} name={q.id} value={c.id} />
              <Markdown text={c.text} inline />
            </label>
          ))}
        </fieldset>
      )}
      {q.kind === 'number' && (
        <label className="number-answer">
          <Ui>{t('lesson.yourAnswer')}</Ui>
          <span className="number-row">
            <input type="text" inputMode="decimal" dir="ltr" autoComplete="off" disabled={answered} />
            {q.unit && <span>{q.unit}</span>}
          </span>
        </label>
      )}
      {q.kind === 'open' && (
        <label className="open-answer">
          <Ui>{t('lesson.yourAnswer')}</Ui>
          <textarea rows={4} disabled={answered} dir="auto" />
        </label>
      )}
      {q.kind === 'audio' && <p className="hint-line"><Ui>{t('lesson.audioLater')}</Ui></p>}

      {q.tips.length > 0 && (
        <div className="tips">
          <button type="button" className="link-button" onClick={() => setTipsOpen((v) => !v)} aria-expanded={tipsOpen}>
            <Ui>{t('lesson.tipsLink')}</Ui>
          </button>
          {tipsOpen && (
            <div className="tips-box">
              {q.tips.map((tip, i) => (
                <div key={i} className="tip">
                  <button type="button" className="tip-title" onClick={() => setOpenTip(openTip === i ? null : i)} aria-expanded={openTip === i}>
                    {tip.title}
                  </button>
                  {openTip === i && <p className="tip-text">{tip.text}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!answered && (
        <div className="question-footer">
          <p className="part-note"><Ui>{t('lesson.checkingLater')}</Ui></p>
          <button type="button" className="button primary" onClick={onContinue}>
            <Ui>{t('lesson.continue')}</Ui>
          </button>
        </div>
      )}
    </section>
  )
}

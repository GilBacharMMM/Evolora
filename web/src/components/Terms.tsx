import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSession } from '../session'
import { navigate } from '../router'
import { loadTerms, termsIn, type Terms } from '../terms'
import { Logo } from './Logo'

// The terms of use (REQ-10.8, D-74, D-75): the screen that asks to agree, the full text page,
// and the "Terms of use" link at the bottom of every page.

// **bold** inside a line.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part))
}

// The full text is simple Markdown: headings, paragraphs, lists and bold.
function FullText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(' '))}</p>)
    if (list.length) blocks.push(<ul key={blocks.length}>{list.map((x, i) => <li key={i}>{inline(x)}</li>)}</ul>)
    para = []
    list = []
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (!line) flush()
    else if (heading) {
      flush()
      blocks.push(heading[1].length === 1 ? <h1 key={blocks.length} className="page-title">{inline(heading[2])}</h1> : <h2 key={blocks.length} className="section-title">{inline(heading[2])}</h2>)
    } else if (/^[-*]\s+/.test(line)) {
      if (para.length) flush()
      list.push(line.replace(/^[-*]\s+/, ''))
    } else {
      if (list.length) flush()
      para.push(line)
    }
  }
  flush()
  return <div className="terms-text">{blocks}</div>
}

function useTerms() {
  const [terms, setTerms] = useState<Terms | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    void loadTerms().then((x) => live && setTerms(x))
    return () => {
      live = false
    }
  }, [])
  return terms
}

// Before anything else: the summary, a link to the full text, and "I agree".
export function TermsGate() {
  const { t, i18n } = useTranslation()
  const { terms, agreeTerms, signOutNow } = useSession()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  if (!terms) return null
  const text = termsIn(terms, i18n.language)
  async function agree() {
    setBusy(true)
    setFailed(false)
    try {
      await agreeTerms()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="page narrow">
      <section className="card terms-card" aria-labelledby="terms-gate-title">
        <Logo size={48} />
        <h1 id="terms-gate-title" className="page-title">
          {text.title}
        </h1>
        <p>{t('terms.beforeYouStart')}</p>
        <ul className="terms-summary">
          {text.summary.map((line, i) => (
            <li key={i}>{inline(line)}</li>
          ))}
        </ul>
        <p>
          <a href="/terms" target="_blank" rel="noopener">
            {t('terms.readAll')}
          </a>
        </p>
        <div className="terms-actions">
          <button type="button" className="button primary" disabled={busy} onClick={() => void agree()}>
            {t('terms.agree')}
          </button>
          <button type="button" className="link-button" onClick={() => void signOutNow()}>
            {t('terms.notNow')}
          </button>
        </div>
        <p className="muted small-note">{t('terms.version', { version: terms.version })}</p>
        {failed && (
          <p role="alert" className="error">
            {t('terms.failed')}
          </p>
        )}
      </section>
    </main>
  )
}

// The full text, at any time (REQ-10.8).
export function TermsPage() {
  const { t, i18n } = useTranslation()
  const terms = useTerms()
  if (terms === undefined) {
    return (
      <main className="page narrow">
        <p className="loading">{t('common.loading')}</p>
      </main>
    )
  }
  return (
    <main className="page narrow">
      <section className="card list-card-padded">
        {terms ? (
          <>
            <FullText text={termsIn(terms, i18n.language).text} />
            <p className="muted small-note">{t('terms.version', { version: terms.version })}</p>
          </>
        ) : (
          <p>{t('terms.none')}</p>
        )}
        <button type="button" className="button secondary" onClick={() => navigate('/')}>
          {t('common.toHome')}
        </button>
      </section>
    </main>
  )
}

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="site-footer">
      <a
        href="/terms"
        onClick={(e) => {
          e.preventDefault()
          navigate('/terms')
        }}
      >
        {t('terms.link')}
      </a>
    </footer>
  )
}

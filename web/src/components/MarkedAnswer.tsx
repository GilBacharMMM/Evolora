import { useTranslation } from 'react-i18next'
import { segmentsFor } from '../markup'

// A written answer as the teacher marked it up (REQ-5.12): the student's words, crossed out where
// the teacher changed them, the teacher's words in the teacher's colour, and highlighted parts.
// Every change is shown by more than colour: crossed out, underlined, or with a background.
export function MarkedAnswer({ original, markup }: { original: string; markup: string }) {
  const { t } = useTranslation()
  return (
    <div className="marked-answer" dir="auto">
      {segmentsFor(original, markup).map((s, i) => {
        const cls = s.highlight ? 'mark-highlight' : undefined
        if (s.kind === 'removed') {
          return (
            <del key={i} className="mark-removed" title={t('markup.removed')}>
              {s.text}
            </del>
          )
        }
        if (s.kind === 'added') {
          return (
            <ins key={i} className={`mark-added${cls ? ' ' + cls : ''}`} title={t('markup.added')}>
              {s.text}
            </ins>
          )
        }
        return (
          <span key={i} className={cls}>
            {s.text}
          </span>
        )
      })}
    </div>
  )
}

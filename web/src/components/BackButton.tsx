import { useTranslation } from 'react-i18next'
import { navigate } from '../router'

export function BackButton({ to = '/' }: { to?: string }) {
  const { t } = useTranslation()
  return (
    <button type="button" className="back-button" onClick={() => navigate(to)}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="flip-rtl" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <span>{t('common.back')}</span>
    </button>
  )
}

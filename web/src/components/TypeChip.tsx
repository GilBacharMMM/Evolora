import { useTranslation } from 'react-i18next'
import type { LessonType } from '../lesson/types'

// Every lesson shows its type, in the person's language (REQ-4.20).
export function TypeChip({ type }: { type: LessonType }) {
  const { t } = useTranslation()
  return <span className={`type-chip type-${type}`}>{t(`lessonType.${type}`)}</span>
}

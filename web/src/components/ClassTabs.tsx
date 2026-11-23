import { useTranslation } from 'react-i18next'
import { navigate } from '../router'

// The class name and the three tabs of a class: dashboard, grades, class settings.
export function ClassTabs({ classId, name, color, active }: { classId: string; name: string; color: string; active: 'dashboard' | 'grades' | 'manage' }) {
  const { t } = useTranslation()
  const tabs: [typeof active, string, string][] = [
    ['dashboard', t('follow.dashboard'), `/teacher/class/${classId}`],
    ['grades', t('follow.grades'), `/teacher/class/${classId}/grades`],
    ['manage', t('follow.manage'), `/teacher/class/${classId}/manage`],
  ]
  return (
    <div className="card class-card">
      <div className="class-card-top" style={{ background: color }}>
        <h1 className="class-page-title" dir="auto">
          {name}
        </h1>
      </div>
      <nav className="class-tabs" aria-label={name}>
        {tabs.map(([key, label, to]) => (
          <button key={key} type="button" className={`class-tab${key === active ? ' active' : ''}`} aria-current={key === active ? 'page' : undefined} onClick={() => navigate(to)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

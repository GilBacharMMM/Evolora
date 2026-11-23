import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../site'
import { useSession } from '../session'
import { navigate } from '../router'
import { todoList, useClasswork } from '../classwork'
import { WorkRow } from '../components/LessonStatus'

// The student's home (REQ-6.1): a card for each class, the "To do" list beside them, and
// "Join a class". A person who hasn't joined a class sees only the "Join a class" box (REQ-3.2, 10.1).
export function StudentHome() {
  const { t } = useTranslation()
  const { classIds, user } = useSession()
  const classes = useClasswork()

  if (classIds.length === 0) {
    return (
      <main className="page narrow">
        <h1 className="page-title">{t('home.hello', { name: user?.displayName || '' })}</h1>
        <JoinClass />
      </main>
    )
  }

  const todo = classes ? todoList(classes) : []

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">{t('home.hello', { name: user?.displayName || '' })}</h1>
      </div>
      {classes === null ? (
        <p className="loading">{t('common.loading')}</p>
      ) : (
        <div className="home-layout">
          <section className="home-classes" aria-labelledby="classes-title">
            <h2 id="classes-title" className="section-title">
              {t('home.myClasses')}
            </h2>
            <div className="class-grid">
              {classes.map((c) => {
                const open = todoList([c]).length
                return (
                  <button key={c.id} type="button" className="card class-card class-card-button" onClick={() => navigate(`/class/${c.id}`)}>
                    <span className="class-card-top" style={{ background: c.color }}>
                      <span className="class-card-name" dir="auto">
                        {c.name}
                      </span>
                      <span dir="auto">{c.teacherNames.join(', ')}</span>
                    </span>
                    <span className="class-card-body">
                      <span>{open ? t('home.lessonsToDo', { count: open }) : t('home.nothingYet')}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <JoinClass compact />
          </section>
          <aside className="card todo-card" aria-labelledby="todo-title">
            <h2 id="todo-title" className="section-title">
              {t('home.todo')}
            </h2>
            {todo.length === 0 && <p className="muted">{t('home.todoEmpty')}</p>}
            <ul className="lesson-rows" role="list">
              {todo.map((item) => (
                <li key={`${item.classId}-${item.lessonId}`} lang={item.language}>
                  <WorkRow lesson={item} note={
                      <>
                        <bdi>{item.className}</bdi>
                        {item.courseTitle && (
                          <>
                            {' · '}
                            <bdi>{item.courseTitle}</bdi>
                          </>
                        )}
                      </>
                    } />
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </main>
  )
}

type JoinResult = { result: 'joined' | 'already' | 'closed' | 'checkCode' | 'noClass' | 'wait' | 'failed'; className?: string; classId?: string; minutes?: number }

// "Join a class" with a class code (REQ-5.2). The checking service decides; the student joins at once.
function JoinClass({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const { reloadClasses } = useSession()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState<JoinResult | null>(null)

  async function join() {
    if (!code.trim() || busy) return
    setBusy(true)
    setAnswer(null)
    try {
      const r = (await httpsCallable<{ code: string }, JoinResult>(functions, 'joinClass')({ code })).data
      setAnswer(r)
      if (r.result === 'joined' || r.result === 'already') {
        setCode('')
        await reloadClasses()
      }
    } catch {
      setAnswer({ result: 'failed' })
    } finally {
      setBusy(false)
    }
  }

  const good = answer?.result === 'joined' || answer?.result === 'already'
  return (
    <section className={`card join-card${compact ? ' compact' : ''}`} aria-labelledby="join-title">
      <h2 id="join-title">{t('home.joinTitle')}</h2>
      {!compact && <p className="muted">{t('home.joinExplain')}</p>}
      <form
        className="join-form"
        onSubmit={(e) => {
          e.preventDefault()
          void join()
        }}
      >
        <label>
          <span className="visually-hidden">{t('home.classCode')}</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('home.classCode')} dir="ltr" autoComplete="off" spellCheck={false} maxLength={9} />
        </label>
        <button type="submit" className="button primary" disabled={busy || !code.trim()}>
          {busy ? t('home.joining') : t('home.join')}
        </button>
      </form>
      {answer && (
        <p role="status" className={good ? 'notice good' : 'notice'}>
          {t(`home.joinResult.${answer.result}`, { className: answer.className || '', minutes: answer.minutes || 5 })}
        </p>
      )}
    </section>
  )
}

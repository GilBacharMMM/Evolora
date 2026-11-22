import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { IS_TEST_SITE, siteReady } from './site'
import { SessionProvider, useSession } from './session'
import { matchRoute, navigate, usePath } from './router'
import { Header } from './components/Header'
import { SignIn } from './pages/SignIn'
import { StudentHome } from './pages/StudentHome'
import { LessonLibrary, TeacherHome } from './pages/TeacherHome'

// The lesson player, with its formula display, loads only when a lesson is opened,
// so the home page opens quickly (REQ-12.1).
const LessonPlayer = lazy(() => import('./pages/LessonPlayer').then((m) => ({ default: m.LessonPlayer })))

function TestBanner() {
  const { t } = useTranslation()
  if (!IS_TEST_SITE) return null
  return (
    <div className="test-banner" role="note">
      {t('testBanner')}
    </div>
  )
}

function Message({ text }: { text: string }) {
  const { t } = useTranslation()
  return (
    <main className="page narrow">
      <div className="card message-card">
        <p>{text}</p>
        <button type="button" className="button primary" onClick={() => navigate('/')}>
          {t('common.toHome')}
        </button>
      </div>
    </main>
  )
}

function Screens() {
  const { t } = useTranslation()
  const session = useSession()
  const route = matchRoute(usePath())

  if (session.state === 'loading') return <main className="page narrow"><p className="loading">{t('common.loading')}</p></main>
  if (session.state === 'signedOut') return <SignIn />

  const isTeacher = session.role === 'teacher' || session.role === 'admin'
  switch (route.name) {
    case 'home':
      return isTeacher ? <TeacherHome /> : <StudentHome />
    case 'library':
      // Teacher screens can't be opened by students, even by typing the address (REQ-3.4).
      return isTeacher ? <LessonLibrary /> : <Message text={t('common.teachersOnly')} />
    case 'lesson':
      return (
        <Suspense fallback={<main className="page narrow"><p className="loading">{t('common.loading')}</p></main>}>
          <LessonPlayer key={route.lessonId} lessonId={route.lessonId} />
        </Suspense>
      )
    default:
      return <Message text={t('common.notFound')} />
  }
}

export default function App() {
  const { t } = useTranslation()
  if (!siteReady) {
    return (
      <>
        <main className="page narrow">
          <div className="card message-card">
            <p>{t('common.notReady')}</p>
          </div>
        </main>
      </>
    )
  }
  return (
    <SessionProvider>
      <TestBanner />
      <Header />
      <Screens />
    </SessionProvider>
  )
}

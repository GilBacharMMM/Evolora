import { Suspense, useEffect, useState } from 'react'
import { lazyFresh } from './freshness'
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
const LessonPlayer = lazyFresh(() => import('./pages/LessonPlayer').then((m) => ({ default: m.LessonPlayer })))
const TeacherClass = lazyFresh(() => import('./pages/TeacherClass').then((m) => ({ default: m.TeacherClass })))
const follow = () => import('./pages/TeacherFollow')
const ClassDashboard = lazyFresh(() => follow().then((m) => ({ default: m.ClassDashboard })))
const GradeTable = lazyFresh(() => follow().then((m) => ({ default: m.GradeTable })))
const StudentPage = lazyFresh(() => follow().then((m) => ({ default: m.StudentPage })))
const LessonResultsPage = lazyFresh(() => follow().then((m) => ({ default: m.LessonResultsPage })))
const GradingPage = lazyFresh(() => follow().then((m) => ({ default: m.GradingPage })))
const StudentClass = lazyFresh(() => import('./pages/StudentClass').then((m) => ({ default: m.StudentClass })))
const StudentCourse = lazyFresh(() => import('./pages/StudentClass').then((m) => ({ default: m.StudentCourse })))

function TestBanner() {
  const { t } = useTranslation()
  if (!IS_TEST_SITE) return null
  return (
    <div className="test-banner" role="note">
      {t('testBanner')}
    </div>
  )
}

// If the internet connection drops, the student sees a clear message (REQ-12.2).
function OfflineBanner() {
  const { t } = useTranslation()
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (!offline) return null
  return (
    <div className="offline-banner" role="alert">
      {t('common.offline')}
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
  const loading = (
    <main className="page narrow">
      <p className="loading">{t('common.loading')}</p>
    </main>
  )
  switch (route.name) {
    case 'home':
      return isTeacher ? <TeacherHome /> : <StudentHome />
    case 'library':
      // Teacher screens can't be opened by students, even by typing the address (REQ-3.4).
      return isTeacher ? <LessonLibrary /> : <Message text={t('common.teachersOnly')} />
    case 'teacherClass':
    case 'teacherGrades':
    case 'teacherManage':
    case 'teacherStudent':
    case 'teacherLesson':
    case 'teacherGrading': {
      if (!isTeacher) return <Message text={t('common.teachersOnly')} />
      const key = location.pathname
      const page =
        route.name === 'teacherClass' ? (
          <ClassDashboard key={key} classId={route.classId} />
        ) : route.name === 'teacherGrades' ? (
          <GradeTable key={key} classId={route.classId} />
        ) : route.name === 'teacherManage' ? (
          <TeacherClass key={key} classId={route.classId} />
        ) : route.name === 'teacherStudent' ? (
          <StudentPage key={key} classId={route.classId} studentId={route.studentId} />
        ) : route.name === 'teacherLesson' ? (
          <LessonResultsPage key={key} classId={route.classId} lessonId={route.lessonId} />
        ) : (
          <GradingPage key={key} classId={route.classId} lessonId={route.lessonId} />
        )
      return <Suspense fallback={loading}>{page}</Suspense>
    }
    case 'studentClass':
      return (
        <Suspense fallback={loading}>
          <StudentClass key={route.classId} classId={route.classId} />
        </Suspense>
      )
    case 'studentCourse':
      return (
        <Suspense fallback={loading}>
          <StudentCourse key={route.courseId} classId={route.classId} courseId={route.courseId} />
        </Suspense>
      )
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
      <OfflineBanner />
      <Header />
      <Screens />
    </SessionProvider>
  )
}

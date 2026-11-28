import { useEffect, useState } from 'react'

// A very small router: the address bar decides which screen is shown, so the browser's
// back button works and screens can be reached by typing their address.

export function navigate(to: string) {
  if (to === location.pathname) return
  history.pushState(null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}

export function usePath(): string {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const onChange = () => setPath(location.pathname)
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])
  return path
}

export type Route =
  | { name: 'home' }
  | { name: 'lesson'; lessonId: string }
  | { name: 'library' }
  | { name: 'commentsInbox' }
  | { name: 'myComments' }
  | { name: 'teacherClass'; classId: string }
  | { name: 'teacherGrades'; classId: string }
  | { name: 'teacherManage'; classId: string }
  | { name: 'teacherCourses'; classId: string }
  | { name: 'teacherStudent'; classId: string; studentId: string }
  | { name: 'teacherLesson'; classId: string; lessonId: string }
  | { name: 'teacherGrading'; classId: string; lessonId: string }
  | { name: 'studentClass'; classId: string }
  | { name: 'studentCourse'; classId: string; courseId: string }
  | { name: 'terms' }
  | { name: 'accessibility' }
  | { name: 'notFound' }

export function matchRoute(path: string): Route {
  if (path === '/' || path === '') return { name: 'home' }
  if (path === '/terms' || path === '/terms/') return { name: 'terms' }
  if (path === '/accessibility' || path === '/accessibility/') return { name: 'accessibility' }
  const lesson = path.match(/^\/lesson\/([\w-]+)\/?$/)
  if (lesson) return { name: 'lesson', lessonId: lesson[1] }
  if (/^\/teacher\/lessons\/?$/.test(path)) return { name: 'library' }
  // Teachers' comments on lessons (REQ-4.27): the admin's inbox, and a teacher's sent comments.
  if (/^\/admin\/comments\/?$/.test(path)) return { name: 'commentsInbox' }
  if (/^\/teacher\/comments\/?$/.test(path)) return { name: 'myComments' }
  const cls = path.match(/^\/teacher\/class\/([\w-]+)\/?$/)
  if (cls) return { name: 'teacherClass', classId: cls[1] }
  const sub = path.match(/^\/teacher\/class\/([\w-]+)\/(grades|manage|courses|student|lesson)(?:\/([\w-]+))?(\/grade)?\/?$/)
  if (sub) {
    const [, classId, kind, id, grade] = sub
    if (kind === 'grades' && !id) return { name: 'teacherGrades', classId }
    if (kind === 'manage' && !id) return { name: 'teacherManage', classId }
    if (kind === 'courses' && !id) return { name: 'teacherCourses', classId }
    if (kind === 'student' && id && !grade) return { name: 'teacherStudent', classId, studentId: id }
    if (kind === 'lesson' && id) return grade ? { name: 'teacherGrading', classId, lessonId: id } : { name: 'teacherLesson', classId, lessonId: id }
  }
  const sc = path.match(/^\/class\/([\w-]+)\/?$/)
  if (sc) return { name: 'studentClass', classId: sc[1] }
  const course = path.match(/^\/class\/([\w-]+)\/course\/([\w-]+)\/?$/)
  if (course) return { name: 'studentCourse', classId: course[1], courseId: course[2] }
  return { name: 'notFound' }
}

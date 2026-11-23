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
  | { name: 'teacherClass'; classId: string }
  | { name: 'studentClass'; classId: string }
  | { name: 'studentCourse'; classId: string; courseId: string }
  | { name: 'notFound' }

export function matchRoute(path: string): Route {
  if (path === '/' || path === '') return { name: 'home' }
  const lesson = path.match(/^\/lesson\/([\w-]+)\/?$/)
  if (lesson) return { name: 'lesson', lessonId: lesson[1] }
  if (/^\/teacher\/lessons\/?$/.test(path)) return { name: 'library' }
  const cls = path.match(/^\/teacher\/class\/([\w-]+)\/?$/)
  if (cls) return { name: 'teacherClass', classId: cls[1] }
  const sc = path.match(/^\/class\/([\w-]+)\/?$/)
  if (sc) return { name: 'studentClass', classId: sc[1] }
  const course = path.match(/^\/class\/([\w-]+)\/course\/([\w-]+)\/?$/)
  if (course) return { name: 'studentCourse', classId: course[1], courseId: course[2] }
  return { name: 'notFound' }
}

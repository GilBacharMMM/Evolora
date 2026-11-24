import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The test teachers' password (D-71) is kept on this computer, outside the project, and built
// into the full test site only. The students-only test address ("--mode students") and the
// real site never contain it.
function teacherPassword(mode: string): string | null {
  if (mode !== 'test' && mode !== 'development') return null
  const file = path.join(os.homedir(), '.evolora', 'evolora-test-teachers.json')
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8')).password
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: { __TEACHER_PASSWORD__: JSON.stringify(teacherPassword(mode)) },
  build: mode === 'students' ? { outDir: 'dist-students' } : {},
}))

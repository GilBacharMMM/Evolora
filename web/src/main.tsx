import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { NotChrome } from './NotChrome'
import { browserAllowed } from './browser'
import { IS_TEST_SITE } from './site'

// A successful start clears the one-time reload after a new release (App.tsx).
window.addEventListener('load', () => setTimeout(() => { try { sessionStorage.removeItem('evolora.reloaded') } catch { /* ignore */ } }, 10000))

createRoot(document.getElementById('root')!).render(
  <StrictMode>{browserAllowed(IS_TEST_SITE) ? <App /> : <NotChrome />}</StrictMode>,
)

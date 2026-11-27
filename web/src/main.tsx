import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { NotSupported } from './NotSupported'
import { AccessibilityPage, Footer, TermsPage } from './components/Terms'
import { usePath } from './router'
import { browserAllowed } from './browser'

import { ErrorScreen, tidyAddress } from './freshness'

tidyAddress()

// In a browser that isn't supported, the "please use another browser" message, with the
// accessibility statement and terms links at the bottom (REQ-11.1, REQ-12.10).
function Unsupported() {
  const path = usePath()
  return (
    <>
      {path.startsWith('/accessibility') ? <AccessibilityPage /> : path.startsWith('/terms') ? <TermsPage /> : <NotSupported />}
      <Footer />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorScreen>{browserAllowed() ? <App /> : <Unsupported />}</ErrorScreen>
  </StrictMode>,
)

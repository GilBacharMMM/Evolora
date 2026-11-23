import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { NotChrome } from './NotChrome'
import { browserAllowed } from './browser'
import { IS_TEST_SITE } from './site'

import { ErrorScreen, tidyAddress } from './freshness'

tidyAddress()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorScreen>{browserAllowed(IS_TEST_SITE) ? <App /> : <NotChrome />}</ErrorScreen>
  </StrictMode>,
)

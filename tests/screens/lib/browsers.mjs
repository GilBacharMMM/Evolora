// The four browsers Evolora supports (REQ-11.1, D-84), for the automatic tests.
// Chrome and Edge are the ones installed on this computer. Firefox and WebKit (Safari's engine)
// are Playwright's own builds: `npx playwright-core install firefox webkit` once.
// WebKit on Windows is as close to Safari as possible without a Mac, but it is not Safari.

import { chromium, firefox, webkit } from 'playwright-core'

// A pretend microphone, so recording can be tested without a person speaking.
const FAKE_MIC_CHROME = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
const FAKE_MIC_FIREFOX = {
  'media.navigator.streams.fake': true,
  'media.navigator.permission.disabled': true,
}

export const BROWSERS = {
  chrome: { label: 'Google Chrome', launch: ({ show = false } = {}) => chromium.launch({ channel: 'chrome', headless: !show, args: ['--disable-quic', ...FAKE_MIC_CHROME] }) },
  edge: { label: 'Microsoft Edge', launch: ({ show = false } = {}) => chromium.launch({ channel: 'msedge', headless: !show, args: ['--disable-quic', ...FAKE_MIC_CHROME] }) },
  firefox: { label: 'Firefox', launch: ({ show = false } = {}) => firefox.launch({ headless: !show, firefoxUserPrefs: FAKE_MIC_FIREFOX }) },
  webkit: { label: 'WebKit (Safari engine)', launch: ({ show = false } = {}) => webkit.launch({ headless: !show }) },
}

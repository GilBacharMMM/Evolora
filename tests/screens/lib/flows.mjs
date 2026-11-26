// The four main flows, each run in Hebrew, Arabic and English (system-design 8.1).
// Lesson content stays in its own language (Hebrew) whatever the interface language is.

import { expect, goTo, openSite, signInAs, tr, trStart } from './helpers.mjs'

const TEACHING = 'archimedes-density-teaching'
const PRACTICE = 'archimedes-density-practice'
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function question(page, lang, n) {
  return page.locator('section.block-question', { has: page.locator('.block-label', { hasText: new RegExp(`^${esc(tr(lang, 'q.questionNumber', { number: n }))}$`) }) })
}

async function choose(q, text) {
  await q.locator('label.choice').filter({ hasText: new RegExp(`^\\s*${esc(text)}\\s*$`) }).click()
  await q.locator('form.answer-form button.check-button').first().click()
}

async function waitForFeedback(q, kind, count = 1) {
  await q.locator(`.feedback.${kind}`).nth(count - 1).waitFor({ timeout: 20000 })
}

// 1. A student goes through the Archimedes teaching lesson, then a number question in its practice lesson.
export async function studentLesson({ page, lang, screens, step }) {
  const F = 'lesson'
  await step('Test Student 1 signs in and sees their home page', async () => {
    await openSite(page)
    await screens.check(page, F, 'sign-in')
    await signInAs(page, lang, 'Test Student 1')
    await page.getByText(tr(lang, 'home.hello', { name: 'Test Student 1' })).waitFor()
    await screens.check(page, F, 'student-home')
  })
  await step('opens the Archimedes teaching lesson', async () => {
    await page.locator('li', { hasText: 'ארכימדס' }).getByRole('button').first().click()
    await page.locator('article.lesson').waitFor()
    expect(page.url().endsWith(`/lesson/${TEACHING}`), `The address is ${page.url()}`)
    await question(page, lang, 1).waitFor()
    await screens.check(page, F, 'lesson-start')
  })
  await step('question 1: right on the first try', async () => {
    const q = question(page, lang, 1)
    await choose(q, 'כי אפשר להכין כתר במשקל קילוגרם אחד גם מתערובת של זהב ומתכת זולה יותר')
    await waitForFeedback(q, 'correct')
    expect((await q.locator('.feedback.correct .feedback-title').innerText()).includes(tr(lang, 'q.correct')), 'No "Correct!" message')
  })
  await step('question 2: wrong, a hint, then right', async () => {
    const q = question(page, lang, 2)
    await q.scrollIntoViewIfNeeded()
    await choose(q, '0.5 גרם לסמ"ק')
    await waitForFeedback(q, 'hint')
    expect((await q.locator('.feedback.hint').innerText()).includes(tr(lang, 'q.tryAgain')), 'No "Not quite" hint')
    await screens.check(page, F, 'wrong-then-hint')
    await choose(q, '2 גרם לסמ"ק')
    await waitForFeedback(q, 'correct')
    expect((await q.locator('.feedback.correct .feedback-title').innerText()).includes(tr(lang, 'q.correctSecond')), 'No "Correct, on the second try" message')
  })
  await step('question 3: wrong twice, the solution, then a check-again question answered right', async () => {
    const q = question(page, lang, 3)
    await q.scrollIntoViewIfNeeded()
    await choose(q, 'זהב')
    await waitForFeedback(q, 'hint')
    await choose(q, 'נחושת')
    await waitForFeedback(q, 'solution')
    const again = page.locator('section.check-again').first()
    await again.waitFor()
    expect((await again.innerText()).includes(tr(lang, 'q.checkAgain')), 'No "Check again" label')
    await again.scrollIntoViewIfNeeded()
    await screens.check(page, F, 'check-again')
    await again.locator('label.choice').filter({ hasText: /^\s*עופרת\s*$/ }).click()
    await again.locator('button.check-button').click()
    await again.locator('.feedback.correct').waitFor({ timeout: 20000 })
  })
  await step('after a reload, the lesson opens where the student stopped', async () => {
    await page.reload()
    await page.locator('article.lesson').waitFor()
    await question(page, lang, 4).waitFor({ timeout: 20000 })
    await page.waitForTimeout(1500)
    const answered = await page.locator('section.block-question.answered').count()
    expect(answered >= 3, `Only ${answered} questions show as answered after the reload`)
    expect((await page.locator('section.check-again .feedback.correct').count()) === 1, 'The check-again answer is gone after the reload')
    const y = await page.evaluate(() => window.scrollY)
    await screens.check(page, F, 'after-reload')
    expect(y > 300, `The page opened at the top (scrolled ${y} pixels), not at the last question the student reached (REQ-6.2)`, { goOn: true })
    await question(page, lang, 4).scrollIntoViewIfNeeded()
  })
  await step('questions 4 to 6: fill in the blanks (typed, chosen, and words placed)', async () => {
    const words = ['זהב', 'משקל', 'צפיפות', 'נפח']
    const q4 = question(page, lang, 4)
    const typed = q4.locator('input.blank-typed')
    for (let i = 0; i < 4; i++) await typed.nth(i).fill(words[i])
    await q4.locator('button.check-button').click()
    await waitForFeedback(q4, 'correct')
    const q5 = question(page, lang, 5)
    await q5.scrollIntoViewIfNeeded()
    const selects = q5.locator('select.blank-choice')
    for (let i = 0; i < 4; i++) await selects.nth(i).selectOption({ label: words[i] })
    await q5.locator('button.check-button').click()
    await waitForFeedback(q5, 'correct')
    const q6 = question(page, lang, 6)
    await q6.scrollIntoViewIfNeeded()
    await screens.check(page, F, 'blanks-words')
    for (let i = 0; i < 4; i++) {
      await q6.locator('.drag-card', { hasText: new RegExp(`^${words[i]}$`) }).click()
      await q6.locator('.blank-slot').nth(i).click()
    }
    await q6.locator('button.check-button').click()
    await waitForFeedback(q6, 'correct')
  })
  await step('questions 7 and 8: right', async () => {
    const q7 = question(page, lang, 7)
    await q7.scrollIntoViewIfNeeded()
    await choose(q7, 'נפח הגוף שלו שהיה בתוך המים')
    await waitForFeedback(q7, 'correct')
    const q8 = question(page, lang, 8)
    await q8.scrollIntoViewIfNeeded()
    await choose(q8, 'הכתר מזויף: מעורבת בו מתכת שצפיפותה קטנה מזו של זהב')
    await waitForFeedback(q8, 'correct')
  })
  await step('question 9: an open answer is sent and saved for the teacher', async () => {
    const q9 = question(page, lang, 9)
    await q9.scrollIntoViewIfNeeded()
    await q9.locator('textarea').fill('המסה 3 ק"ג, הנפח 1.5 ליטר, ולכן הצפיפות 2 ק"ג לליטר.')
    await q9.locator('form.open-answer button.check-button').click()
    await q9.locator('.feedback.saved').waitFor({ timeout: 20000 })
    expect((await q9.locator('.feedback.saved').innerText()).includes(tr(lang, 'q.savedForTeacher')), 'No "Your answer is saved" message')
    await screens.check(page, F, 'open-answer-saved')
  })
  await step('the lesson is finished, and the practice lesson opens', async () => {
    await goTo(page, '/')
    await page.getByText(tr(lang, 'home.hello', { name: 'Test Student 1' })).waitFor()
    // Finishing is saved by the checking service; the practice lesson appears in "To do" when it opens.
    const practice = page.locator('li', { hasText: 'תרגול: צפיפות ומדידת נפח' })
    for (let i = 0; i < 6 && !(await practice.count()); i++) {
      await page.waitForTimeout(5000)
      await page.reload()
      await page.getByText(tr(lang, 'home.hello', { name: 'Test Student 1' })).waitFor()
    }
    await practice.first().waitFor({ timeout: 5000 })
    await screens.check(page, F, 'home-after-lesson')
    await practice.first().getByRole('button').first().click()
    // Seen once: the home page offers the lesson, but the lesson page says it isn't open. Reload once
    // and go on, but report it.
    const notOpen = page.getByText(tr(lang, 'lesson.notAllowed'))
    await question(page, lang, 1).or(notOpen).first().waitFor({ timeout: 20000 })
    const wasNotOpen = await notOpen.isVisible()
    if (wasNotOpen) {
      await screens.check(page, F, 'said-not-open')
      await page.reload()
      await question(page, lang, 1).waitFor({ timeout: 20000 })
    }
    expect(page.url().endsWith(`/lesson/${PRACTICE}`), `The address is ${page.url()}`)
    expect(!wasNotOpen, `The home page offered the practice lesson, but the lesson page said "This lesson isn't open to you" until it was reloaded`, { goOn: true })
  })
  await step('practice question 1: a number answer, first with letters, then wrong, then right', async () => {
    const q = question(page, lang, 1)
    const input = q.locator('label.number-answer input')
    await input.fill('שתיים')
    await q.locator('button.check-button').click()
    await q.locator('.answer-problem').waitFor()
    expect((await q.locator('.answer-problem').innerText()).includes(trStart(lang, 'q.problem.notNumber').slice(0, 20)), 'No "Please type a number" message')
    await screens.check(page, F, 'number-not-a-number')
    await input.fill('0.37')
    await q.locator('button.check-button').click()
    await waitForFeedback(q, 'hint')
    await input.fill('2.7')
    await q.locator('button.check-button').click()
    await waitForFeedback(q, 'correct')
    await screens.check(page, F, 'number-right')
  })
}

// 2. The terms of use appear for Test Student 7 before anything else (REQ-10.8).
export async function termsFirst({ page, lang, screens, step }) {
  const F = 'terms'
  await step('Test Student 7 signs in and sees the terms of use before anything else', async () => {
    await openSite(page)
    await signInAs(page, lang, 'Test Student 7')
    const gate = page.locator('#terms-gate-title')
    await gate.waitFor({ timeout: 20000 })
    expect((await page.locator('main').innerText()).includes(tr(lang, 'terms.beforeYouStart')), 'The terms summary is missing')
    expect((await page.getByText(tr(lang, 'home.joinTitle')).count()) === 0, 'The home page shows behind the terms')
    await screens.check(page, F, 'terms-gate')
  })
  await step('the full terms open from the link', async () => {
    // The link opens the full terms in a new tab.
    const [full] = await Promise.all([page.context().waitForEvent('page'), page.getByText(tr(lang, 'terms.readAll')).first().click()])
    screens.watch(full)
    await full.locator('.terms-text').waitFor()
    await screens.check(full, F, 'terms-full')
    await full.close()
  })
  await step('after "I agree", the home page appears', async () => {
    await page.getByRole('button', { name: tr(lang, 'terms.agree') }).click()
    await page.getByText(tr(lang, 'home.joinTitle')).first().waitFor({ timeout: 20000 })
    await screens.check(page, F, 'home-after-agreeing')
  })
}

// 3. A student joins the test class with its code; a mistyped code says "check the code" (REQ-5.2).
export async function joinClass({ page, lang, screens, step, classCode }) {
  const F = 'join'
  const codeBox = page.getByLabel(tr(lang, 'home.classCode'))
  await step('a mistyped class code shows "check the code"', async () => {
    // Change one character: the code's last character checks the others, so this is a typing mistake.
    const wrongChar = classCode[2] === 'A' ? 'B' : 'A'
    const mistyped = classCode.slice(0, 2) + wrongChar + classCode.slice(3)
    await codeBox.fill(mistyped)
    await page.getByRole('button', { name: tr(lang, 'home.join'), exact: true }).click()
    const msg = page.getByText(tr(lang, 'home.joinResult.checkCode'))
    await msg.waitFor({ timeout: 20000 })
    await screens.check(page, F, 'check-the-code')
  })
  await step('the right code joins Test Class 7A', async () => {
    await codeBox.fill(classCode.toLowerCase())
    await page.getByRole('button', { name: tr(lang, 'home.join'), exact: true }).click()
    // "You joined" shows until the class appears under "My classes".
    const joined = page.getByText(tr(lang, 'home.joinResult.joined', { className: 'Test Class 7A' }))
    const myClasses = page.getByText(tr(lang, 'home.myClasses'))
    await joined.or(myClasses).first().waitFor({ timeout: 20000 })
    await myClasses.waitFor({ timeout: 20000 })
    await page.getByText('Test Class 7A').first().waitFor()
    await screens.check(page, F, 'joined')
  })
}

// 4. A teacher sees Test Student 5's finished work, grades an open answer with a comment, and the
//    grade table shows it (REQ-5.10, 5.12, 5.11).
export async function teacherGrades({ page, lang, screens, step }) {
  const F = 'teacher'
  const comment = `ניסיון בדיקה אוטומטית (${lang})`
  await step('Test Teacher 1 signs in and sees their home page', async () => {
    await openSite(page)
    await signInAs(page, lang, 'Test Teacher 1')
    await page.getByText('Test Class 7A').first().waitFor({ timeout: 20000 })
    await screens.check(page, F, 'teacher-home')
  })
  await step('opens the class dashboard and sees Test Student 5\'s finished work', async () => {
    await page.getByText('Test Class 7A').first().click()
    await page.waitForURL(/\/teacher\/class\/test-class$/)
    const row = page.locator('tr', { hasText: 'Test Student 5' })
    await row.waitFor({ timeout: 20000 })
    const text = await row.innerText()
    expect(/1\/3/.test(text), `Test Student 5's row doesn't show the finished Archimedes lesson: "${text.replace(/\s+/g, ' ')}"`)
    await screens.check(page, F, 'class-dashboard')
  })
  await step('opens the grading page and grades the open answer with a comment', async () => {
    await goTo(page, `/teacher/class/test-class/lesson/${TEACHING}/grade`)
    await page.getByText(tr(lang, 'follow.instructions')).first().waitFor({ timeout: 20000 })
    // Other students' answers may come first: move on to Test Student 5.
    const next = page.getByRole('button', { name: new RegExp(esc(tr(lang, 'follow.nextStudent'))) })
    for (let i = 0; i < 10 && !(await page.getByText('Test Student 5', { exact: true }).isVisible()); i++) {
      await next.click()
      await page.waitForTimeout(500)
    }
    await page.getByText('Test Student 5', { exact: true }).waitFor()
    await screens.check(page, F, 'grading-page')
    await page.getByRole('button', { name: tr(lang, 'follow.half'), exact: true }).click()
    await page.getByLabel(tr(lang, 'follow.comment')).fill(comment)
    await page.getByRole('button', { name: new RegExp(`^(${esc(tr(lang, 'follow.save'))}|${esc(tr(lang, 'follow.saveChange'))})$`) }).click()
    await page.getByText(tr(lang, 'follow.saved')).first().waitFor({ timeout: 20000 })
    await screens.check(page, F, 'grade-saved')
  })
  await step('the grade table shows the grade', async () => {
    await goTo(page, '/teacher/class/test-class/grades')
    const row = page.locator('tr', { hasText: 'Test Student 5' })
    await row.waitFor({ timeout: 20000 })
    const text = (await row.innerText()).replace(/\s+/g, ' ')
    expect(/\d+%/.test(text), `Test Student 5's row in the grade table shows no grade: "${text}"`)
    await screens.check(page, F, 'grade-table')
  })
}

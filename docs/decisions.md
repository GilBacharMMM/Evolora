# Evolora: Decision Log

Every significant decision is recorded here, newest at the bottom. Decisions are never deleted; if a decision is reversed, a new entry explains why and refers to the old one.

Each entry has a **status**: **Decided** (Gil has agreed) or **Proposed** (waiting for Gil's approval).

Entry format:

> ### D-N: Short title
> **Date:** YYYY-MM-DD · **Status:** Decided / Proposed · **Decided by:** who
> **Context:** what question needed answering
> **Options considered:** the options, with pros and cons
> **Decision:** what was chosen
> **Reason:** why
> **Affects:** related REQ numbers or documents

---

### D-1: Web app for Chromebooks first
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Which platform the first version runs on.
**Options considered:**
1. Web app in the browser: works on Chromebooks with nothing to install.
2. Phone apps: students don't use phones at school.
3. Both: much more work for the first version.

**Decision:** Web app only, built for Chromebooks.
**Reason:** The school's students and teachers all use Chromebooks.
**Affects:** REQ-11.1

### D-2: Google sign-in, school accounts only during the pilot
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** How people sign in, and who may sign in.
**Options considered:**
1. Google sign-in: everyone already has a school Google account; no passwords to manage.
2. Email and password: needed for outsiders, but more to build and more risk.
3. Ministry of Education sign-in: useful later, not needed for the pilot.

**Decision:** Google sign-in only, limited to @taded.org.il accounts. Other methods later.
**Reason:** Fits the school's Google setup and keeps the pilot to known users.
**Affects:** REQ-3.1, 3.2, 3.3

### D-3: Hebrew, Arabic and English from day 1
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Which languages the first version supports.
**Options considered:**
1. Hebrew only first: simpler, but adding right-to-left and left-to-right together later is costly.
2. Hebrew, Arabic and English from the start.

**Decision:** All three, with both right-to-left and left-to-right layouts. No automatic translation for now.
**Reason:** Required by the school's population; building both directions in from the start avoids rework.
**Affects:** Section 9

### D-4: No AI in the MVP; Gemini preferred later
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Whether and where to use AI in the first version.
**Options considered:**
1. AI from the start: attractive, but adds cost, risk and time to a 2 to 4 week schedule.
2. No AI in the MVP, designed so AI can be added.

**Decision:** No AI in the MVP. When AI is added, prefer Gemini (approved by the school), and estimate costs before each AI feature.
**Reason:** Gil needs to understand AI running costs first; the pilot doesn't depend on AI.
**Affects:** Section 7

### D-5: Everything open
**Date:** 2026-11-20 · **Status:** Decided (licences still Proposed) · **Decided by:** Gil
**Context:** Who owns and can reuse lessons and code.
**Options considered:**
1. Closed: each creator's lessons are private.
2. Open, like Wikipedia or GNU: anyone may use and change lessons and code, with credit to creators.

**Decision:** Open. Any teacher can use any lesson, any creator can copy and change any lesson, and creators are credited by name. Proposed licences: CC BY-SA 4.0 for lessons and AGPL-3.0 for code (OPEN Q-1).
**Reason:** Gil's goal is an open lesson library that grows through sharing.
**Affects:** REQ-1.1, 4.8, 4.9

### D-6: Changing a lesson doesn't affect students who started it
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** What happens when a creator changes a lesson that is in use.
**Options considered:**
1. Everyone sees the change at once: simple, but can break the work of students in the middle.
2. Students who started keep their version; new students get the new one.

**Decision:** Option 2.
**Reason:** Changes are rare, and students in the middle shouldn't be disrupted.
**Affects:** REQ-4.7

### D-7: Three attempts with reduced marks
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** How automatically checked questions are scored, given the goal of mastery.
**Options considered:**
1. One attempt.
2. Unlimited attempts.
3. 3 attempts, with marks reduced each time, then the correct answer is shown.

**Decision:** Option 3: full marks, then 2/3, then 1/3, then 0 with the answer shown.
**Reason:** Encourages getting it right while letting the student move on. AI help is planned for stage 2.
**Affects:** REQ-6.3

### D-8: Visual formula editor
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** How creators write math formulas.
**Options considered:**
1. Typing formula code (TeX): powerful, but hard for most teachers.
2. Images of formulas: easy, but can't be edited and look poor.
3. A visual editor inside Evolora, storing formulas in a standard format behind the scenes.

**Decision:** Option 3.
**Reason:** Easiest for teachers, and the standard format makes future import from Google Docs possible.
**Affects:** REQ-4.3

### D-9: MVP in two milestones
**Date:** 2026-11-20 · **Status:** Proposed · **Decided by:** awaiting Gil
**Context:** Gil wants real students using Evolora in 2 to 4 weeks, but the full MVP is large.
**Options considered:**
1. Build the full MVP, then start: risks missing the date.
2. Milestone A (a real lesson in class, about 2 weeks), then Milestone B (full teacher tools, about 2 more weeks).

**Decision:** Option 2 (proposed).
**Reason:** Gets real feedback from students early and lowers the risk of missing the date.
**Affects:** roadmap.md

### D-10: Host on Google Cloud, Israel region
**Date:** 2026-11-20 · **Status:** Proposed · **Decided by:** awaiting Gil
**Context:** Where Evolora runs.
**Options considered:**
1. Google Cloud (Firebase): fits the school's Google accounts, has an Israel (Tel Aviv) region, and makes Gemini easy to add later. A pilot this size likely costs little or nothing per month.
2. Other cloud providers (Amazon, Microsoft, Vercel and others): equally capable, but no advantage for a Google school.
3. School servers: more maintenance, harder to reach from home.

**Decision:** Option 1 (proposed).
**Reason:** Best fit with the school's Google setup and the planned use of Gemini.
**Affects:** REQ-10.4, 11.2; OPEN Q-8

### D-11: Google Classroom connection later
**Date:** 2026-11-20 · **Status:** Proposed · **Decided by:** awaiting Gil
**Context:** Whether to connect to Google Classroom in the first version.
**Options considered:**
1. No connection in the MVP; students join with a class code or invite.
2. Import class lists from Classroom: helpful, but needs the school's Google admin to approve Evolora's access, and adds work.
3. Full connection (assignments and grades go back to Classroom): most work.

**Decision:** Option 1 for the MVP; consider option 2 in version 2.
**Reason:** With 5 teachers, joining by class code is quick; Classroom access needs school admin approval that could delay the pilot.
**Affects:** REQ-5.17

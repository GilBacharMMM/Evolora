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
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Who owns and can reuse lessons and code.
**Options considered:**
1. Closed: each creator's lessons are private.
2. Open, like Wikipedia or GNU: anyone may use and change lessons and code, with credit to creators.

**Decision:** Open. Any teacher can use any lesson, any creator can copy and change any lesson, and creators are credited by name. Licences: CC BY-SA 4.0 for lessons (the Wikipedia licence) and AGPL-3.0 for code (a GNU licence that also covers websites, so anyone who runs a changed version must share their changes). Gil approved the licences on 2026-11-20.
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
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Where Evolora runs.
**Options considered:**
1. Google Cloud (Firebase): fits the school's Google accounts, has an Israel (Tel Aviv) region, and makes Gemini easy to add later. A pilot this size likely costs little or nothing per month.
2. Other cloud providers (Amazon, Microsoft, Vercel and others): equally capable, but no advantage for a Google school.
3. School servers: more maintenance, harder to reach from home.

**Decision:** Option 1. Gil sets up the account (see docs/setup-google-cloud.md); who owns it long-term (Gil or the school) is still to be decided.
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

### D-12: "Private" course means unlisted
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Everything in Evolora is open (D-5), so what can "private course" mean?
**Options considered:**
1. Truly private: no one else can see the course or its lessons. Conflicts with D-5.
2. Unlisted: the course isn't shown in the course library and students can't enroll on their own, but its lessons remain open in the lesson library.
3. No private courses at all.

**Decision:** Option 2.
**Reason:** Lets teachers keep their own course arrangements tidy without closing any content.
**Affects:** REQ-4.10

### D-13: Pilot without formal privacy approval
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Students are minors. Should the school's management or IT formally approve Evolora before the pilot?
**Options considered:**
1. Get written approval first: safer, but may delay the pilot.
2. Run the pilot with basic protections only (school accounts only, data in Israel, private messages, no student-to-student contact), and meet full privacy rules before any wider release.

**Decision:** Option 2.
**Reason:** The pilot is small and internal; Gil wants to start within weeks. Full compliance is required before release beyond the pilot (REQ-10.6).
**Affects:** Section 10

### D-14: Web address evoloraedu.org, registered at Cloudflare
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Evolora needs its own web address.
**Options considered:**
1. evolora.org: preferred, but not available.
2. evolora.cc: available, but .cc addresses are sometimes blocked by school web filters and look less trustworthy.
3. evolora.app, evolora.net and similar.
4. evoloraedu.org: .org fits an open, educational project, and "edu" says what it is.

Registrars considered: GoDaddy (reliable, but higher renewal prices and many add-ons) and Cloudflare (sells at cost, no add-ons).

**Decision:** evoloraedu.org, registered at Cloudflare.
**Reason:** Trusted ending, unlikely to be blocked at school, low yearly cost.
**Affects:** REQ-11.2

### D-15: Firebase project and spending alert
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Setting up the Google Cloud (Firebase) project from D-10.
**Decision:** Gil created the Firebase project (project ID **evolora**) with Gil's personal Google account as owner, and set a spending alert of 50 ILS per month. Others (for example, someone from the school) can be added as owners later.
**Note:** Google's budget only sends warning emails; it doesn't stop the service or cap spending automatically. Claude will check the actual costs with Gil after the first month.
**Affects:** REQ-11.2, docs/setup-google-cloud.md

### D-16: Building blocks for the software
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Which tools to build Evolora with. Gil won't work with these directly; what matters is that they're reliable, well known, free and open source, good at right-to-left text, and work well with Firebase (D-10).
**Options considered:**
1. React (the most widely used tool for building websites), with Firebase services for sign-in, database, storage and server logic.
2. A ready-made learning platform such as Moodle, adapted to our needs: lots of features, but heavy, hard to shape to the "answer to continue" lesson flow, and needs its own server.
3. Other website tools (Vue, Angular, Svelte): equally capable, with smaller communities.

**Decision:** Option 1, with Tiptap for the lesson editor and MathLive for formulas (full list in system-design.md, section 9).
**Reason:** Widely used, so future developers can pick it up easily; all the pieces are open source; Tiptap and MathLive handle right-to-left text and formulas well.
**Affects:** system-design.md

### D-17: Answers are checked in the cloud, not on the student's computer
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Where multiple-choice answers are checked.
**Options considered:**
1. On the Chromebook: simplest and fastest, but the correct answers would be inside the web page, where a curious student could find them.
2. In the cloud (the checking service): the correct answers stay in a protected area until the 3rd wrong attempt.

**Decision:** Option 2.
**Reason:** Grades must be trustworthy. The extra delay is a fraction of a second.
**Affects:** REQ-6.3, REQ-12.1, system-design.md section 5

### D-18: A separate test site
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Where new features are checked before real students see them.
**Options considered:**
1. Test on the real site: no extra setup, but real students may see unfinished features, and test data mixes with real grades.
2. A separate Firebase project used only for testing, with made-up data. Gil approves each feature there before it goes to the real site.

**Decision:** Option 2. The test site is the Firebase project **evolora-test**, with a one-click user switcher and ready-made test data (REQ-12.4 to 12.6).
**Reason:** Protects real students and their data; gives Gil a safe place to check acceptance criteria.
**Affects:** system-design.md sections 7.3 and 8

### D-19: Regular Google accounts instead of school accounts for the pilot
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** The plan was to allow only @taded.org.il school accounts (D-2). Gil found that a website using school Google sign-in must first be approved by the Ministry of Education, which hasn't happened yet.
**Options considered:**
1. Wait for Ministry approval: safest, but delays the pilot by an unknown time.
2. Use regular Google accounts (such as Gmail) for now; strangers who sign in see nothing until they join a class with a code.
3. Email and password accounts made by Evolora: more to build, and passwords to manage.

**Decision:** Option 2. This replaces the "school accounts only" part of D-2; Google sign-in itself stays.
**Reason:** Lets the pilot start on time, while keeping content and student work hidden from anyone who hasn't joined a class.
**Affects:** REQ-3.2, REQ-3.3, REQ-10.1; OPEN Q-15

### D-20: Every image records its source
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Lessons are shared under CC BY-SA (D-5), so every image must be allowed to be shared that way.
**Options considered:**
1. Trust creators, record nothing.
2. A single "I have the rights" checkbox.
3. Record each image's source, as Wikipedia does: own work, AI-generated, or another source with author, link and licence.

**Decision:** Option 3.
**Reason:** Gives proper credit, makes rights clear to anyone reusing the lesson, and fits the open model.
**Affects:** REQ-4.2, REQ-4.15

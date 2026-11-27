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
**Update (2026-11-20):** replaced by D-21: 2 attempts, with a hint after the 1st wrong answer and the full solution and a check-again question after the 2nd. Marks for a correct 2nd attempt are still open (OPEN Q-18).

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
**Date:** 2026-11-20 · **Status:** Replaced by the parts plan (docs/roadmap.md); approved by Gil (2026-11-26) · **Decided by:** Gil
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
2. In the cloud (the checking service): the correct answers stay in a protected area until the last wrong attempt (now the 2nd, D-21).

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

### D-21: Creator-written hints and check-again questions, before AI
**Date:** 2026-11-20 · **Status:** Decided (marks on the 2nd attempt still open, OPEN Q-18) · **Decided by:** Gil
**Context:** Students who get a question wrong need help to understand, not just the correct answer. Earlier, this help was planned as an AI feature for stage 2 (old REQ-6.9).
**Options considered:**
1. Only show "wrong, try again", then the answer (the earlier MVP plan).
2. Wait for AI to explain and make up practice questions (stage 2).
3. The creator writes hints, a full solution and a bank of similar check-again questions in advance; Evolora shows them in order and sends the teacher a red flag if the check-again question is also wrong.

**Decision:** Option 3 (Gil's idea), with **2 attempts**: after the 1st wrong attempt, one hint; after the 2nd, the full solution and right away a check-again question. Check-again questions for calculations are similar calculations; for understanding questions, the same question in other words with different answers.
**Reason:** It works without AI, so it can be in the MVP. The creator controls the wording, and the check-again question shows whether the student really understood rather than just reading the answer.
**Affects:** REQ-4.16, REQ-4.17, REQ-6.3, REQ-5.10, REQ-7.2

### D-22: "I didn't understand" help line on every question
**Date:** 2026-11-20 · **Status:** Decided in principle by Gil; details proposed (OPEN Q-20) · **Decided by:** Gil
**Context:** A student who is stuck should be able to ask for help at the moment they need it, not only after wrong answers.
**Options considered:**
1. No help inside the lesson; the student messages the teacher (REQ-5.16).
2. A free AI chat.
3. A help line under every question, answered by AI that must not reveal the answer and must stay on the question's subject, with a red flag to the teacher if it doesn't lead to a correct answer.

**Decision:** Option 3, in Version 2, because the MVP has no AI. Claude recommends that, until then, the help line sends the student's question to the teacher (option 1 in the same place on screen).
**Reason:** Keeps help focused and safe for minors, and teachers still find out who is struggling.
**Affects:** REQ-6.9, REQ-7.2

### D-23: Question levels and secret student levels
**Date:** 2026-11-20 · **Status:** Decided in principle by Gil; the grade counts only the questions the student received; other details proposed (OPEN Q-21) · **Decided by:** Gil
**Context:** A class mixes weaker and stronger students. Hard questions can block weaker students, while stronger students need a challenge.
**Options considered:**
1. Every student gets every question.
2. Separate lessons for each level.
3. Each question has a level from 1 to 3; each student has a secret level from 1 to 3 (start at 2), set only by the teacher, with Evolora suggesting levels from average grades (weakest 10% at 1, strongest 10% at 3). A student sees questions at or below their level.

**Decision:** Option 3 (Gil's idea).
**Reason:** One lesson serves the whole class; the teacher keeps full control; students aren't labelled in front of others.
**Affects:** REQ-4.18, REQ-5.18, REQ-6.10, REQ-12.6
**Update (2026-11-22, Gil):** levels are per class; a teacher's change stays until the teacher changes it again; Evolora keeps suggesting changes for the weakest and strongest 10%; teachers see levels on the dashboard.

### D-24: Multiple choice answers in random order
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** Students sit next to each other on Chromebooks and can copy "the second answer".
**Options considered:**
1. Same order for everyone, as the creator wrote it.
2. A random order for each student, kept the same when they come back.

**Decision:** Option 2.
**Reason:** Makes copying harder at no cost to the creator.
**Affects:** REQ-4.19

### D-25: Teaching lessons and practice lessons
**Date:** 2026-11-20 · **Status:** Decided in principle by Gil; details open (OPEN Q-23) · **Decided by:** Gil
**Context:** Some subjects, especially mathematics, need lessons that only practise what was already taught.
**Options considered:**
1. One kind of lesson; creators simply make some with questions only.
2. Two lesson types: learning (new material) and practice (questions only, on material already learned).

**Decision:** Option 2.
**Reason:** Teachers and students can tell at a glance what kind of lesson it is, and Evolora can treat practice lessons differently where needed.
**Affects:** REQ-4.20

### D-26: Gil sets feature priorities at the end of the requirements
**Date:** 2026-11-20 · **Status:** Decided · **Decided by:** Gil
**Context:** New ideas keep coming in while the requirements are being written, so deciding the build order one feature at a time is premature.
**Options considered:**
1. Claude places each feature in a milestone as it comes in.
2. When the requirements are finished, Claude gives Gil a list of all features with suggestions, and Gil gives each one of 3 priority levels.

**Decision:** Option 2. This replaces the earlier answer to Q-22 (hints in Milestone A, levels in Milestone B).
**Reason:** Gil sees the whole picture before choosing what comes first.
**Affects:** Roadmap; all requirements marked "to be set by Gil"

### D-27: Evolora is a working name; a new name will be chosen
**Date:** 2026-11-20 · **Status:** Decided: the name stays Evolora (2026-11-22) · **Decided by:** Gil
**Context:** Gil bought evolura.org and considered renaming to Evolura (from "evolution"). A check showed that both "Evolora" and "Evolura" are already used a lot by others.
**Options considered:**
1. Rename to Evolura and use evolura.org.
2. Keep Evolora.
3. Keep Evolora as a working name for now, and choose a new, unused name later.

**Decision:** Option 3. Claude may suggest names.
**Update (2026-11-22):** Gil's current favourite is **Evoluni** (evolution + university); a decision is expected within 1 to 2 days.
**Final (2026-11-22, Gil):** the name stays **Evolora**, and the web address stays **evoloraedu.org**, owned by Gil.
**Reason:** Neither name is distinctive. Renaming later costs about an hour of Claude's work, as long as it happens before students see the name.
**Affects:** D-14, REQ-11.2, OPEN Q-17

### D-28: No images copied from the web without permission
**Date:** 2026-11-21 · **Status:** Decided · **Decided by:** Gil
**Context:** The images in Gil's circles lesson were copied from the web without permission, so they can't be shared under the lesson's licence (D-5, D-20).
**Options considered:**
1. Keep them and hope no one objects.
2. Look for free images (for example, on Wikimedia Commons) with a suitable licence.
3. Replace them with similar images made by AI.

**Decision:** Option 3. For the circles lesson, Claude drew the illustrations and diagrams itself; the source of each is recorded as "AI-generated (drawn by Claude)". Option 2 stays possible for future lessons.
**Reason:** Clear rights, and the diagrams can be drawn exactly to match the mathematics.
**Affects:** REQ-4.15, lessons/circles-teaching

### D-29: The teacher sets the minimum questions per topic
**Date:** 2026-11-21 · **Status:** Decided · **Decided by:** Gil
**Context:** Gil wants every student, even the strongest, to answer several questions on each topic of the circles lesson.
**Options considered:**
1. A rule only for how the circles lesson is written.
2. The creator sets a fixed minimum per topic.
3. The creator sets a default; the teacher can change it when assigning.

**Decision:** Option 3. Default 3 for the circles lesson, 1 for the Archimedes lesson. The minimum counts **correct** answers: a student moves on once they reach it (Q-24). Questions marked "extra practice" are asked only until then; a student who runs out of them moves on with a red flag to the teacher (Q-26).
**Reason:** The creator knows the material; the teacher knows the class.
**Affects:** REQ-4.21, REQ-5.9

### D-30: Type-a-number questions
**Date:** 2026-11-21 · **Status:** Decided · **Decided by:** Gil
**Context:** For calculation practice, choosing from four answers lets students guess or work backwards from the choices.
**Options considered:**
1. Multiple choice only, with common mistakes as wrong choices.
2. A question type where the student types the number.

**Decision:** Option 2. An answer correct to one digit after the decimal point is accepted.
**Reason:** Students must really calculate, and it is closer to how they will work in class and in exams.
**Affects:** REQ-4.22, REQ-4.16

### D-31: Solved examples in lessons
**Date:** 2026-11-21 · **Status:** Decided · **Decided by:** Gil
**Context:** Before practising a calculation, students need to see how it is done.
**Options considered:**
1. Explain only in the text.
2. A block type "solved example": a question with its full answer, nothing to answer.

**Decision:** Option 2, shown as "Question: ..." and "Answer: to calculate ..., you ...". The circles lesson has two in each topic.
**Reason:** Students learn the method step by step before they try it themselves.
**Affects:** REQ-4.2

### D-32: YouTube videos through YouTube's embedded player
**Date:** 2026-11-21 · **Status:** Decided (approved by Gil on 2026-11-21) · **Decided by:** Gil, on Claude's recommendation
**Context:** Gil wants videos to play inside the lesson window, sometimes only part of a video, and asked about copyright and ads.
**Options considered:**
1. Link to YouTube; the student leaves Evolora to watch.
2. Download videos and host them in Evolora. Not allowed without each owner's permission, and costly.
3. YouTube's standard embedded player, in privacy-enhanced mode, with start and end times. Allowed by YouTube's terms: the video stays on YouTube, the owner keeps control and can block embedding. Ads may appear if the owner shows ads; Evolora may not block or skip them.
4. YouTube Player for Education: an ad-free player without recommendations. Only for approved education companies that pay YouTube a licence fee.

**Decision:** Option 3 now. Look at option 4 again before a wider release, if ads turn out to be a problem in class.
**Reason:** Legal, free, and simple. Educational videos often have few or no ads, and the teacher can choose videos without them.
**Affects:** REQ-4.2, REQ-4.23

### D-33: No lesson creation inside Evolora in stage 1
**Date:** 2026-11-21 · **Status:** Decided · **Decided by:** Gil
**Context:** Building screens for creating lessons (the lesson builder, a formula editor, preview, copying) is a large part of the MVP. Meanwhile Gil already writes lessons with Claude as lesson files, which works well.
**Options considered:**
1. Build lesson creation inside Evolora in stage 1, as planned.
2. In stage 1, Gil writes all lessons with Claude as lesson files, and Claude loads them into Evolora. Stage 1 concentrates on the teacher's and the student's screens. Lesson creation inside Evolora comes in stage 2.

**Decision:** Option 2.
**Reason:** Puts real lessons in front of students sooner, and puts the effort where the pilot needs it: what teachers and students see.
**Update (2026-11-21, Gil):** pilot teachers can write their own lessons with Claude Code, using a lesson-writing kit that Claude prepares and keeps up to date (REQ-4.25). They send the finished lesson files to Gil, who loads them. Gil knows all pilot teachers personally, so no approval process inside Evolora is needed.
**Affects:** REQ-2.1, 2.3, 4.1 to 4.10, 4.21, 4.24, 4.25; roadmap; system design 2.2

### D-34: Class codes
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Context:** Students join classes with a code, as in Google Classroom. The code must be easy to type but impossible to guess.
**Options considered:**
1. Short numeric codes (easy to guess).
2. Codes like Google Classroom's (6 to 8 letters and digits), made at random.
3. As option 2, plus a check character and a short pause after many wrong tries.

**Decision:** Option 3: 7 characters, letters and digits without look-alike characters, random, with a check character at the end; case doesn't matter; after 10 wrong codes in a row, a 5-minute wait. Joining needs no approval; the teacher can reset the code and turn joining off; only the teacher can remove a student.
**Reason:** About 700 million possible codes, so guessing is practically impossible; the check character catches typing mistakes; the pause stops automated guessing without bothering real students.
**Affects:** REQ-5.2, REQ-5.4, REQ-10.7
**Update (2026-11-22, Gil):** the system admin is alerted when one person enters more than 10 wrong codes, or when a week's wrong codes are more than twice the average of past weeks (REQ-10.7).

### D-35: Course orders and opening lessons for individual students
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Context:** Courses pair teaching lessons with practice lessons. Teachers need control over how fast students move, and individual progress is a key principle (REQ-1.2).
**Options considered:**
1. Fixed order or student's choice only (the earlier REQ-5.8).
2. Three course orders: one after another; paired (teaching lessons in order, practice lessons of finished teaching lessons in any order); any order (not recommended). In all of them the teacher can open any lesson early, for the whole class or chosen students.

**Decision:** Option 2.
**Reason:** "Paired" lets students choose when to practise without skipping new material; opening lessons for individual students lets strong students go ahead.
**Affects:** REQ-5.8, REQ-5.20, REQ-6.12

### D-36: Two key principles: individual progress and mastery of level 1
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Context:** Gil stated the two main goals that guide the whole system.
**Decision:** (1) Each student progresses at their own pace: slower students get more practice, faster students go further and deeper. (2) Every student masters everything marked level 1: they answer it correctly, or they are flagged to the teacher, who makes sure they understand and then clears the flag.
**Reason:** These are the reasons Evolora exists; every feature is checked against them.
**Affects:** REQ-1.2, REQ-1.3, REQ-5.19, OPEN Q-27

### D-37: Courses as course files in stage 1
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Context:** In stage 1 lessons are written as lesson files (D-33). Courses need a way in as well.
**Options considered:**
1. Teachers build courses inside Evolora in stage 1.
2. Gil and Claude (or teachers with Claude Code, sent to Gil) write course files, loaded like lessons.

**Decision:** Option 2. Each teaching lesson can have zero or more practice lessons, named and paired by the course's creator.
**Reason:** Keeps stage 1 focused on the teacher's and student's screens (D-33).
**Affects:** REQ-4.10, lessons/README.md, the teacher kit

### D-38: Claude proposes the design language
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Context:** Evolora needs a consistent look. Gil prefers not to design it.
**Options considered:**
1. Gil designs the look.
2. Use a ready-made look as is.
3. Claude proposes a design language with clickable mockups; Gil approves or asks for changes.

**Decision:** Option 3.
**Reason:** Gil can judge the result by using the mockups, without designing.
**Affects:** REQ-12.7

### D-39: "Teaching lesson", and a third lesson type: exam
**Date:** 2026-11-22 · **Status:** Decided (exam details open, OPEN Q-30) · **Decided by:** Gil
**Context:** Students should always see what kind of lesson they are in. Teachers also need exams, where every student is tested the same way.
**Options considered:**
1. Two lesson types (teaching, practice), with exams run outside Evolora.
2. Three lesson types: teaching (הקניה), practice (תרגול) and exam (מבחן). An exam is like a practice lesson, but with one attempt per question, no extra questions and the same questions for every student.

**Decision:** Option 2. Every lesson is marked with its type. "Learning lesson" is renamed "teaching lesson" everywhere.
**Reason:** Exams give teachers a fair, equal measure of each student, next to the individual paths of teaching and practice.
**Affects:** REQ-4.20, REQ-4.26, glossary, lesson file format, teacher kit

### D-40: Learning without grade stress: the teacher decides whether students see grades
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Context:** Gil wants students to learn without the stress of grades, while teachers still need grades to understand each student's level and see who needs support.
**Options considered:**
1. Students always see their grades.
2. Students never see grades.
3. The teacher chooses per assignment whether students see grades, with defaults by lesson type: teaching lessons hidden, practice lessons and exams shown.

**Decision:** Option 3. Correct-or-wrong feedback, hints and solutions are always shown; only marks and grades are hidden.
**Reason:** Students can make mistakes while learning something new without worrying, and still get clear grades where they matter.
**Affects:** REQ-5.22, REQ-6.3, REQ-5.9

### D-41: Exam time windows and locking
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Context:** Exams should be taken by the whole class at the same time, without access to other material.
**Options considered:**
1. A countdown timer per student.
2. A time window set by the teacher, during which only the exam can be opened: in the class, or in all of Evolora.

**Decision:** Option 2. Locking the Chromebook itself to Evolora needs a separate device tool; Google Classroom's locked mode works only with Google Forms quizzes.
**Update (2026-11-22, Gil, Q-31):** answers are submitted automatically when the window ends; an exam timer with a notice before the end, which the teacher can turn on or off; during exams the school's Google Admin allows only Evolora's address on the Chromebooks, and Evolora locks itself to show only the exam.
**Reason:** Matches how exams are held in class, and works together with the school's device tools.
**Affects:** REQ-4.26, REQ-5.23

### D-42: Help tips written in the lessons, before AI
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Context:** The "I didn't understand" help line needs AI, which comes in stage 2. The demo will use 2 to 3 lessons.
**Options considered:**
1. No help line until AI is ready.
2. The help line sends the student's question to the teacher as a message.
3. Help tips written in advance in each lesson, shown from the help line.

**Decision:** Option 3.
**Reason:** Students get immediate help in the demo, at no cost and with no AI safety questions.
**Affects:** REQ-6.15, REQ-6.9, lesson file format, teacher kit

### D-43: Check-again questions get 2 attempts
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Decision:** A check-again question has 2 attempts, like the original question. After two wrong answers, its answer is shown and the teacher gets a red flag. It doesn't change the grade (Q-31).
**Affects:** REQ-4.17

### D-44: Teacher screens
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Context:** The teacher's screens decide whether teachers can act on the two key principles: individual progress and mastery (D-36).
**Decision:** A home page with class cards and a "To do" list; a class dashboard as one table with status colours (red flag, orange behind, soft yellow past due, green, and a star for students ahead), levels with − and + and suggested changes; a student page with progress, flags, tips opened, level, messages and private teacher notes; a success rate for every question; an optional daily email; grades downloadable as CSV for Smart School. A live view during class comes later.
**Reason:** Everything a teacher needs to act on is visible from the home page in one or two clicks.
**Affects:** REQ-5.10, 5.11, 5.18, 5.27 to 5.31

### D-45: Laptops as well as Chromebooks
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Options considered:**
1. Chromebooks only.
2. Chromebooks and Windows and Mac laptops, in the browser (Chrome, Edge, Safari).
3. Chromebooks and Windows and Mac laptops, in Google Chrome only; other browsers blocked for now.
4. Also phones.

**Decision:** Option 3 (Gil, 2026-11-22). Phones much later, if at all.
**Reason:** One browser to build and test for, the same as on the Chromebooks. Other browsers show a "please open in Chrome" message.
**Affects:** REQ-11.1 (the "Chrome only" part replaced by D-84)

### D-46: Grading page, one answer at a time
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Context:** The earlier plan showed all answers to a question on one page (REQ-5.12). Gil wants to grade one answer at a time, mark up the answer, and move both between students and between questions.
**Decision:** A grading page per answer: question and grading instructions on top, the student's answer, the AI suggestion (stage 2) and the teacher's grade and comment. Highlights and "track changes" edits in the teacher's colour, which the student sees. Sideways between students (following the reading direction), up and down between questions, Alt + arrows as shortcuts. Full, half and zero buttons or any number. A counter, "next not graded", and "send back for corrections" on the same page.
**Reason:** Lets the teacher give precise feedback on each answer, and grade either by question (fair comparison across students) or by student (seeing their whole work).
**Affects:** REQ-5.12, REQ-5.13, REQ-5.14

### D-47: Admin tasks through Claude in stage 1
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Context:** With 5 pilot teachers, admin tasks are few: adding teachers, loading lessons and courses, resetting the test site.
**Options considered:**
1. Build admin screens in stage 1.
2. No admin screens in stage 1: Gil asks Claude, who does the task with a command. Admin screens in stage 2.

**Decision:** Option 2. Alerts meant for the admin (REQ-10.7) go by email.
**Reason:** Saves building screens that would rarely be used, so stage 1 can focus on teachers and students.
**Affects:** REQ-2.2, REQ-10.7

### D-48: Priorities set (stage 1)
**Date:** 2026-11-22 · **Status:** Decided · **Decided by:** Gil
**Decision:** Gil set every feature to priority 1, 2 or 3 on the priorities page. The result is in the roadmap and on every requirement. Notable choices: exams, audio answers, messages and lesson versions moved to priority 3; opening lessons early for chosen students moved to priority 1; levels, random answer order and hiding grades are priority 2.
**Affects:** roadmap; all requirements

### D-49: Teachers can try a lesson
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Gil
**Context:** In stage 1 teachers don't write lessons inside Evolora (D-33), so the creator's preview (REQ-4.6) doesn't help them. Teachers need to see a lesson as students will, before giving it and after.
**Options considered:**
1. Teachers check lessons on the test site as a test student.
2. A "Try the lesson" button in the teacher screens, going exactly like a student.
3. The same, plus Skip and Show answer buttons that only the teacher sees.

**Decision:** Option 3, priority 2 (should have). Nothing the teacher does while trying is recorded as a student's.
**Reason:** Teachers can check a lesson quickly from where they work, without separate test accounts, and without touching class data.
**Affects:** REQ-5.32

### D-50: Stage 2: teachers see AI conversations, AI summaries, and comments to creators
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Gil
**Decision:** Three new stage 2 requirements: a teacher can open a student's answered lesson with the AI help line conversations (REQ-7.6); after a lesson, the AI summarizes the student's difficulties on the student card (REQ-7.7); teachers can attach comments to places in a lesson and send them to its creator, who gets an email and a suggestions inbox (REQ-4.27).
**Reason:** Teachers understand what each student needs without reading everything, and lessons improve from the teachers who use them.
**Notes:** Students are told the teacher can read their AI conversations (privacy of minors, section 10). Like every AI item, REQ-7.7 gets a cost estimate first.
**Affects:** REQ-4.27, REQ-7.6, REQ-7.7, REQ-5.28

### D-51: Explanation after a right answer
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Gil
**Context:** Until now a student who answered correctly saw only "right". A student who guessed, or who isn't sure, doesn't learn why.
**Options considered:**
1. Show the full solution after a right answer too (nothing new to write, but often long).
2. A new short "Why it's right" explanation written by the creator, with the full solution shown when it's missing.

**Decision:** Option 2, priority 1. Writing it is good practice, not required: the lesson check warns when it's missing. Later, AI can suggest explanations.
**Reason:** It makes students more confident, and a short explanation is read, where a long solution may not be.
**Affects:** REQ-4.28, REQ-7.2, lesson file format, lesson check, teacher kit

### D-52: How test users and Claude's programs sign in (test site)
**Date:** 2026-11-23 · **Status:** Decided (approved by Gil, 2026-11-23) · **Decided by:** Claude, while building part 1; approved by Gil
**Context:** The "Switch user" menu (REQ-12.5) needs made-up test users who can be signed in with one click, and Claude's programs (loading lessons, adding teachers, resetting the test site; D-33, D-47) need a way to write to the database that no teacher or student has.
**Options considered:**
1. Test users with a shared, known password, kept in the project; the menu signs in with it. Claude's programs sign in with their own "loading program" account, whose password is kept only on Gil's computer (in the user folder, never on GitHub). The database rules let only that account change lessons, courses, classes and roles.
2. A small server program (in the checking service) that signs people in as test users, and a Google "service account" key for Claude's programs. Safer in theory, but needs the pay-as-you-go plan first and a secret key file to look after.

**Decision:** Option 1, for the test site.
**Reason:** Works on the free plan, nothing secret goes to GitHub except the test users' password, and the test users only ever see made-up data. Anyone who finds that password can only sign in as a made-up test user on the test site. The real site has no test users and no "Switch user" menu: the real site is built without them (checked automatically: the built real-site files contain no test-user names or password).
**Also:** On the test site only, opening the site once with `?any-browser` at the end of the address lets a non-Chrome browser through (REQ-11.1). This is for Claude's automatic screen tests, whose test browser is not branded "Google Chrome". The real site has no such exception.
**Affects:** REQ-12.5, REQ-12.6, REQ-11.1, system-design 4.2, 7.3

### D-53: Formulas in Hebrew text go on a line of their own
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Gil
**Context:** A formula inside a Hebrew sentence (for example "…כי הרדיוס הוא חצי הקוטר: R = D ÷ 2 = 14 ÷ 2 = 7 ס"מ") was shown mixed into the sentence, and when the line wrapped, the parts came out in the wrong order. Gil: mixing Hebrew and math on one line is not good; a formula should move to the next line.
**Options considered:**
1. Rewrite the lesson texts (about 200 lines in the circles lessons) so every formula is on its own line.
2. The lesson player does it automatically: any formula (with = or ≈) found inside Hebrew or Arabic text is shown on its own line, left-to-right.
3. Both.

**Decision:** Option 2. The lesson-writing rules also tell Claude to write formulas on their own line in new lessons. Tables and answer choices are left as they are. The unit is not part of the formula line (Gil): "P = π × D = 3.14 × 6 = 18.84 ס"מ" is shown as the formula ending in 18.84, and under it "כלומר 18.84 ס"מ."
**Reason:** Works at once for every lesson, including teachers' future lessons, without rewriting approved text.
**Affects:** REQ-4.3, lesson player, lessons/README.md, teacher kit

### D-54: Quotations in a classic Hebrew font
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Gil
**Context:** The verse from the Book of Kings in the circles lesson looked like ordinary text. Gil wants quotations from the Bible in a more biblical-looking font, something like David.
**Options considered:**
1. A new "Quote" block: the quoted words, shown in David Libre (a free web version of the David font), with the source under it in the regular font.
2. Mark quotes inside ordinary text with a special sign.

**Decision:** Option 1.
**Reason:** A separate block is easy to write and to check, it shows clearly where the quote starts and ends, and it gives the source its own place. David Libre is free to use (SIL Open Font License) and loads from Google Fonts, like the lesson's regular font.
**Affects:** REQ-4.2, lesson player, lessons/README.md, the lesson check, teacher kit

### D-55: Lessons in a course open one after another, practice lessons included
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Gil
**Context:** Until course orders come (REQ-5.8, priority 2), the course page (REQ-6.12) needs one rule for which lessons are open.
**Options considered:**
1. Every lesson in the course list opens when the one before it is finished (teaching 1, its practice lessons, then teaching 2).
2. Practice lessons open alongside their teaching lesson.

**Decision:** Option 1. A lesson counts as finished when every question the student received has been answered (open answers count once sent). Lessons opened early for a student (REQ-5.20, part 4) will be open whatever comes before them.
**Affects:** REQ-5.8, REQ-6.12, REQ-6.4

### D-56: Question weights later
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Gil
**Context:** REQ-4.4 said a lesson file could make a question count more (for example double) in the lesson grade, but the lesson file format has no way to write it.
**Options considered:**
1. Add a weight mark to the lesson format (it would change the lesson check, the lesson-writing rules and the teachers' guide).
2. Leave it for much later: every question counts equally.

**Decision:** Option 2 (Gil, 2026-11-23): leave it for much, much later.
**Reason:** Not needed for the pilot; keeps the lesson format simple for teachers.
**Affects:** REQ-4.4, system-design 5.3

### D-57: Points the requirements leave open in part 3 (classes, codes and assignments)
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Claude, while building part 3; approved by Gil 2026-11-23
**Context:** Building part 3 (REQ-5.1, 5.2, 5.4, 5.7, 6.1, 6.11, 6.12) raised small questions the requirements don't answer. Each was given the simplest answer, which is easy to change.
**Decision:**
1. **A selection of single lessons** (REQ-5.7) shows each lesson on its own under "Waiting lessons", all of them open at once. Course orders for selections come with REQ-5.8.
2. **A removed student can join again** with the class code, while joining is on (REQ-5.2, 5.4). To keep them out, the teacher turns joining off or makes a new code. Their earlier work is still there when they come back.
3. **The "To do" list** has no due dates yet (REQ-5.9 is priority 2), so it lists the lessons in the order they were given, oldest first, one line per lesson the student can open now. Pending notes come with comments in part 4.
4. **"Finished this semester"** shows every finished course and single lesson, because there are no semesters or archived courses yet (REQ-5.21 is priority 3).
5. **A new class gets a colour** from a fixed set of 8 colours, in turn, so a student's classes look different. The teacher doesn't choose it.
6. **A locked lesson** can't be opened from the course page, and if its address is typed, the student sees "This lesson is still locked".
**Reason:** These keep part 3 small and match how the rest of the pilot works; none of them can lose a student's work.
**Affects:** REQ-5.2, REQ-5.4, REQ-5.7, REQ-6.1, REQ-6.11, REQ-6.12

### D-58: Points the requirements leave open in part 4 (following and grading)
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Claude, while building part 4; approved by Gil 2026-11-23
**Context:** Building part 4 (REQ-5.27, 5.10, 5.24, 5.19, 5.20, 5.12, 5.13, 5.11) raised small questions. Some parts of these requirements depend on priority 2 and 3 features that aren't built yet.
**Decision:**
1. **Grading an open answer:** the teacher gives a share of the question's marks, from 0 to 100% (quick buttons: full 100%, half 50%, zero 0%). Every question counts the same in the lesson grade (D-56).
2. **Average grade** on the dashboard and grade table: over all lessons given to the student; a lesson not finished counts as 0, even if it isn't open yet; a lesson with answers waiting for the teacher is left out until graded.
3. **The middle of the class** in a course is the median number of finished lessons. "Behind" (orange) is more than 1 lesson below it; the star is more than 1 lesson above it.
4. **Left for their own requirements:** the yellow "late" status (needs due dates, REQ-5.9), unread messages (REQ-5.16), level suggestions (REQ-5.18), marking up answers and audio comments (priority 3), and "send back for corrections" (REQ-5.14). The teacher can already change a level with − and +.
5. **The student page** is simple for now (status, level, average, help tips opened, red flags to clear, cleared flags with date and note, grades per lesson). The full student page is REQ-5.28.
6. **Teacher comments** appear to the student under their answer in the lesson as soon as the teacher saves the grade. "Returning" work comes with REQ-5.14.
7. **Opening early** works on lessons in courses given to the class, for the whole class or chosen students, and can't be undone yet.
**Reason:** Keeps part 4 within the pilot's must-haves; each point is easy to change after Gil tries it.
**Affects:** REQ-5.10, REQ-5.11, REQ-5.12, REQ-5.13, REQ-5.19, REQ-5.20, REQ-5.27

### D-59: How hiding grades, changing grades and sending back work
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Gil
**Context:** Building REQ-5.22, 5.15 and 5.14 (priority 2) needed four choices.
**Options considered and decisions:**
1. **Hiding grades when giving a course** (REQ-5.22): one setting with three choices: **As usual** (teaching lessons hidden; practice lessons and exams shown; the default), **Show all grades**, **Hide all grades**. Other option: one yes/no for the whole assignment.
2. **Where students see grades** when shown: the lesson grade at the end of the lesson, next to the lesson on the course and class pages, and the marks on each question (full, half, 0). Other option: only at the end of the lesson.
3. **Teacher changes grades** (REQ-5.15): the teacher can change the score of any single question, including automatically checked ones, and the lesson grade is recalculated; the student sees "changed by the teacher". Other option: typing a new grade for the whole lesson.
4. **Sending back for review** (REQ-5.14): the lesson shows the teacher's comments at the top with an **"I've read the comments"** button; pressing it unlocks new lessons. Other option: opening the lesson is enough.

**Also (Claude, following the requirements):** "new lessons are locked" means lessons the student hasn't started yet; lessons already started stay open. Questions sent back for corrections are answered again with 2 attempts, as new; the earlier answer is kept for the teacher. A level 1 question is "not yet mastered" (REQ-5.25) when it ended wrong and its check-again question wasn't answered correctly; it leaves the list when its red flag is cleared. When grades are hidden, the website doesn't show them; the student's own saved work still holds them, which a very determined student could look up (acceptable for the pilot).
**Affects:** REQ-5.22, REQ-5.15, REQ-5.14, REQ-5.25, REQ-5.28, REQ-6.13

### D-60: Points the requirements leave open in course orders and due dates
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Claude, while building REQ-5.8 and 5.9; approved by Gil 2026-11-23
**Context:** Building course orders (REQ-5.8) and due dates (REQ-5.9) while Gil was away raised small questions.
**Decision:**
1. **New assignments start with "Paired"**, the recommended order. Courses given before course orders existed keep "one after another" (D-55); selections given before keep "any order" (D-57), so nothing changes for students already working.
2. **A selection of single lessons** uses the same three orders, in the order the teacher picked them, with each practice lesson grouped under the teaching lesson before it.
3. **"Reduce by 10" means 10 points off** the lesson grade (80 becomes 70), never below 0. Other option: 10% of the grade (80 becomes 72).
4. **The due date that counts** for a lesson is from the latest assignment that gives it to the student with a due date. An extension for one student replaces the class's date for them; changing the class's date doesn't change extensions. Clearing the date removes it.
5. **Locking after the due date** is done by the website: the lesson can't be opened from the student's pages or by its address. A lesson the student already finished can still be opened to read.
6. **The yellow "late" status** on the dashboard shows when a lesson given to the student is past its due date and not finished.
7. **From REQ-5.9, built later the same day:** the minimum questions per topic per assignment (a box when giving lessons; empty means the lesson's default; the latest assignment that sets one counts), "redo counts" (D-63) and exam time windows (D-65). Who checks open answers is always the teacher.
**Reason:** Keeps students' current work unchanged and follows the requirements' own recommendation; each point is easy to change.
**Affects:** REQ-5.8, REQ-5.9, REQ-5.10, REQ-6.1, D-55, D-57

### D-61: Points the requirements leave open in levels, random order and trying lessons
**Date:** 2026-11-23 · **Status:** Points 1, 2, 4, 5 and 6 approved by Gil (2026-11-25); point 3 to be decided later (Gil: TBD); the 10% rule stays as built until then · **Decided by:** Claude, while building REQ-4.18, 5.18, 6.10, 4.19, 4.15 and 5.32
**Decision:**
1. **A question without a level counts as level 1**; a student without a level set is at level 2 (REQ-5.18). A student in two classes that both have the lesson gets their higher level.
2. **Lowering a student's level** doesn't take away questions they already answered; it applies from the next question (REQ-5.18).
3. **Level suggestions** follow REQ-5.18: only students with at least 5 lessons finished and graded in the class in the last 4 weeks; the weakest 10% (at least one) are suggested level 1 and the strongest 10% level 3. "Well above or below what fits the level" isn't defined well enough yet, so it isn't built.
4. **Random order** is worked out from the student's account and the question, so it is the same every time for that student and different between students; check-again questions too.
5. **Teachers always try:** whenever a teacher (or system admin) opens a lesson, from anywhere, it is in "Trying the lesson" mode: answers are checked but never saved. "Start again" clears it. Trying always uses the lesson's current version.
6. **Image sources:** the "Source" note under each image opens to show the details on click. The loading check already refuses an image without a valid source (REQ-4.15).
**Reason:** Follows the requirements closely and keeps teachers' tries out of all student data.
**Affects:** REQ-4.18, REQ-5.18, REQ-6.10, REQ-4.19, REQ-4.15, REQ-5.32

### D-62: Starting priority 3 without Gil, and points left open
**Date:** 2026-11-23 · **Status:** Decided: approved by Gil, item by item (2026-11-25) · **Decided by:** Claude, while Gil was away
**Context:** Gil asked Claude to continue without needing answers. Priority 3 has about 15 items; Claude started with the five smallest that help the pilot most and need no new outside services (email, audio recording) or big new screens (exams).
**Decision:**
1. **Built first:** REQ-5.29 success rate per question, REQ-4.9 lesson library search and filters, REQ-5.21 archiving courses, REQ-9.6 teacher changes a student's language, REQ-5.5 co-teachers. Left for Gil to choose the order: exams (4.26, 5.23), email invites (5.3), messages (5.16, 10.2), marking up answers and audio comments (5.12, 5.13), daily email (5.31), redo (6.5), audio answers (6.6), class-code guessing alerts (10.7), lesson versions screens (4.7).
2. **Success rate** counts only the students who answered the question; open answers show the average of graded ones.
3. **Archiving** is per course in a class; archived courses leave the dashboard's progress map and "behind" status, but stay in the grade table and CSV. Their lessons can still be opened, with the same open, done and locked rules as before.
4. **Co-teachers** are added by email; the other teacher must already be on the staff list and have signed in once. Any teacher of the class can remove another ("Remove from the class", with a confirmation); a class always keeps at least one teacher.
5. **Changing a student's language** applies the next time the student opens Evolora; the teacher doesn't see the student's current language.
**Affects:** REQ-5.29, REQ-4.9, REQ-5.21, REQ-9.6, REQ-5.5, roadmap

### D-63: How redoing a lesson works
**Date:** 2026-11-23 · **Status:** Decided: approved by Gil (2026-11-25) · **Decided by:** Claude, while building REQ-6.5
**Decision:**
1. A student can redo a **finished** lesson as many times as they like, from a **"Redo the lesson"** button at the end of the lesson (with a confirmation). Not while it waits for them after being sent back (REQ-5.14).
2. **"Redo counts"** is a checkbox when giving lessons (REQ-5.9), off by default. A redo counts if any assignment that gives the lesson to the student has it on.
3. While a redo is going on, the earlier grade shows everywhere. When it's finished: with "redo counts", the redo's grade replaces it, even if lower; without it, the earlier grade stays and the redo is practice only.
4. Earlier answers are kept for the teacher (not shown on screens yet). The lesson results page shows the student's latest answers.
**Affects:** REQ-6.5, REQ-5.9

### D-64: How teachers mark up written answers
**Date:** 2026-11-23, changed 2026-11-25 · **Status:** Decided: points 3 and 4 approved by Gil; points 1 and 2 changed at Gil's request, and point 2 confirmed by Gil: "like Word" (2026-11-25) · **Decided by:** Claude, while building the marking-up part of REQ-5.12; Gil changed how it works
**Decision:**
1. **Changed by Gil: the teacher marks up the answer itself, with track changes, as in Word.** The first version had a "Mark up the answer" button that opened a separate copy to edit, with a preview below; Gil found it hard to find and slow, and wants to mark on the text itself, quickly.
   - On the grading page, the student's written answer **is** the place to mark: the teacher clicks into it and types, with no button to open first.
   - Text the teacher deletes stays visible, **crossed out**. Text the teacher types appears in the teacher's colour (purple), **underlined**, as it is typed.
   - When the teacher selects words, a small **Highlight** button appears next to them; it marks them yellow, with an underline. Pressing it on highlighted words removes the highlight.
   - Ctrl+Z undoes the last change, and **Undo all changes** returns the student's original answer.
   - The mark-up is saved together with the grade and comment, when the teacher moves on (as now).
2. **Changed with point 1:** changes are kept exactly where the teacher made them, letter by letter, as in Word. Fixing only a comma marks only the comma, not the whole word.
3. The student sees the marked-up answer under their answer, together with the grade and comment, as soon as the teacher saves. "Returning" work comes with REQ-5.14 (sending back).
4. Every mark is shown by more than colour (crossed out, underlined, or a background), for students who don't see colours well (REQ-12.3).
**Affects:** REQ-5.12

### D-65: How exams work in stage 1
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Claude, while building REQ-4.26 and 5.23; approved by Gil 2026-11-23
**Decision:**
1. **One page:** an exam shows all its questions on one page. Answers are saved as the student goes and can be changed until "Submit exam" (with a confirmation). Teachers who open an exam try it like any lesson (REQ-5.32).
2. **Results kept apart:** right and wrong answers and grades are saved where students can't read them until the teacher presses **Release the results** on the exam's results page. Then each student sees their grade, which answers were right, the correct answers and the solutions. This stops anyone from passing on answers while others are still taking the exam.
3. **Opening:** an exam opens only inside its time window, or when the teacher opens it (Class settings → Open a lesson early), whatever the course order. Without a window and without opening, it stays locked.
4. **End of the window:** the student's page submits the exam by itself when the time is up; if the page was closed, the exam is submitted the next time the teacher opens the class's dashboard or the exam's results. Questions not answered count as wrong.
5. **Lock:** "lock this class" or "lock all of Evolora" is done by the website (other lessons show as locked, and messages are hidden for "all of Evolora"). Locking the Chromebook to Evolora's address is done by the school's IT person (REQ-5.23).
6. **Red flags:** a wrong answer to a level 1 question raises a red flag when the exam is submitted (REQ-1.3).
7. **Retake:** "Allow a retake" on the results page lets a student take the exam again; the earlier attempt is kept for the teacher.
8. **A demo exam** (`lessons/circles-exam`, 5 questions, marked [NEW] for Gil's review) is loaded on the test site. It isn't part of the circles course; the teacher gives it with "Give lessons".
**Affects:** REQ-4.26, REQ-5.23, REQ-1.3, REQ-5.20

### D-66: Co-teachers are a must-have
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Gil
**Context:** REQ-5.5 (co-teachers) was priority 3. It was already built (D-62) and is on the test site.
**Decision:** REQ-5.5 is now priority 1 (must have for the pilot).
**Reason:** Gil made it the top priority.
**Affects:** REQ-5.5, roadmap

### D-67: Recorded audio answers and audio comments
**Date:** 2026-11-23 · **Status:** Decided · **Decided by:** Gil
**Context:** REQ-6.6 (students record answers) and REQ-5.13 (teachers' audio comments) record voices, including children's.
**Decision:**
1. **Length:** up to **30 seconds**, for students and for teachers (Gil). Other option: 3 minutes for answers, 2 for comments.
2. **Who can listen:** only the student and the teachers of their class.
3. **How long they're kept:** deleted automatically at the end of each school year (31 July), as in REQ-10.5.
4. **Consent:** no parents' consent step for now (Gil).
5. **To try it:** a demo audio question ([NEW], for Gil's review) at the end of the circles teaching lesson.
**Also (Claude):** a student records, listens back, re-records and then sends; once sent, it can't be changed, like a written answer. The teacher grades it on the grading page, with a player, and can record a comment there. Recordings are saved in file storage in Israel (me-west1), next to the lesson images. A student's recording is in a folder only they can open; when they send it, the checking service attaches a private link (a long random key) to the answer, which only the student and the class's teachers can read. Teachers' comments are saved by the checking service the same way. (This avoids giving file storage permission to read the database, a security setting in Gil's Google Cloud project.) Every day, recordings made before the last 31 July are deleted.
**Affects:** REQ-6.6, REQ-5.13, REQ-10.5, the circles teaching lesson

### D-68: Sending back "now" or "at their own time", and saving on the grading page
**Date:** 2026-11-24 · **Status:** Decided · **Decided by:** Gil
**Decision:**
1. When sending a lesson or questions back (REQ-5.14), the teacher marks either **(a) the student must go over it before going on** in the course, or **(b) at their own time**. In either case, a lesson the student is in the middle of isn't stopped. (Claude: with (a), the course's lessons the student hasn't started yet are locked until they go over it; for a single lesson outside a course, the class's other single lessons. This replaces the rule in D-59 that locked every new lesson.)
2. On the grading page (REQ-5.12), moving to the next or previous student or question saves the teacher's changes, like pressing "Save the grade". (Claude: a comment, mark-up or recorded comment without a grade is saved too, and the answer still waits for a grade; a grade that isn't a number from 0 to 100 stops the move with a message.)
**Affects:** REQ-5.14, REQ-5.12, D-59

### D-69: Schools
**Date:** 2026-11-24 · **Status:** Decided · **Decided by:** Gil
**Decision:** A school is an entity that holds teachers. Only teachers of the same school can be added to a class as co-teachers. The system admin, who makes accounts teachers, also puts them in a school. For now Claude does both with tools/admin.mjs, with no screen.
**Also (Claude):** a teacher without a school can't add co-teachers; each class records its creator's school, for later use. The test site has "Test School" with both test teachers.
**Affects:** new REQ-2.5, REQ-5.5, REQ-2.2, tools/admin.mjs

### D-70: Drag-and-drop questions
**Date:** 2026-11-24, changed 2026-11-25 · **Status:** Decided: approved by Gil, with points 2 and 3 changed (2026-11-25) · **Decided by:** Claude, as suggested to Gil (questions 10 to 14), built while Gil was away; Gil changed the checking
**Decision:**
1. **How it works:** the student places word cards on numbered spots on an image. Each spot has one right card; there may be extra cards that fit nowhere. Cards can be dragged, or clicked and then a spot clicked (works with the keyboard too).
2. **Checking (changed by Gil):** the answer is right only when every spot has its right card.
   - **Attempts:** the number of cards (extra cards included) minus 2, and never fewer than 2. For example, 4 spots and 1 extra card give 3 attempts.
   - **Marking:** after each attempt, every placed card gets a green outline if it is right and a red outline if it is wrong. Right cards stay locked on their spots; wrong cards go back to the pile, and the student places only those again.
   - **Hint:** after the first wrong attempt, as in other questions.
   - **Grades:** full marks on the first attempt, half on the second, a quarter on any later attempt that succeeds, and 0 if all attempts fail.
   - **When all attempts fail:** the full solution shows the right card on every spot, and the teacher gets a **red flag** for that student and question.
   - The first version had 2 attempts and no marking of each card; Gil asked for more attempts and clear marking so the student can learn from each try.
3. **No check-again question** for drag-and-drop (Gil: not needed; the red flag takes its place). Drag-and-drop is not in exams yet.
4. **Lesson files:** "## [QUESTION: drag and drop]" with "- file:", "- caption:", "- source:", one "- Spot: 30% 45% | card text" per spot (across, then down, in percent from the top left of the image), optional "- Extra card:" lines, then "- Hint:", "- Solution:" and "- Why it's right:". The lesson format, the lesson check, the lesson reader and the teacher kit are updated (rule 6).
5. **To try it:** a demo question ([NEW]) at the end of the circles teaching lesson: label a circle's center, radius, diameter and circumference, with "chord" as an extra card. The picture is new, drawn by Claude.
**Affects:** REQ-4.12, lessons/README.md, tools/check-lesson.mjs, tools/lib/lesson-parser.mjs, the teacher kit, the circles teaching lesson

### D-71: A students-only test address
**Date:** 2026-11-24 · **Status:** Decided · **Decided by:** Gil (asked for it), details by Claude
**Context:** Gil wants a student to test and look for bugs on the test site, without being able to act as a teacher. On the test site, the "Switch user" list lets anyone become any test user, teachers included, and all test users had the same password.
**Options considered:**
1. A second address that lists only the test students, with teachers given their own password that this address doesn't contain.
2. Hide the teachers from the list only. Easy, but someone who knows a little about websites could still find the shared password and sign in as a teacher.
3. Have the student sign in with their own Google account. That would put a real child's account into the test project.
**Decision:** Option 1.
1. **Two addresses** on the same test project and the same test data:
   - https://evolora-test.web.app, the full test site, as before: every test user, Google sign-in.
   - https://evolora-test-students.web.app, the students-only test address: only the 7 test students, and no Google sign-in. It opens in Hebrew whatever the browser's language (Gil, the same day); the language menu still works.
2. **Teachers' password:** test teachers now have their own password. It is kept only on Gil's computer, outside the project, and built into the full test address only. It is never on GitHub or on the students-only address. Test students keep the shared password.
3. **What the student still can't do:** teacher actions are refused by the server anyway, so a test student can't do anything a real student couldn't.
**Limit:** the full address is not hidden. A student who opens https://evolora-test.web.app could switch to a teacher there. Share only the students-only address with the student.
**Affects:** REQ-12.5, new REQ-12.8, docs/system-design.md 7.3, tools/README.md, the test tools

**Closed (2026-11-26, Gil):** Gil closed the students-only address; it shows "Site not found". Deploys must leave it closed; it can be opened again by deploying it.

### D-72: Lessons added to a course reach the classes that have it
**Date:** 2026-11-25 · **Status:** Decided · **Decided by:** Gil
**Context:** Two practice lessons were added to the density course after it had been given to the test class. The students saw them in the course list but couldn't open them, because a course is given to a class with the lessons it had at that moment.
**Options considered:**
1. Automatically: every class that has the course gets the new lesson, with the same students as the rest of the course.
2. The teacher decides: the teacher gives the new lesson to the class by hand.
**Decision:** Option 1. A lesson taken out of a course stays open to classes that already had it, so no student loses their work (Claude's suggestion, for Gil to confirm).
**Reason:** Teachers expect a course to be one thing: when it grows, their classes get the new part.
**Affects:** REQ-4.10, tools/load.mjs

### D-73: Time on lesson, time away, and the sent-back count
**Date:** 2026-11-25 · **Status:** Decided · **Decided by:** Gil
**Context:** Teachers want to notice students who aren't concentrating, or who keep needing corrections.
**Decision:**
- REQ-5.33 (stage 2): total and net time per lesson. The student is away when the Evolora tab isn't in front, or after 2 minutes without mouse, keyboard or touch (a playing video counts as use). Every time away is counted. Above a number the teacher sets (default 5), the teacher sees a sign and gets a red flag. Students are told in the terms of use.
- REQ-5.34 (priority 2): count of answers sent back for corrections, per lesson and per course, with a warning above a number the teacher sets (default 10 in a course).

**Options considered:** count every switch away, or only those over 10 seconds (Gil: every switch); a warning sign only, or also a red flag (Gil: also a red flag); the sent-back count in total only, or per lesson and per course (per lesson and per course).
**Reason:** A student who keeps wandering off is not well concentrated, and many corrections show a problem; the teacher should see both.
**Affects:** REQ-5.33, REQ-5.34, REQ-5.10, REQ-5.28

### D-74: Terms of use
**Date:** 2026-11-25 · **Status:** Decided · **Decided by:** Gil
**Context:** The pilot records minors' answers, grades and audio recordings, and in stage 2 their time on lessons and AI conversations. Students must be told.
**Options considered:** who writes the text (Claude drafts and Gil approves, with a lawyer's check; or Gil or a lawyer writes it); agreeing once with "I agree", or only a link; parents' approval in the app, a letter from the school, or nothing for now; priority 1, 2 or stage 2.
**Decision:** Claude drafts the terms in Hebrew, Arabic and English, Gil approves them, and a lawyer checks them before use beyond the pilot. Everyone presses "I agree" at first sign-in and again when the terms change, and a link is on every page. For the pilot, the school sends parents a letter (Claude drafts it). Priority 1.
**Reason:** Real students shouldn't start before they know what is recorded; a letter to parents is enough for the pilot (D-13), and full compliance comes before wider use (REQ-10.6).
**Affects:** REQ-10.8, REQ-5.33, REQ-6.6, REQ-10.5

### D-75: How the terms of use and the sent-back count are built
**Date:** 2026-11-25 · **Status:** Decided by Claude, within D-73 and D-74 (Gil can change any of it)
**Context:** REQ-10.8 (terms of use) and REQ-5.34 (count of answers sent back) leave some building details open.
**Decision:**
1. **The terms are content Claude loads, like lessons.** The text is in three files: `terms/terms.he.md`, `terms/terms.ar.md` and `terms/terms.en.md`. Each starts with a `version:` line, a `title:` line and a short `summary:` list, then the full text. `node tools/load-terms.mjs` checks that the three files have the same version and puts them on the test site. Until real text is approved, the files hold a short draft, version 0.1, clearly marked as a draft.
2. **Who must agree:** everyone who signs in, students and teachers alike, including Gil's own accounts and the test users. If no terms have been loaded yet (as on the real site today), nobody is asked.
3. **When to agree again:** whenever the version number changes. Fixing a typo without changing the version doesn't ask anyone again; the loading program warns about this.
4. **Saving the agreement:** the checking service saves it (`acceptTerms`), with the version and the time. The database rules don't let anyone write it directly, so the record can't be faked.
5. **How strict, for the pilot:** the screens are blocked: until a person agrees, every page shows only the terms screen (and the "Terms of use" page). The checking service does **not** also refuse answers from someone who hasn't agreed. Someone skilled with the browser's developer tools could get round the screen. Even then, they could do nothing a student who agreed can't do, and their agreement record stays missing. Before Evolora is used beyond the pilot (REQ-10.6), the checking service should refuse work from anyone who hasn't agreed.
6. **Test users:** the test-data reset marks every test user as agreed to the loaded version, except **Test Student 7**, so Gil can try the first sign-in. After loading a new version, `node tools/load-terms.mjs --agree-test-users` does the same again. Without it, every test user is asked to agree again, as real people would be.
7. **What counts as "sent back" (REQ-5.34):** every time a teacher sends a lesson's answers back **for corrections**. Sending a finished lesson back **to read the comments** (no answers to change) isn't counted. Each sending counts once, however many questions are in it.
8. **The warning number** is set on **Class settings**, from 1 to 100, with a default of 10. The warning shows on the class dashboard under the course's progress: a ⚠ sign with the words "sent back N times". It shows as soon as a student's total in a course reaches the number.
9. **For REQ-5.33 later:** every answer attempt now saves its time, so total and net time can be worked out in stage 2.
**Affects:** REQ-10.8, REQ-5.34, REQ-5.33, docs/system-design.md 2.12 and 3.1, tools/README.md

### D-76: Building time on lessons, word explanations, the class language, and strict terms of use
**Date:** 2026-11-25 · **Status:** Decided by Claude, within the approved requirements (Gil asked for all four to be built; Gil can change any point)
**Context:** Gil asked for the features that need no new decisions: REQ-5.33 (decided in D-73), REQ-4.29, REQ-9.5 and the server check that D-75 left for later.
**Decision:**
1. **Time on lessons (REQ-5.33), built early (it was stage 2).**
   - **Measuring:** time is measured while a student has a lesson open and hasn't finished it. The browser checks every second whether the student is working, as D-73 defines it, and sends what it measured about every 20 seconds.
   - **When it starts:** total time starts when the student first opens the lesson. Lessons started before today show only the time since then.
   - **Leaving the lesson page:** going to another Evolora page and coming back, or closing the browser and opening the lesson again later, counts as one time away (a new sitting).
   - **What counts as working:** clicking into the lesson's video counts as still working. While a video or audio plays, not touching anything is not "away".
   - **Teachers:** teachers trying a lesson aren't measured.
   - **Away a lot:** the class's number is set on **Class settings** (from 1 to 100, default 5). The red flag is raised once per lesson, when the count first goes above the number. The dashboard sign follows the current number.
2. **Word explanations (REQ-4.29):**
   - **In the lesson file:** write `[[word|explanation]]` on one line. The lesson check refuses one that is badly written and warns when the explanation is long.
   - **On the screen:** the word gets a dotted underline. The explanation shows in a small window when the mouse moves over it, when it is tapped, or with the keyboard, and closes when the mouse moves away.
   - **The circles lesson:** the cubit ("אמות") is explained this way instead of in brackets. The lesson was loaded again as a new version; students who had already started it keep the old version.
3. **Class language (REQ-9.5):**
   - **The setting:** on **Class settings**, choose none, Hebrew, Arabic or English, and whether students **must** use it inside the class or **may choose**.
   - **"Must":** the class page, its course pages, and lessons given by that class are shown in the class language, and the language menu is locked there. Everywhere else, the student's own language comes back.
   - **"May choose":** students keep their own language.
   - **A lesson given by two classes:** it follows the first class that requires a language.
4. **Strict terms of use (D-75, point 5):** the checking service now refuses every request from someone who hasn't agreed to the current version, except agreeing itself. As before, nobody is asked while no terms are loaded.
**Note for the terms of use:** they say time on lessons will be measured "in a later version". It is now measured on the test site, so the wording should change when the real text is written.
**Affects:** REQ-5.33, REQ-4.29, REQ-9.5, REQ-10.8, the lesson format and the teacher kit, docs/system-design.md 2.12 and 2.13

### D-77: Correcting an open answer that was sent back
**Date:** 2026-11-25 · **Status:** Decided · **Decided by:** Gil
**Context:** When an open answer was sent back for corrections, the student got an empty box, and no longer saw the teacher's marks and comment under the question.
**Options considered:** the box starts with the student's last answer, with the marks shown above; the box holds the marked-up answer, to accept or reject each mark; an empty box with the marks shown above.
**Decision:**
1. **The student** sees "Your last answer was:" with the teacher's marks and comment, not editable, and below it an empty box for a new answer based on the corrections.
2. **The teacher** sees both answers on the grading page, one above the other: the last one with its marks, no longer editable, and the new one, which the teacher marks up and grades.
3. **Attempts:** the new answer is sent once and waits for the grade, as the first time (Gil: "Sent once, as today"). The teacher can send it back again; each time is counted (REQ-5.34).
**Reason:** the student must see the corrections while fixing the answer, and must write the fix themselves.
**Affects:** REQ-5.14, REQ-5.12, D-59

### D-78: Fill-in-the-blanks questions
**Date:** 2026-11-26 · **Status:** Decided · **Decided by:** Gil (the three kinds and all choices); the lesson-file format by Claude
**Context:** Gil asked for a new question type, with three kinds: typed blanks, a choice in each blank, and a list of words to place.
**Options considered and decisions (Gil):**
1. **Typed blanks:** forgiving (spaces, nikud and punctuation ignored), with extra right answers allowed. Not chosen: exact match only; small typos allowed.
2. **Lessons:** checked like drag-and-drop (D-70): green and red marking of each blank after every attempt; right blanks lock; attempts are blanks (or cards) minus 2, at least 2; full, half, then a quarter; failing every attempt gives the solution and a red flag. Not chosen: like multiple choice; partial credit per blank.
3. **Word list:** cards placed by dragging or clicking, each used once, extra cards allowed. Not chosen: no extras; a dropdown in each blank.
4. **Where:** every type of lesson, exams included. In exams: one attempt, credit per blank. Not chosen: all or nothing.
5. **Priority 2**, built after the work in progress.
**Lesson file format (Claude):**
- `## [QUESTION: fill in the blanks]`, then the text. A blank is 3 or more underscores, written right after the text before it (for example `ה____`).
- **Typed:** right after the blank, the right answer in square brackets: `____ [זהב]`; more right answers are separated by `|`: `____ [זהב | הזהב]`.
- **Choose in each blank:** the words in square brackets, separated by commas, with `*` before the right one: `____ [*זהב, כסף, אלומיניום]`.
- **Word list:** the blanks have no brackets, and a line after the text lists the right words in the order of the blanks: `- Words: זהב, משקל, צפיפות, נפח`. Extra cards: `- Extra words: מסה, צבע`.
- Then `- Hint:`, `- Solution:` and `- Why it's right:`, as in other questions.
- One question uses one kind; the lesson check refuses a mix.
**Reason:** one way of checking for all questions that have several parts (drag-and-drop and fill-in-the-blanks), so students and teachers learn it once.
6. **Added 2026-11-26 (Gil):** fill-in-the-blanks and drag-and-drop questions count toward a topic's minimum (REQ-4.21), like multiple choice and number questions.
**Affects:** new REQ-4.30, the lesson format, the lesson check, the lesson reader, the teacher kit, the Archimedes teaching lesson (three demo questions)

### D-79: Teachers' names on lessons only with their agreement
**Date:** 2026-11-26 · **Status:** Decided · **Decided by:** Gil
**Context:** Lesson files are public on GitHub, and each one names its creator. Gil doesn't mind being named, but other teachers might.
**Options considered:** always the teacher's name; initials; the name only with agreement, otherwise "anonymous teacher".
**Decision:** Gil asks each pilot teacher whether they agree to be named. If they agree, their full name is the creator. If not, the creator is "מורה אנונימי/ת" ("Anonymous teacher" in English lessons), and their name appears nowhere in the lesson file. The same goes for any other personal details (CLAUDE.md rule 7).
**Affects:** REQ-1.1, lessons/README.md, the teacher kit

### D-80: How the automatic screen tests run
**Date:** 2026-11-26 · **Status:** Proposed · **Decided by:** Claude
**Context:** system-design 8.1 promises screen tests: a robot goes through the main flows in Chrome, in all three languages. They need a tool, and known test data.
**Options considered:** the test data: a full reset of the test site before every run (simple, but it removes the class and messages Gil keeps on the test site as Test Teacher 2), or resetting only what the tests use. The tool: Playwright, the most common robot for Chrome, using the Chrome installed on the computer, or a separate test browser.
**Decision:** Playwright with the installed Google Chrome, in its own folder (`tests/screens`), so the website itself doesn't change. Before each run, the tests reset only what they use: Test Student 1's Archimedes work, Test Student 7 (not agreed to the terms, in no class), Test Student 5's finished work, and joining on in the test class. Afterwards they put back the test users' languages and the class settings, and Test Student 7 as before. The tests run against the published test site, so a fix is seen by the tests only after the test site is published again.
**Reason:** Gil's own data on the test site stays, and the tests check exactly what pilot teachers and students will use.
**Affects:** system-design 8.1, tools/README.md


### D-81: Lesson folders are always numbered from 1
**Date:** 2026-11-26 · **Status:** Decided · **Decided by:** Gil
**Context:** Lesson folder names are the lesson ids. Until now only a second lesson of the same type got a number, so the density course had `archimedes-density-practice` and `archimedes-density-practice-2`. Gil: "always start naming from practice-1".
**Options considered:** number only when there are two or more lessons of a type on the topic; number every practice lesson from 1; number every lesson from 1 (teaching lessons, practice lessons and exams).
**Decision:** every lesson folder ends with its type and a number, starting from 1, even when it is the only one of its type on the topic: `<topic>-teaching-1`, `<topic>-practice-1`, `<topic>-practice-2`, `<topic>-exam-1`. The lesson check refuses a folder without the number. The existing lessons were renamed: `archimedes-density-teaching-1`, `archimedes-density-practice-1`, `circles-teaching-1`, `circles-practice-1`, `circles-exam-1` (`archimedes-density-practice-2` kept its name).
**On the test site:** the renamed lessons were loaded under their new names, and the test class's two courses now point to them. The lessons under the old names were removed. The only student work in them was Test Student 5's ready-made work (and its red flags), which was filled again in the renamed lessons. No other class used these lessons, so nothing Gil keeps there (as Test Teacher 2 or with Gil's own accounts) was touched. A few test sound recordings of Test Student 5 under the old names stay in file storage, unused (the loading program can't remove them).
**Reason:** a lesson never has to be renamed when a second one of its type is added, and all lessons follow one pattern.
**Affects:** lessons/README.md, the teacher kit (lesson-rules-for-claude.md), the lesson check, the demo courses, the tests

### D-82: A picture that belongs to a question goes inside the question
**Date:** 2026-11-26 · **Status:** Decided · **Decided by:** Gil
**Context:** In the Archimedes practice lesson, the iceberg and ship pictures were image blocks written after their questions. The lesson shows what comes after a question only once it is answered, so students saw each picture only after answering. And the lesson hides questions above a student's level, but not pictures, so a level 1 student would see the ship picture of a level 3 question.
**Options considered:** move the picture block before the question (no change to the app, but the picture of a hidden question still shows); give picture blocks a level, like questions (the writer must remember to match the question's level); let a question carry its own picture.
**Decision:** a question can carry its own picture (`- file:`, `- caption:`, `- source:` lines inside the question, as drag-and-drop questions already do). It shows under the question text, before answering, and is hidden with the question. The lesson check warns about an image block right after a question. This is a rule for writing lessons, in the lesson format and the teacher kit.
**Reason:** the picture always goes with its question, with nothing for the writer to keep in step.
**Affects:** new REQ-4.31, lessons/README.md, the teacher kit (lesson-rules-for-claude.md), the lesson check, the lesson reader, the lesson player, the exam page, the grading page, archimedes-density-practice-1

### D-83: Build Evolora so it can run as several separate sites
**Date:** 2026-11-27 · **Status:** Decided · **Decided by:** Gil
**Context:** The Ministry of Education's rules (data in Israel, its own sign-in, approval, yearly checks) are heavy, and a change to an approved site may need a new check. Later, users abroad or other countries' ministries of education may want Evolora too, each with their own rules.
**Options considered:** one site for everyone, with every rule applied to all users; two separate sites from the same code (one for the Israeli Ministry of Education, one general), set up now; build now so that separate sites are possible, and set up a second site only when needed.
**Decision:** the last option. The same code can run as several sites. Each site has its own address, data, sign-in, terms, features and languages, all in its own settings and not in the code. Students' and teachers' data never moves between sites. When a second site is set up, and how lessons are shared between sites, are decided later.
**Reason:** keeps the choice open at little cost now. Adding a ministry or a country later means new settings, not a rebuild.
**Affects:** new REQ-11.4; system-design (site settings); docs/moe-approval-steps.he.md, section 13

### D-84: Support Chrome, Edge, Firefox and Safari
**Date:** 2026-11-27 · **Status:** Decided · **Decided by:** Gil
**Context:** D-45 limited Evolora to Google Chrome to save building and testing time. The Ministry of Education's compatibility standard asks for at least three browsers (Chrome, Edge, Safari, Firefox), latest versions.
**Options considered:** keep Chrome only and ask the Ministry for an exception; support the four browsers named in the standard; also support phones.
**Decision:** support the latest Chrome, Edge, Firefox and Safari, on Chromebooks and on Windows and Mac laptops. Other or older browsers show a message suggesting one of the four. Phones still later. This replaces the "Chrome only" part of D-45.
**Reason:** meets the Ministry's standard without asking for an exception, and lets families use the browser they already have. There are no other tasks waiting, so the time is available now.
**Affects:** REQ-11.1, REQ-11.2, Q-40, the "please use Chrome" screen, audio recording and playback, the automatic screen tests, terms/parents-letter.he.md

### D-85: Automatic sign-out after 30 minutes without activity, and after 8 hours
**Date:** 2026-11-27 · **Status:** Decided · **Decided by:** Gil (limits confirmed by Gil on 2026-11-27)
**Context:** The Ministry of Education's security standard asks for sign-out after 30 minutes (sensitive data) or 1 hour (public data) without activity, and after 8 hours (sensitive) or 12 hours (public) in any case.
**Options considered:** 30 minutes and 8 hours; 1 hour and 12 hours.
**Decision:** 30 minutes and 8 hours, with a warning 2 minutes before an inactivity sign-out, a "Stay signed in" button, and no lost work. A playing video or audio counts as activity.
**Reason:** Evolora holds students' answers, grades and voice recordings, which are likely to count as sensitive data.
**Affects:** new REQ-3.5

### D-86: Automatic accessibility checks and fixes, level AA
**Date:** 2026-11-27 · **Status:** Decided · **Decided by:** Gil
**Context:** Evolora has basic accessibility only (REQ-12.3). The Ministry of Education's accessibility procedure asks for Israeli standard 5568 (WCAG 2.0, levels A and AA), with no accessibility toolbars.
**Options considered:** do everything in the Ministry procedure at once (checks, fixes, lesson content, Hebrew wording, statement, outside review); start with automatic checks of every screen and fixing what they find, and decide the rest later.
**Decision:** start with automatic checks of every screen in all four browsers, as part of the automatic tests, and fix colour contrast, font size, keyboard use, labels and error messages. The rest is decided later.
**Reason:** the checks catch most problems quickly, and keep them from coming back.
**Affects:** new REQ-12.9; the automatic screen tests

### D-87: An accessibility statement page in three languages
**Date:** 2026-11-27 · **Status:** Decided (the text is a draft for Gil to approve; coordinator: Gil, reply within 5 working days) · **Decided by:** Gil
**Context:** The Ministry of Education's accessibility procedure (sections 6.2 and 6.4) and regulation 35 ask every website to publish an accessibility statement, with a way to report problems and the accessibility coordinator's details.
**Options considered:** one statement in Hebrew only; a statement in all three languages, linked from every page.
**Decision:** a statement in Hebrew, Arabic and English, kept in the `terms` folder like the terms of use, shown without signing in, and linked from the bottom of every page. It says honestly that Evolora partly meets the standard today.
**Reason:** Evolora serves Hebrew, Arabic and English speakers, and the statement must be easy to find.
**Affects:** new REQ-12.10; `terms/accessibility.*.md`; the footer of every page

### D-88: What "latest versions" of the four browsers means
**Date:** 2026-11-27 · **Status:** Decided by Claude, for Gil to confirm · **Decided by:** Claude
**Context:** REQ-11.1 asks for the latest versions of Chrome, Edge, Firefox and Safari, and a message for older versions. Browsers update every few weeks, and school computers often update a little late; some schools use Firefox's long-term version (ESR), which updates about once a year.
**Options considered:** only the very newest version of each (school computers a few weeks behind would be blocked); versions from about the last year; no version check at all (the Ministry's standard speaks of latest versions).
**Decision:** let in versions from about the last year: in November 2026, Chrome and Edge 145 or newer, Firefox 153 or newer (the current long-term version) and Safari 26 or newer. Claude raises these numbers once a year. The test site's `?any-browser` way around the browser check (from D-45) is removed: the automatic tests now run in the four real browsers, so it isn't needed.
**Reason:** blocks really old browsers, which may lack what Evolora needs or no longer get security updates, without blocking a school computer that is a few weeks behind.
**Affects:** REQ-11.1, system-design 2.5.1, `web/src/browser.ts`

### D-89: Drafts are kept in the browser tab only
**Date:** 2026-11-27 · **Status:** Decided by Claude, for Gil to confirm · **Decided by:** Claude
**Context:** REQ-3.5 says that nothing is lost at an automatic sign-out: an answer being typed is saved as a draft first. The draft has to be kept somewhere.
**Options considered:** in the browser tab only (gone when the tab is closed); in the browser, kept even after it is closed; on Evolora's servers, so a draft would follow the student to another computer.
**Decision:** in the browser tab only. A draft is gone when the text is sent, when the tab or the browser is closed, or when the person signs out themselves. Each draft belongs to one person, so another person signing in on the same computer never sees it. Exam answers are already saved on the server as the student types; just before an automatic sign-out, the last one is sent at once. On the grading page, the grade and comment being written are saved, as when moving to the next answer (D-68).
**Reason:** covers what REQ-3.5 asks (signing out and in again, in the same place) and keeps half-written answers off shared school computers and off the servers. Drafts that follow the student to another computer can be added later if Gil wants them.
**Affects:** REQ-3.5, system-design 4.1.1

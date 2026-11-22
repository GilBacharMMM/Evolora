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
**Date:** 2026-11-20 · **Status:** Open: Gil will choose a new name · **Decided by:** Gil
**Context:** Gil bought evolura.org and considered renaming to Evolura (from "evolution"). A check showed that both "Evolora" and "Evolura" are already used a lot by others.
**Options considered:**
1. Rename to Evolura and use evolura.org.
2. Keep Evolora.
3. Keep Evolora as a working name for now, and choose a new, unused name later.

**Decision:** Option 3. Claude may suggest names.
**Update (2026-11-22):** Gil's current favourite is **Evoluni** (evolution + university); a decision is expected within 1 to 2 days.
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
**Affects:** REQ-4.15, lessons/circles-pi

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
**Date:** 2026-11-22 · **Status:** Decided (details open, OPEN Q-31) · **Decided by:** Gil
**Context:** Exams should be taken by the whole class at the same time, without access to other material.
**Options considered:**
1. A countdown timer per student.
2. A time window set by the teacher, during which only the exam can be opened: in the class, or in all of Evolora.

**Decision:** Option 2. Locking the Chromebook itself to Evolora needs a separate device tool; Google Classroom's locked mode works only with Google Forms quizzes.
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
**Date:** 2026-11-22 · **Status:** Decided (effect on the grade open, OPEN Q-31) · **Decided by:** Gil
**Decision:** A check-again question has 2 attempts, like the original question. After two wrong answers, its answer is shown and the teacher gets a red flag.
**Affects:** REQ-4.17

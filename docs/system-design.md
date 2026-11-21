# Evolora: System Design

**Status:** Approved by Gil on 2026-11-20 (D-16 to D-18), updated with the answers to D-Q1 to D-Q4
**Last updated:** 2026-11-20

This document explains, in plain language, how Evolora is built. It always follows [requirements.md](requirements.md). Significant choices link to their entry in [decisions.md](decisions.md), which explains why they were made.

You don't need to understand the technical names in this document. They're mentioned so that a future developer knows what was used.

---

## 1. The big picture

Evolora has three main parts:

```
   Teacher's / student's Chromebook               Google Cloud (Israel region)
  ┌──────────────────────────────┐          ┌──────────────────────────────────┐
  │                              │          │  Sign-in       (Google accounts) │
  │   The Evolora website        │ ◄──────► │  Database      (lessons, classes,│
  │   (runs in Chrome)           │          │                 answers, grades) │
  │                              │          │  File storage  (images, audio)   │
  └──────────────────────────────┘          │  Checking service (checks answers,│
               ▲                            │                 calculates grades)│
               │                            └──────────────────────────────────┘
       evoloraedu.org
```

1. **The website**: everything people see and click. It runs in Chrome on the Chromebook.
2. **The database**: stores lessons, classes, assignments, answers, grades, comments and messages.
3. **The checking service**: a small program running in Google Cloud that checks answers and calculates grades. It runs in Google Cloud, not on the student's Chromebook, so students can't see the correct answers or change their own grades.

All of this runs on **Firebase**, Google's ready-made service for websites (decision D-10). Data is stored in Google's **Israel (Tel Aviv) region** (REQ-10.4).

---

## 2. What the user sees

### 2.1 One website for everyone
There is one website at **evoloraedu.org**. After signing in, each person sees the screens that fit their role (REQ-2.1):

| Role | Main screens |
|---|---|
| Student | Home (what to do next), lesson player, my progress, messages |
| Teacher | My classes, class dashboard, grade dashboard, review screen, messages, lesson library |
| Teacher with edit mode on | Everything above, plus the lesson editor (stage 2, D-33) |
| System admin | Manage teachers |

### 2.2 Getting lessons into Evolora
**Stage 1 (D-33):** there is no lesson editor. Gil and Claude write each lesson as a lesson file in the `lessons` folder (plain text, described in `lessons/README.md`). A small **loading program**, run by Claude on this computer, checks the file, uploads its images to file storage and saves the lesson in the database, as a new version (section 3.2). It loads into the test site first, and into the real site only after Gil has checked the lesson there (REQ-4.24).

**Stage 2: the lesson editor.** The editor works like a simple word processor made of **blocks** (REQ-4.2). This screen is called the **lesson builder**. The creator clicks "+" to add a block (text, note box, image, table, formula, video, audio, simulation, link list or question) and drags blocks to reorder them. Every image needs its source filled in: own work, AI-generated, or another source with author, link and licence (REQ-4.15). A **Preview** button shows the lesson exactly as a student sees it (REQ-4.6).

Formulas use a visual formula editor, so creators click and type, without writing code (REQ-4.3, D-8). Behind the scenes, formulas are saved in the standard math format used by most science software (called LaTeX), so they can be imported from documents later.

### 2.3 The lesson player
Students see the lesson one section at a time. Everything up to the next question is visible. The rest of the lesson appears only after the question is answered (REQ-4.5). The player saves their place after every answer (REQ-6.2).

Videos, simulations and podcasts from other websites are shown inside the lesson. If a website doesn't allow that, a button opens it in a new tab instead (REQ-4.2).

### 2.4 Languages and direction
- All menu and button text is kept in three translation files: Hebrew, Arabic and English (REQ-9.1). Adding a language later means adding one more file.
- The screen layout mirrors itself automatically: right-to-left for Hebrew and Arabic, left-to-right for English (REQ-9.2).
- Each lesson stores its own language, and its content is always shown in that language's direction, whatever the menu language (REQ-9.3).
- Formulas are always shown left-to-right, even inside Hebrew text (REQ-4.3).

### 2.5 Screen size
Screens are designed for a Chromebook screen (typically 11 to 14 inches) and work on larger screens too. Phones aren't supported (REQ-11.1).

---

## 3. Where the data lives

### 3.1 What we store

| Information | Examples | Where |
|---|---|---|
| People | Name, school email, role, interface language | Database |
| Lessons | Title, language, subject, grade, blocks, creator, versions | Database |
| Correct answers and grading instructions | The right choice in a multiple-choice question | Database, in a protected area students can never read |
| Courses | Name, list of lessons, public or private | Database |
| Classes | Name, class code, teachers, students | Database |
| Assignments | What was assigned, to whom, settings, due date | Database |
| Student work | Answers, attempts, grades, place in the lesson | Database |
| Comments and messages | Teacher comments, student–teacher conversations | Database |
| Images | Pictures in lessons | File storage |
| Audio | Lesson audio, students' recorded answers, teachers' audio comments | File storage |

### 3.2 Lesson versions
When a lesson is published (in stage 1: loaded by Claude), Evolora saves that version and never changes it. Editing creates a new draft. Publishing the draft saves a new version. A student's work always records which version they started, so students in the middle keep their version (REQ-4.7, D-6).

Copying a lesson (REQ-4.8) creates a new lesson that remembers which lesson it came from. That is how the "Based on a lesson by…" credit works.

### 3.3 Backups
The database is backed up automatically every day, and backups are kept for 7 days (REQ-10.4). Files (images and audio) are kept in Google's storage, which already stores several copies.

---

## 4. Accounts and permissions

### 4.1 Signing in
People sign in with "Sign in with Google" (REQ-3.1). People use a regular Google account such as Gmail (REQ-3.2, D-19). A newly signed-in person is a student with no classes and can see nothing until they enter a class code (REQ-10.1). Which accounts may sign in is decided in one place, so switching to school accounts later (REQ-3.3) is a small change.

### 4.2 Roles
- A person's **role** is stored in their record. Everyone starts as a student. Only a system admin can make someone a teacher (REQ-2.2).
- The first system admin is set up by Claude directly, using a Google account Gil chooses.
- Edit mode is a switch on the teacher's own screen (REQ-2.3, stage 2).

### 4.3 Who can see what
Rules inside the database decide what each person can read and change. They apply even if someone tries to get around the website, for example by typing addresses (REQ-3.4). The main rules:

- Students can read **their own** work, grades, comments and messages, never anyone else's.
- Students can read lessons assigned to them, but **never** the correct answers or grading instructions.
- Only the **checking service** can write grades for automatically checked questions. Students can't write grades at all.
- Teachers can read and change everything in **their own classes**, and nothing in other teachers' classes.
- Messages can be read only by the student and the teachers of that class (REQ-5.16).
- Lessons in the lesson library can be read by all teachers. In stage 1, only Claude's loading program can add or change lessons. In stage 2, only the lesson's own creator can change it (others make a copy).

These rules are tested automatically before every release (section 8).

---

## 5. Checking answers and grades

### 5.1 Automatically checked questions (multiple choice)
1. The student submits an answer.
2. The checking service compares it with the correct answer in the protected area.
3. It records the attempt. After the 1st wrong attempt it replies "try again" with the hint (REQ-4.16).
4. After a correct answer, or after the 2nd wrong attempt, it records the question's score (REQ-6.3). After the 2nd wrong attempt, it sends the full solution (which contains the answer), then picks one check-again question at random and sends it without its answer (REQ-4.17). A wrong answer to that creates a red flag for the class's teachers.

The correct answer, the hint and the solution are kept in the protected area. The correct answer reaches the student's Chromebook only after the 2nd wrong attempt. Before that, it isn't there to find, even by a student who knows how to look inside web pages (decision D-17).

**Random answer order (REQ-4.19):** the first time a student opens a question, the checking service shuffles its choices and saves that order for the student, so it stays the same when they return.

*Details still waiting for Gil's answers (Q-18, Q-21):*
- **Levels (REQ-6.10):** the student's level is stored where only teachers and the checking service can read it. When the student opens a lesson, they receive only the questions up to their level, so the skipped questions never reach their Chromebook.

### 5.2 Open and audio questions
The answer is saved and the question is marked **pending**. The student continues. When the teacher grades it on the review screen (REQ-5.12), the checking service recalculates the lesson grade.

### 5.3 Lesson grade
The lesson grade is the weighted average of its questions (REQ-4.4). It's recalculated whenever something changes:
- a question is graded
- a teacher changes a grade (REQ-5.15)
- a due-date penalty applies (REQ-5.9)
- a redo replaces the old result (REQ-6.5)

It's shown as **pending** while any open question is waiting, and as **not done** (counting as 0) if the lesson isn't finished (REQ-5.11).

### 5.4 Status colours
The class dashboard colour for each student (REQ-5.10) is calculated by the checking service using a small set of rules. The rules are kept in one place so they can be adjusted easily once we've tried them (open question Q-4).

---

## 6. Audio recording

Students record audio answers using the Chromebook's microphone, through Chrome (REQ-6.6). Chrome asks for microphone permission the first time. Recordings are saved in compressed form, so a one-minute answer takes up about half a megabyte. Recordings are private: only the student and the class's teachers can play them. Teachers record audio comments the same way (REQ-5.13).

Automatic deletion at the end of the school year (REQ-10.5) is planned for later.

---

## 7. Hosting and running the system

### 7.1 Where it runs
Everything runs in the Firebase project **evolora**, owned by Gil's personal Google account (D-15), in the Israel region.

### 7.2 The web address
evoloraedu.org is registered at Cloudflare (D-14). To connect it, Claude will give Gil two or three records to add in Cloudflare. Google then sets up the secure connection (the padlock) automatically.

### 7.3 A separate test site
There is a **second, separate Firebase project**, **evolora-test**, used only for testing (decision D-18, REQ-12.4):

| | Test site | Real site |
|---|---|---|
| Address | evolora-test.web.app | evoloraedu.org |
| Sign-in | Made-up test users (one-click switching), or Gil's own Google accounts | Google accounts |
| Data | Made-up test classes and students | Real teachers and students |
| Who uses it | Gil, to check new features | Teachers and students |

**How releases work:**
1. Claude builds a feature and puts it on the test site.
2. Gil checks it against the acceptance criteria.
3. Only after Gil approves does Claude put it on the real site.

This way, real students never see a half-finished feature, and testing never mixes made-up data with real grades.

**Switching users (REQ-12.5).** On the test site, a "Switch user" menu lets Gil become any test user (for example, Test Teacher 1 or Test Student 3) with one click. The test users are simple made-up accounts that exist only in the test project. The menu is built so that it can't appear on the real site. Every test-site screen shows a "TEST SITE" banner.

**Test data (REQ-12.6).** Claude can fill or reset the test site with a standard set: 2 test teachers, 6 test students, a test class, and the Archimedes lesson.

### 7.4 Email
Email invites to classes (REQ-5.3) are sent through a free email service from **noreply@evoloraedu.org**. This needs a few extra settings in Cloudflare and is set up in Milestone B.

### 7.5 Costs
For the pilot, Firebase's free allowance should cover almost everything. Storage for images and audio may cost a few shekels a month. The 50 ILS monthly alert (D-15) warns Gil well before costs become significant.

### 7.6 If something goes wrong
- If the website fails to load, Google's service status page tells us whether the problem is on Google's side.
- Errors in the checking service are recorded in Google Cloud's logs, so Claude can find out what went wrong.
- If a release causes a problem, Claude can put the previous version back within minutes.

---

## 8. Testing approach

There are two levels of testing.

### 8.1 Automatic tests (Claude)
Before anything goes to the test site, Claude runs automatic tests:
- **Permission tests**: try to break the rules in section 4.3, for example a student trying to read another student's grades. These must all be blocked.
- **Grading tests**: check every scoring case in REQ-6.3, due-date penalties and redo rules.
- **Screen tests**: a robot opens Chrome and goes through the main flows: a student taking the Archimedes lesson, and a teacher grading it. They run in all three languages.

### 8.2 Acceptance checks (Gil)
Gil checks each requirement's acceptance criteria on the test site. For each feature, Claude tells Gil:
- which REQ numbers it covers
- which test accounts to use
- what to try

---

## 9. Building blocks (for future developers)

| Part | Technology |
|---|---|
| Website | React with TypeScript, built with Vite |
| Lesson editor (stage 2) | Tiptap (a block-based editor that supports right-to-left text) |
| Formula display (and editor in stage 2) | MathLive, with formulas stored as LaTeX |
| Lesson loading program (stage 1) | A small Node.js program in this project that reads lesson files |
| Translations | i18next |
| Sign-in | Firebase Authentication (Google) |
| Database | Cloud Firestore, region me-west1 (Tel Aviv) |
| File storage | Cloud Storage for Firebase, region me-west1 |
| Checking service | Cloud Functions for Firebase |
| Website hosting | Firebase Hosting |
| Automatic tests | Vitest, Firebase Emulator Suite, Playwright |
| Code licence | AGPL-3.0 (D-5) |

Reasons are in decision D-16.

---

## 10. Open design questions

All four design questions (D-Q1 to D-Q4) were answered on 2026-11-20; see section 14 of requirements.md.

---

## 11. Requirement coverage

Which part of the system delivers each group of requirements:

| Requirements | Delivered by (section) |
|---|---|
| REQ-1.1 (open, attribution, licence) | Database: lesson creator and "based on" fields (3.2); licence shown in the lesson player (2.3) |
| REQ-2.1 to 2.3 (roles, edit mode) | Accounts and permissions (4.2) |
| REQ-3.1 to 3.4 (sign-in, access) | Accounts and permissions (4.1, 4.3) |
| REQ-4.1 to 4.10, 4.24 (lessons, courses, loading) | Getting lessons into Evolora (2.2), lesson versions (3.2), permissions (4.3) |
| REQ-5.1 to 5.16 (classes, dashboards, review, messages) | Website screens (2.1), checking service (5), permissions (4.3), email (7.4) |
| REQ-6.1 to 6.6 (student learning) | Lesson player (2.3), checking service (5), audio (6) |
| REQ-8.1 (subjects, grades) | Lesson details in the database (3.1) |
| REQ-9.1 to 9.4 (languages, direction) | Languages and direction (2.4) |
| REQ-10.1 to 10.4 (privacy) | Permissions (4.3), Israel region and backups (3.3, 7.1) |
| REQ-11.1 to 11.3 (platform, hosting, size) | Screen size (2.5), hosting (7) |
| REQ-12.4 to 12.6 (test site, user switching, test data) | Test site (7.3) |
| REQ-12.1 to 12.3 (speed, no lost work, accessibility) | Lesson player saves after every answer (2.3); tested in screen tests (8.1) |

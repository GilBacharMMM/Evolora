# Evolora: Roadmap

**Status:** Draft 3: priorities set by Gil (2026-11-22, decision D-26)
**Last updated:** 2026-11-22

This document says what goes into each version. Each item refers to requirement numbers in [requirements.md](requirements.md). Every requirement in requirements.md is marked with its priority.

## Priorities (decision D-26)

Gil set every feature to one of 3 levels, on the priorities page:

1. **Must have** for the pilot
2. **Should have**: right after the must-haves
3. **Later**

## Version 1: Stage 1 (pilot at Gil's school)

**Goal:** Prove that students can learn on their own with Evolora lessons, and that teachers can follow and guide them, in real classes.

**Who it is for:** 5 teachers and about 120 seventh-grade students, on school Chromebooks and laptops, in Google Chrome, signing in with regular Google accounts (D-19).

**How it is built:** in parts. Each part goes onto the test site with a list of checks for Gil, taken from the acceptance criteria; the next part starts when Gil is happy. Admin tasks are done through Claude (D-47). Lessons and courses come from lesson and course files (D-33).

### Foundation (always in)

REQ-1.2, 1.3 key principles; REQ-2.1, 2.2 roles and admin through Claude; REQ-3.1, 3.2, 3.4, 10.1 to 10.4 sign-in, access and privacy; REQ-4.2, 4.4, 4.5, 6.2, 6.3 the lesson player and scoring; REQ-4.24, 4.25 loading lesson and course files, and the teacher kit; REQ-8.1, 9.1 to 9.4 subjects, languages and direction; REQ-11.1 to 11.3 Chrome on Chromebooks and laptops, hosting, pilot size; REQ-12.1 to 12.7 speed, no lost work, accessibility, test site, test users and data, design language.

### Priority 1: must have (the first release for the pilot)

| Part | Requirements | What Gil can try on the test site |
|---|---|---|
| 1 | Foundation, REQ-12.4 to 12.6, 4.24 | Sign in, switch between test users, see the three demo lessons loaded |
| 2 | REQ-4.3, 4.16, 4.17, 4.20, 4.21, 4.22, 4.23, 6.15 | Take the demo lessons as a student: formulas, two attempts with hint and solution, check-again questions, number questions, help tips, videos with start and end times, topics with extra practice, lesson types shown |
| 3 | REQ-5.1, 5.2, 5.4, 5.6, 5.7, 4.10, 6.1, 6.4, 6.11, 6.12 | Classes and class codes, assigning lessons and courses, the student's home, class and course pages (lessons open one after another until REQ-5.8) |
| 4 | REQ-5.27, 5.10, 5.24, 5.19, 5.20, 5.12, 5.13, 5.11 | Teacher home and class dashboard, red flags and clearing them, opening lessons early for chosen students, the grading page with written comments, the grade table with CSV download |

**Progress:** part 1 is on the test site (2026-11-23), waiting for Gil's checks.

**Done when:** the demo lessons (Archimedes, circles, circles practice) are loaded, Gil assigns them to a real class, the students complete them, and Gil follows them on the dashboard and grades their open answers.

### Priority 2: should have (right after)

| Requirements | Short description |
|---|---|
| REQ-4.18, 5.18, 6.10 | Question levels and secret student levels |
| REQ-4.19 | Answers in random order |
| REQ-4.15, 1.1 | Image sources and licence shown |
| REQ-5.8 | Course orders (one after another, paired, any order) |
| REQ-5.9 | Due dates and assignment settings |
| REQ-5.22 | Hiding grades from students |
| REQ-5.14, 5.15 | Send back for corrections; teacher changes grades |
| REQ-5.25, 5.28 | "Not yet mastered" list; student page with teacher notes |
| REQ-6.13 | Going back to finished lessons |

### Priority 3: later

| Requirements | Short description |
|---|---|
| REQ-4.26, 5.23 | Exams; exam time window, lock and timer |
| REQ-4.7 | Lesson versions (until then, Claude reloads a changed lesson only when no student is in the middle of it, or after checking with Gil) |
| REQ-4.9 | Lesson library search |
| REQ-5.3, 5.5 | Email invites; co-teachers |
| REQ-5.12 (marking up), 5.13 (audio comments) | Marking up answers; audio comments |
| REQ-5.16, 10.2 | Messages |
| REQ-5.21 | Archiving courses |
| REQ-5.29 | Success rate per question |
| REQ-5.31 | Daily email for teachers |
| REQ-6.5, 6.6 | Redo a lesson; recorded audio answers |
| REQ-9.6 | Teacher changes a student's language |
| REQ-10.7 | Class-code guessing alerts |

## Version 2: Stage 2 (lesson creation, AI and richer content)

Each AI item first gets a cost estimate for Gil's approval.

| Requirement | Short description |
|---|---|
| REQ-2.3, 4.1, 4.2 (editing), 4.3 (editor), 4.6, 4.8 | Creating lessons inside Evolora: edit mode, lesson builder, formula editor, preview, copy any lesson (D-33) |
| REQ-4.11 | Import from Google Docs and Word |
| REQ-4.12 | More question types, including drag-and-drop |
| REQ-7.1 | AI grading options |
| REQ-6.9, 7.2 | AI help line under every question (replacing the written help tips); AI-suggested check-again questions |
| REQ-5.26 | Nudge to the teacher when a student runs out of work |
| REQ-5.30 | Live view during class |
| REQ-7.3 | AI lesson suggestion from a document |
| REQ-7.4, 10.5 | Audio transcription and recording retention |
| REQ-5.17 | Google Classroom connection |
| REQ-6.7 | Public courses without a teacher |
| REQ-9.5 | Class language setting |

## Later / ideas

- REQ-2.4: creators who are not teachers
- REQ-3.3: school accounts after Ministry approval, and Ministry of Education sign-in
- REQ-4.13: simulations built into Evolora
- REQ-4.14: lesson marketplace
- REQ-6.8: game-like progress, points or coins
- REQ-7.5: automatic translation
- REQ-10.6: full privacy compliance (required before release beyond the pilot)

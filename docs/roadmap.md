# Evolora: Roadmap

**Status:** Draft 2, in review
**Last updated:** 2026-11-20

This document says what goes into each version. Each item refers to requirement numbers in [requirements.md](requirements.md).

## Version 1: MVP (pilot at Gil's school)

**Goal:** Prove that students can learn on their own with Evolora lessons, and that teachers can follow and guide them, in real classes.

**Who it is for:** 5 teachers and about 120 seventh-grade students, on school Chromebooks with @taded.org.il Google accounts.

**Target:** real students using it within 2 to 4 weeks. Because that is tight, the MVP is split into two milestones. Milestone A puts a real lesson in front of real students as early as possible. Milestone B completes the teacher tools.

### Milestone A: First lesson in class (aim: about 2 weeks)

| Requirement | Short description |
|---|---|
| REQ-2.1, 2.2, 2.3 | Roles, admin registers teachers, edit mode |
| REQ-3.1, 3.2, 3.4, 10.1 | Google sign-in with regular Google accounts, access rules, strangers see nothing |
| REQ-4.1 to 4.6, 4.15 | Create lessons: content blocks, formula editor, 3 question types, preview, image sources |
| REQ-4.16, 4.17 | Hints, full solution and check-again questions |
| REQ-5.1, 5.2, 5.4, 5.6 | Classes, class code, class list, many classes per student |
| REQ-5.7 | Assign lessons to a class or selected students |
| REQ-5.11 | Grade dashboard (basic) |
| REQ-6.1 to 6.4, 6.6 | Student home, taking a lesson, attempts and scoring, progress, audio answers |
| REQ-9.1 to 9.4 | Hebrew, Arabic, English; right-to-left and left-to-right; each person chooses their language |
| REQ-10.4, 11.1 to 11.3, 12.1 to 12.3 | Hosting, safety basics, Chromebook web app, speed, no lost work |
| REQ-12.4 to 12.6 | Test site, user switching, test data (built first, so Gil can test everything else) |

**Done when:** the Archimedes and density lesson is in Evolora, Gil assigns it to a real class, the students complete it, and Gil sees their grades.

### Milestone B: Full teacher tools (aim: about 2 more weeks)

| Requirement | Short description |
|---|---|
| REQ-1.1, 4.8, 4.9 | Attribution and licence shown, copy any lesson, lesson library |
| REQ-4.7 | Lesson versions |
| REQ-4.10 | Courses, public or private (unlisted) |
| REQ-5.3 | Email invites |
| REQ-5.5 | Co-teachers |
| REQ-5.8, 5.9 | Fixed order or choice, due dates, redo setting |
| REQ-5.10 | Class dashboard with status colours |
| REQ-5.12 to 5.15 | Review screen, comments (text and audio), send back, grade changes |
| REQ-5.16 | Messages |
| REQ-6.5 | Redo a lesson |
| REQ-4.18, 5.18, 6.10 | Question levels and secret student levels |
| REQ-6.9 (without AI) | Help line that sends the question to the teacher *(proposed, OPEN Q-20)* |

**Done when:** every MVP acceptance criterion in requirements.md passes when Gil checks it in the app.

## Version 2: Stage 2 (AI and richer content)

Each AI item first gets a cost estimate for Gil's approval.

| Requirement | Short description |
|---|---|
| REQ-4.11 | Import from Google Docs and Word |
| REQ-4.12 | More question types, including drag-and-drop |
| REQ-7.1 | AI grading options |
| REQ-6.9, 7.2 | AI help line under every question (on topic, never reveals the answer); AI-suggested check-again questions |
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

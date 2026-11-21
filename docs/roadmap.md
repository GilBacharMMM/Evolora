# Evolora: Roadmap

**Status:** Draft 2, in review
**Last updated:** 2026-11-20

This document says what goes into each version. Each item refers to requirement numbers in [requirements.md](requirements.md).

## How priorities will be set (decision D-26)

When the requirements are finished, Claude will give Gil a list of all features, with a suggested priority for each. Gil then sets each feature to one of 3 levels. Claude's suggestion for the names:

1. **Must have** for the pilot
2. **Should have**: important, right after the must-haves
3. **Later**

Until then, the milestones below are only a draft.

**Not yet prioritized** (new since the draft below): REQ-4.16 and 4.17 hints, full solution and check-again questions; REQ-4.18, 5.18 and 6.10 levels; REQ-4.19 random answer order; REQ-4.20 teaching, practice and exam lessons; REQ-4.26 exams; REQ-4.21 topics with a minimum number of questions; REQ-4.22 type-a-number questions; REQ-4.23 videos inside the lesson, with start and end times; REQ-5.19 clearing a red flag; REQ-5.20 opening lessons early for chosen students; REQ-5.21 archiving courses; REQ-9.6 teacher changes a student's language (low priority); REQ-10.7 alerting the system admin about class-code guessing; solved examples (REQ-4.2); REQ-6.9 help line (with AI, or first by message to the teacher).

## Version 1: MVP (pilot at Gil's school)

**Goal:** Prove that students can learn on their own with Evolora lessons, and that teachers can follow and guide them, in real classes.

**Who it is for:** 5 teachers and about 120 seventh-grade students, on school Chromebooks, signing in with regular Google accounts (D-19).

**Target:** real students using it within 2 to 4 weeks. Because that is tight, the MVP is split into two milestones. Milestone A puts a real lesson in front of real students as early as possible. Milestone B completes the teacher tools.

### Milestone A: First lesson in class (aim: about 2 weeks)

| Requirement | Short description |
|---|---|
| REQ-2.1, 2.2 | Roles, admin registers teachers |
| REQ-3.1, 3.2, 3.4, 10.1 | Google sign-in with regular Google accounts, access rules, strangers see nothing |
| REQ-4.24, 4.25 | Loading lesson files; the lesson-writing kit for teachers (no lesson creation inside Evolora in stage 1, D-33). The kit is ready now. |
| REQ-4.2 to 4.5, 4.15 | Lessons for students: all content blocks, formulas, 3 question types, questions block progress, image sources |
| REQ-5.1, 5.2, 5.4, 5.6 | Classes, class code, class list, many classes per student |
| REQ-5.7 | Assign lessons to a class or selected students |
| REQ-5.11 | Grade dashboard (basic) |
| REQ-1.2, 1.3 | Key principles: individual progress, and mastery of every level 1 question |
| REQ-12.7 | Design language: Claude proposes it with clickable mockups, Gil approves (first step before building screens) |
| REQ-6.1 to 6.4, 6.6, 6.11 to 6.13 | Student home (class cards, "To do"), class page, course page, taking a lesson, attempts and scoring, progress, audio answers, going back to finished lessons |
| REQ-9.1 to 9.4 | Hebrew, Arabic, English; right-to-left and left-to-right; each person chooses their language |
| REQ-10.4, 11.1 to 11.3, 12.1 to 12.3 | Hosting, safety basics, Chromebook web app, speed, no lost work |
| REQ-12.4 to 12.6 | Test site, user switching, test data (built first, so Gil can test everything else) |

**Done when:** the Archimedes and density lesson is loaded into Evolora, Gil assigns it to a real class, the students complete it, and Gil sees their grades.

### Milestone B: Full teacher tools (aim: about 2 more weeks)

| Requirement | Short description |
|---|---|
| REQ-1.1, 4.9 | Attribution and licence shown, lesson library |
| REQ-4.7 | Lesson versions |
| REQ-4.10 | Courses, public or private (unlisted) |
| REQ-5.3 | Email invites |
| REQ-5.5 | Co-teachers |
| REQ-5.8, 5.9 | Course orders (one after another, paired, any order), due dates, redo setting |
| REQ-5.10 | Class dashboard with status colours |
| REQ-5.12 to 5.15 | Review screen, comments (text and audio), send back, grade changes |
| REQ-5.16 | Messages |
| REQ-6.5 | Redo a lesson |

**Done when:** every MVP acceptance criterion in requirements.md passes when Gil checks it in the app.

## Version 2: Stage 2 (lesson creation, AI and richer content)

Each AI item first gets a cost estimate for Gil's approval.

| Requirement | Short description |
|---|---|
| REQ-2.3, 4.1, 4.2 (editing), 4.3 (editor), 4.6, 4.8 | Creating lessons inside Evolora: edit mode, lesson builder, formula editor, preview, copy any lesson (D-33) |
| REQ-4.11 | Import from Google Docs and Word |
| REQ-4.12 | More question types, including drag-and-drop |
| REQ-7.1 | AI grading options |
| REQ-7.2 | AI-suggested check-again questions |
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

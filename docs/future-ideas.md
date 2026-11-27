<!-- Gil's ideas for later, written with Claude on Gil's phone (2026-11-27). Not requirements yet: to be discussed with Gil, then turned into numbered requirements in docs/requirements.md. -->

> **Note from Claude (2026-11-27): what already exists.** Some of these ideas overlap with requirements we already have, so the discussion can start from them:
> - **1. Levels:** student levels per class (REQ-5.18, 6.10) and question levels 1 to 3 inside a lesson (REQ-4.18) are built. What's new here is a level for the **whole lesson**.
> - **2. Tags:** lessons already record language, subject and grade at the top of the file, and the library has a search (REQ-4.9). New: more tags, and a README for teachers.
> - **3. Language code:** the language is recorded in each lesson (`language: he`); automatic translation is REQ-7.5 (later).
> - **4. Skipping questions:** new.
> - **5. Matching two lists** and **6. Ordering sentences:** new question types (REQ-4.12 lists more question types for later).

# Evolora — Future Improvement Ideas (backlog, NOT for development yet)

> Status: documentation only. Each topic has open questions to refine it — answer below each question.

---

## 1. Lesson and question levels (1–3)

**Description:**
- Every lesson has a level from 1 to 3.
- Level 1 students see level 1 lessons only; level 2 students see levels 1–2; level 3 students see levels 1–3.
- A level 1 lesson contains questions at levels 1–3; a level 2 lesson contains questions at levels 2–3.

**Open questions:**
1. In a level 3 lesson — are all questions level 3 only?
2. Inside a lesson, does a student see only questions up to their own level (e.g. a level 1 student in a level 1 lesson sees only level 1 questions), or all questions?
3. Who sets a student's level — the teacher manually, automatically by performance, or both?
4. Is a student's level global or per subject (e.g. level 3 in math, level 1 in English)?
5. Can a student move up/down a level, and what happens to lessons already assigned?
6. Can a teacher assign a lesson above the student's level (manual override)?
7. Where is the question level stored — inside the lesson file, next to each question?
8. What is the default for a lesson/question with no level set?

---

## 2. Lesson tags + teacher README

**Description:**
- Each lesson has tags for easy search: language, subject, recommended grade (e.g. 7th grade).
- Tags are written inside the lesson file, in a comment.
- Optional: a README comment at the top of the lesson for teachers — description, goals, required prior knowledge.

**Open questions:**
1. Is the tag list closed (fixed values to choose from) or free-form?
2. Which tags are required and which optional? (language / subject / grade / topic / level / author / estimated duration?)
3. Recommended grade — a single value or a range (7–8)?
4. Comment format — e.g. one block at the top of the file with `key: value` lines. OK?
5. Search — filter by tags (dropdowns), free-text search, or both?
6. README — free text or structured fields (description / goals / prior knowledge / notes)?
7. Is the README visible to teachers only, or also to students (e.g. lesson goals)?
8. Do we need a tool that auto-tags the existing lessons?

---

## 3. Language code in lesson names

**Description:**
- Add a two-letter language code to each lesson name (he, en, ar...).
- Coming soon: translating existing lessons into several languages.

**Open questions:**
1. Where in the name — prefix (`he_fractions`) or suffix (`fractions_he`)?
2. In the file name, the displayed title, or both?
3. ISO 639-1 codes (he, en, ar, ru)?
4. How are translated versions of the same lesson linked — shared ID, shared folder?
5. When the original lesson is edited — should translations update / be flagged "outdated"?
6. Can a student/teacher switch between languages of the same lesson?
7. Which languages are planned, and who translates (AI, human, AI + human review)?
8. Bilingual lessons (e.g. English lesson for Hebrew speakers) — which code?

---

## 4. Teacher can skip questions in an assigned lesson

**Description:**
- When assigning a lesson, and also afterwards, the teacher can mark questions to skip.
- Skipped questions are hidden from that teacher's class but not deleted from the lesson.

**Open questions:**
1. Is skipping per whole class, or also per individual student?
2. If a student already answered a question and then the teacher skips it — what happens to the answer and grade?
3. Is the grade recalculated from the remaining questions only?
4. Can a skip be undone (question restored)?
5. If the same lesson is assigned to several classes — are skips separate per class/assignment?
6. Do students know a question was removed (e.g. "question 4 of 10" vs. renumbering)?
7. Can other teachers see a colleague's skips, or is it private?

---

## 5. New question type: matching two lists

**Description:**
- Two lists (e.g. English words and their Hebrew translations).
- The student connects items by dragging a line from side to side.

**Open questions:**
1. Always one-to-one, or can one item match several?
2. Can the lists have different lengths (distractors — extra items)?
3. Shuffle order automatically on every display?
4. Scoring — partial (per correct pair) or all-or-nothing?
5. Can items be images / formulas, or text only?
6. Mobile/tablet — drag a line with a finger, or also a tap alternative (tap item, then its match)?
7. In Hebrew (RTL) — which list goes on the right and which on the left?
8. Can a line be changed after drawing, before submitting?

---

## 6. New question type: ordering sentences

**Description:**
- A list of sentences the student arranges in the correct order (e.g. steps for baking a cake).

**Open questions:**
1. Ordering by drag-and-drop, numbering, or up/down arrows?
2. Can there be more than one correct order (interchangeable steps)?
3. Scoring — all-or-nothing, or partial (e.g. items in correct position / correct adjacent pairs)?
4. Shuffle on every display?
5. Can items be images / numbers (e.g. sort numbers smallest to largest)?
6. Show the correct order to the student after submitting?
7. Recommended maximum number of items?

---

## 7. A new look for the app (Gil, 2026-11-27)

**Description:**
- Today Evolora looks like many recent AI apps. It needs its own look, made for school students and teachers.
- Suggested way (Claude): Gil names a few apps, sites or books whose look Gil likes (and ones Gil dislikes). Claude makes 3 different looks as clickable demos of the same 2 screens (a student in a lesson, the teacher's class dashboard). Gil picks one, or mixes them. Then the whole app changes in one place (its colours, fonts, shapes and icons), without changing how anything works.

**Open questions:**
1. What feeling should it give: playful, calm, serious, scientific, warm?
2. Examples of looks Gil likes, and ones Gil doesn't?
3. A logo and colours of its own, perhaps made by a designer?
4. Should students and teachers see the same look, or should students' screens be more playful?
5. Hebrew and Arabic fonts: which ones? (They must be easy to read for 12-year-olds.)
6. Must keep: good contrast and readable text (REQ-12.3), right-to-left screens, and Chromebook screen sizes.

---

## General questions
1. Priority order among the six topics?
2. Dependencies between topics (e.g. levels → tags → search)?
3. Must changes be backward compatible with existing lessons, or do we run a one-time migration?

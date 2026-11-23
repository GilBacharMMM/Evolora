# Lesson files

Each folder here holds one lesson in **lesson file** form: a plain-text version of the lesson, block by block, written with Claude before the lesson goes into Evolora. Claude loads these files into the test site and, after Gil checks them, the real site (REQ-4.24).

Pilot teachers write lessons with the **lesson-writing kit** in [teacher-kit](teacher-kit) (REQ-4.25). Whenever this format changes, the kit is updated too.

## How a lesson file is written

**Folder names** (Gil, 2026-11-22): each lesson folder is named `<topic>-teaching`, `<topic>-practice` or `<topic>-exam`, matching the lesson's type, in lowercase English with dashes. Lessons on the same topic share the topic part, so they sit together: for example `circles-teaching`, `circles-practice`, `circles-exam`. A second lesson of the same type gets a number: `circles-practice-2`. The lesson check refuses a folder whose name doesn't match its type.

The top of the file has the lesson details (title, language, subject, grade, creator, licence, type: teaching lesson, practice lesson or exam, REQ-4.20, and the default minimum questions per topic, REQ-4.21).

A heading like `# [TOPIC 2: name]` starts a new topic (REQ-4.21). Every block after it, until the next topic, belongs to that topic.

Each block starts with a heading in square brackets, matching the block types in REQ-4.2:

| Heading | Block |
|---|---|
| `[TEXT]` | Text |
| `[NOTE BOX]` | Highlighted side note |
| `[QUOTE]` | A quotation, such as a verse from the Bible, shown in a classic Hebrew font: the quoted words, then a `- source:` line (D-54) |
| `[IMAGE]` | Image, with `file`, `caption` and `source` lines (REQ-4.15) |
| `[TABLE]` | Table |
| `[FORMULA]` | Formula |
| `[VIDEO]` | YouTube video: `link`, `title`, `source` (the channel), and optional `start` and `end` times like `1:20` (REQ-4.23) |
| `[AUDIO]` | Audio link or file |
| `[SIMULATION]` | Simulation link, with instructions for the student |
| `[LINK LIST]` | Further-reading links |
| `[QUESTION: multiple choice]` | Choices marked `(✔)` are correct |
| `[QUESTION: open]` | Includes `Grading instructions` for the teacher |
| `[QUESTION: audio]` | Recorded answer, with `Grading instructions` |
| `[QUESTION: number]` | The student types a number: `Answer` and `Unit` lines; correct to one digit after the decimal point is enough (REQ-4.22) |
| `[SOLVED EXAMPLE]` | A question with its full answer, written as **שאלה:** and **תשובה:**; nothing for the student to answer |

Extra lines for questions (REQ-4.16 to 4.18):

| Line | Meaning |
|---|---|
| `[LEVEL 1]`, `[LEVEL 2]` or `[LEVEL 3]` after the heading | Question level: 1 is easiest, 3 hardest (REQ-4.18) |
| `[EXTRA]` after the heading | Extra practice question: asked only until the student has answered the topic's minimum correctly (REQ-4.21) |
| `- Hint:` | Shown after the 1st wrong answer (REQ-4.16) |
| `- Solution:` | The full worked solution, shown after the 2nd wrong answer (REQ-4.16) |
| `- Why it's right:` | A short explanation (1 or 2 sentences) of why the correct answer is right, shown after a correct answer (REQ-4.28). Good practice for every multiple choice and number question; if it's missing, the full solution is shown instead, and the lesson check gives a warning. A check-again question may have its own. Not used in exams. |
| `### Check-again question` | A similar question under the main one, asked right after the solution (REQ-4.17). Several can be added; each student gets one at random. It has 2 attempts, like the original; it may have its own `- Hint:` line (otherwise the original's hint is shown). Choices are shown in random order (REQ-4.19), so the order in the file doesn't matter. |
| `- Tip: title \| text` | A help tip for the question, shown from the "I didn't understand…" line (REQ-6.15). Several per question; write them after the solution. A tip explains an idea or a method, and never gives the answer. Not allowed in exams. |

**Formulas in text** (Gil, D-53): don't mix Hebrew and math on one line. When text needs a formula, write it on a line of its own. Keep units out of the formula line: write the result with its unit in a Hebrew sentence after it, for example `כלומר 18.84 ס"מ.` (The lesson player also does this by itself for formulas found inside a Hebrew sentence.)

## Course files

A course is written as a **course file** (REQ-4.10), in the `courses` folder, for example `courses/circles-demo.md`. It lists the course's teaching lessons in order, each with its practice lessons (zero or more), by the names of their lesson folders:

```
---
title: גאומטריה לכיתה ז'
language: he
subject: מתמטיקה
grade: 7
creator: <name>
licence: CC BY-SA 4.0
---

1. [TEACHING] circles-teaching
   - [PRACTICE] circles-practice
   - [PRACTICE] circles-practice-2
2. [TEACHING] triangles-teaching
3. [TEACHING] triangle-area-teaching
   - [PRACTICE] triangle-area-practice
4. [EXAM] circles-and-triangles-exam
```

An exam is listed as its own numbered line, as in line 4. Each listed lesson must exist as its own lesson folder, with `type: teaching lesson`, `type: practice lesson` or `type: exam` at the top. The teacher chooses the course order (one after another, paired or any order) when assigning the course (REQ-5.8), so it is not written in the file.

## Exams

A lesson with `type: exam` follows the exam rules (REQ-4.26): one attempt per question, the same questions for every student, no `[EXTRA]` questions, no `Hint`, no `Tip` and no `### Check-again question`. A `- Solution:` line may be written; students see it only after the teacher releases the results. Levels don't apply in exams, so `[LEVEL]` tags may be left out.

## Notes and comments

- `> 🟦 Claude:` a question or suggestion from Claude for Gil
- `> 🟨 Gil:` (or the teacher's name) notes or answers from Gil or the teacher who wrote the lesson. Write them anywhere; Claude reads them all.
- `[NEW: suggested by Claude]` on a block means Claude added it and Gil hasn't approved it yet. Delete the tag to approve, or delete the block to reject.

Gil can edit the file directly in any text editor, or ask Claude to make changes.

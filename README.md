# Evolora

**Evolora is open teaching software. Teachers use it to give lessons and manage their classes; students use it to learn on their own, each at their own pace.**

A lesson in Evolora is made of material (text, images, formulas, video, audio, simulations) and questions the student answers to move on. Students get help when they need it, and teachers see exactly where each student stands.

## Key ideas

- **Each student progresses at their own pace.** Slower students get more practice. Fast and strong students go further and deeper.
- **Every student masters the core.** Every core (level 1) question is either answered correctly by each student or flagged to the teacher, who makes sure the student understands.
- **Help before the answer.** A wrong answer first gets a hint and a second attempt. Then comes a worked solution and a "check again" question that shows whether the student really understood.
- **Open and shared, like Wikipedia.** Any teacher can use any lesson, and the creator's name always stays attached to their work.

## What it does today

**For students**
- Classes, courses and lessons, with a clear "to do" list and due dates.
- Questions of several kinds:
  - multiple choice;
  - numbers;
  - written open answers;
  - recorded spoken answers;
  - drag-and-drop on an image.
- Hints, solutions, help tips and check-again questions.
- Exams with a time window.
- Messages to the teacher.
- Works in Hebrew, Arabic and English, right to left where needed.

**For teachers**
- A home page and a class dashboard showing every student's progress.
- Red flags for students who need help.
- A grading page for open and recorded answers, with marked-up corrections and recorded comments.
- Sending a lesson back for corrections.
- Student levels, so each student gets questions that fit them.
- Co-teachers from the same school.
- Grades downloadable for the school's grade system.

**Coming later**
- A lesson editor inside Evolora (today, lessons are written as text files).
- AI help for students.
- AI-assisted grading of open answers.
- Importing lessons from documents.

## Status

Evolora is in its first version, getting ready for a pilot with 5 teachers and about 120 seventh-grade students. Students and teachers sign in with their school Google accounts, mostly on Chromebooks.

## Licences

- The software is open source under **AGPL-3.0**.
- Lessons are shared under **CC BY-SA 4.0**, the Wikipedia licence.

## How the project is organised

The documents in [`docs`](docs) are the single source of truth. The code follows them.

| Where | What |
|---|---|
| [`docs/requirements.md`](docs/requirements.md) | What Evolora must do: numbered requirements, each with acceptance criteria |
| [`docs/system-design.md`](docs/system-design.md) | How it is built, in plain language |
| [`docs/roadmap.md`](docs/roadmap.md) | What goes into each version |
| [`docs/decisions.md`](docs/decisions.md) | Every significant decision, with the options considered and the reasons |
| [`docs/glossary.md`](docs/glossary.md) | The agreed meaning of the terms we use |
| [`lessons`](lessons) | The lessons, written as text files ([format](lessons/README.md)), and the [kit for teachers](lessons/teacher-kit) who write lessons with Claude Code |
| [`web`](web) | The website students and teachers use |
| [`functions`](functions) | The server side: checking answers, grading, classes |
| [`firebase`](firebase) | Database and file-storage access rules |
| [`tools`](tools) | Programs for loading lessons, administration and tests ([details](tools/README.md)) |

Evolora runs on Google Firebase. It was designed with its product owner and is built and maintained with [Claude Code](https://claude.com/claude-code).

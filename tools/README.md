# Tools

Small programs Claude runs while working on Evolora. Gil doesn't need to run them.

| Tool | What it does | Requirement |
|---|---|---|
| `check-lesson.mjs` | Checks a lesson file before it is loaded: the lesson details and the folder name (always numbered from 1, D-81), that every block is a known type, image files and sources (also pictures inside questions, with a warning for a picture written right after a question, D-82), video sources, question answers, hints, solutions, check-again questions, levels, exam rules, and that every topic has enough questions. It lists errors (the lesson can't be loaded) and warnings (worth fixing). | REQ-4.24 |
| `load.mjs` | The loading program: runs the lesson check, then loads lessons and courses into a site. A course brings its lessons with it. An unchanged lesson is skipped; a changed one is saved as a new version. | REQ-4.24, 4.10 |
| `admin.mjs` | System admin tasks (D-47): make someone a teacher or system admin (and put teachers in a school, D-69), take the role away, list everyone with their role, add schools and list them, give a course to a whole class. | REQ-2.1, 2.2, 5.7 |
| `load-terms.mjs` | Checks the terms of use and the accessibility statement in the `terms` folder (Hebrew, Arabic and English, same version) and puts them on the test site. With `--agree-test-users`, marks every test user except Test Student 7 as agreed to that version (D-75). | REQ-10.8 |
| `test-terms.mjs` | End-to-end test of the terms of use: anyone can read them, nobody can fake agreeing, agreeing is saved, and a new version needs agreeing again. | REQ-10.8 |
| `test-corrections.mjs` | End-to-end test of correcting an open answer that was sent back: the last answer kept with its marks and comment, the new answer sent once, both on the grading page, and each sending back counted. | REQ-5.14, D-77 |
| `test-time.mjs` | End-to-end test of time on lessons and time away (counting, limits, "away a lot", the red flag, the class number) and of the class language. | REQ-5.33, 9.5 |
| `test-sent-back.mjs` | End-to-end test of the sent-back count: per lesson, per course, and the warning at the default number and at a number the teacher changes. | REQ-5.34 |
| `fill-student-5.mjs` | Test Student 5 finishes the Archimedes and circles teaching lessons with random answers (right first time, on the 2nd attempt, or wrong), through the checking service, so written and audio answers wait for grading. The reset runs it too. | REQ-12.6 |
| `test-student-5.mjs` | End-to-end test of Test Student 5's ready-made work: both lessons finished, answers waiting for the teacher, different after each filling. | REQ-12.6 |
| `set-teacher-passwords.mjs` | Gives the test teachers their own password (kept on this computer, never on GitHub), so the students-only test address can't be used to sign in as a teacher. Then rebuild and publish the test site. | REQ-12.8, D-71 |
| `reset-test-site.mjs` | Fills or resets the test site with the standard test data: test users, the test class with its class code, the demo lessons, and the demo courses given to the whole class. It prints the test class code. Test site only. | REQ-12.6 |
| `test-checking.mjs` | End-to-end test of the checking service: answers real questions as test students (right, wrong, check-again, numbers, letters) and checks the scores and red flags. | REQ-4.16, 4.17, 4.22, 6.3 |
| `test-classes.mjs` | End-to-end test of classes: a teacher creates a class; students join with a good code, a mistyped code, a code of no class, a closed class and a new code; 10 wrong codes mean a wait; lessons given to the whole class and to one student; a student who joins later; finishing a lesson; removing a student while keeping their work. Cleans up after itself. | REQ-5.1, 5.2, 5.4, 5.6, 5.7, D-55 |
| `test-following.mjs` | End-to-end test of following a class: teacher home counts and To do list, the class dashboard and progress map, levels, grading an open answer with a comment, clearing a red flag with a note, opening a lesson early for 2 students, and the CSV file. Cleans up after itself. | REQ-5.27, 5.10, 5.24, 5.19, 5.20, 5.12, 5.13, 5.11 |
| `test-priority2.mjs` | End-to-end test of priority 2 features: grades shown or hidden per assignment, the "not yet mastered" list and clearing its flag, teacher notes (and that students can't read them), changing any score, sending back for corrections and for review, and "I've read the comments". Cleans up after itself. | REQ-5.22, 5.15, 5.14, 5.25, 5.28 |
| `test-due-dates.mjs` | End-to-end test of due dates: the yellow "late" status, 10 points off a lesson finished late, extending the date for one student, removing it, and that course order and due date settings reach the student. Cleans up after itself. | REQ-5.8, 5.9 |
| `test-levels.mjs` | End-to-end test of question levels (level 1, 2 and 3 students get the right questions; a higher question is refused; changing a level) and of a teacher trying a lesson (hint and second attempt, Show answer, nothing saved, students can't use it). Cleans up after itself. | REQ-4.18, 5.18, 6.10, 5.32 |
| `test-priority3.mjs` | End-to-end test of co-teachers (adding by email, "last change counts"), archiving a course, and a teacher changing a student's language. Cleans up after itself. | REQ-5.5, 5.21, 9.6 |
| `test-messages.mjs` | End-to-end test of messages: a student writes, both teachers of the class read and reply, the unread notices, and that other students, other teachers and people outside the class can't read or write. Cleans up after itself. | REQ-5.16, 10.2, 5.27 |
| `test-redo.mjs` | End-to-end test of redoing a lesson, with "redo counts" on (a worse redo lowers the grade) and off (the grade stays). Cleans up after itself. | REQ-6.5, 5.9 |
| `test-versions.mjs` | End-to-end test of lesson versions: a student who started keeps their version; a student who starts after a change gets the new one. Adds a changed version for a moment and puts the lesson back. | REQ-4.7 |
| `test-exams.mjs` | End-to-end test of exams with the demo exam: saving and changing answers, no lesson-style answers, submitting, results hidden until released, the same questions for every level, opening early, red flags, the time window closing and submitting by itself, and allowing a retake. Takes about a minute (it waits for a window to end). Cleans up after itself. | REQ-4.26, 5.23 |
| `test-audio.mjs` | End-to-end test of recorded answers and audio comments: saving into the student's own folder only, sound files only, size limit, sending, who can listen, and the teacher's recorded comment. Cleans up after itself. | REQ-6.6, 5.13 |
| `test-blanks.mjs` | End-to-end test of fill-in-the-blanks questions: nothing secret reaches students, forgiving typed checking, marks and locking, attempts, the red flag, and credit per blank in exams. Uses its own test-only lesson (`fixtures/blanks-test-teaching-1`), loaded and removed by the test. | REQ-4.30, D-78 |
| `test-removals.mjs` | End-to-end test of removing questions for a class: removed questions are hidden and refused, answers stop counting and count again when brought back, topic minimums drop, replacement questions, finishing a lesson, exams lock once started, other teachers and students can't change or read it. Uses its own test-only lessons (`fixtures/removal-test-*`), loaded and removed by the test. | REQ-5.36, D-92 |
| `test-comments.mjs` | End-to-end test of teachers' comments on lessons: sending, the admin's inbox and marks, the teacher seeing the mark, and that students and other teachers can't read or change comments; no email while the email service is off. Removes its own comments. Needs Test Admin. | REQ-4.27, D-93 |
| `test-drag.mjs` | End-to-end test of drag-and-drop questions: what students can read holds no answers, every place needs a card, attempts by the number of cards, right cards marked and locked, the hint, grades of full, half and a quarter, the red flag when every attempt fails, and a teacher trying it. | REQ-4.12, D-70 |
| `lib/screen-test-data.mjs` | Used by the screen tests: puts only the test data they use into a known state, and puts the test users' languages and class settings back afterwards (D-80). | system-design 8.1 |
| `test-permissions.mjs` | Automatic permission tests: signs in as test users and checks that what must be blocked is blocked (for example, a student reading the correct answers). | REQ-3.4, 10.1, 10.3 |

`check-lesson.mjs` also checks course files (`courses/<name>.md`): every listed lesson must exist, have the matching type (teaching, practice or exam), and pass the lesson check.

```
node tools/check-lesson.mjs lessons/circles-teaching-1
node tools/check-lesson.mjs courses/circles-demo.md

node tools/load.mjs courses/circles-demo.md               (loads the course and its lessons into the test site)
node tools/load.mjs --skip-images lessons/circles-teaching-1 (only while file storage isn't switched on)

node tools/admin.mjs add-school ort-rehovot "Ort Rehovot"
node tools/admin.mjs add-teacher someone@gmail.com "Name" --school ort-rehovot
node tools/admin.mjs set-school someone@gmail.com ort-rehovot
node tools/admin.mjs schools
node tools/admin.mjs remove-teacher someone@gmail.com
node tools/admin.mjs people
node tools/admin.mjs open circles-demo test-class

node tools/reset-test-site.mjs
node tools/test-permissions.mjs
node tools/test-checking.mjs
node tools/test-classes.mjs
node tools/test-following.mjs
node tools/test-priority2.mjs
node tools/test-due-dates.mjs
node tools/test-levels.mjs
node tools/test-priority3.mjs
node tools/test-messages.mjs
node tools/test-redo.mjs
node tools/test-versions.mjs
node tools/test-exams.mjs
node tools/test-audio.mjs
node tools/test-drag.mjs
node tools/test-blanks.mjs
node tools/test-removals.mjs
node tools/test-comments.mjs
node tools/test-terms.mjs
node tools/test-sent-back.mjs
node tools/test-time.mjs
node tools/test-student-5.mjs
node tools/test-corrections.mjs
```

**Screen tests (system-design 8.1, D-80).** A robot opens a browser at a Chromebook size and goes through the main flows on the test site in Hebrew, Arabic and English, in Google Chrome, Microsoft Edge, Firefox and WebKit (Safari's engine) (REQ-11.1, D-84): a student going through the Archimedes lesson, the terms of use coming first, joining a class with its code, and a teacher grading an open answer. On every screen it checks for text in the wrong language, the page direction, console errors, sideways scrolling, statuses shown only by colour (REQ-9.1, 9.2, 11.1, 12.3) and accessibility: WCAG 2.0 A and AA with axe-core, text of at least 15 pixels, the page at 200%, and the keyboard (REQ-12.9). They live in `tests/screens` (run `npm install` and `npx playwright-core install firefox webkit` there once; Chrome and Edge must be installed on this computer). The report with screenshots is `tests/screens/out/report.html`. A run in all four browsers takes about an hour.

```
cd tests/screens
npm test                      (all four browsers, all three languages)
npm test -- en                (one language)
npm test -- firefox webkit    (some browsers: chrome, edge, firefox, webkit)
npm test -- --show            (watch the robot in a browser window)
npm run browsers              (browser tests: recording and playing audio in every browser,
                               formulas, time on lessons, automatic sign-out; REQ-11.1, 3.5)
```

The checking service itself is in the `functions` folder (system-design 5). Its scoring rules have their own tests: `npm test` in that folder. It is put on the test site with `firebase deploy --only functions --project evolora-test`.

All of these work on the test site (`--site test`, the default). The real site isn't set up yet; loading into it needs Gil's approval first (REQ-4.24).

The programs other than the lesson check need the Firebase library: run `npm install` in this folder once. They sign in with the loading program's own account (D-52). Its password is made the first time and kept on this computer only, in `%USERPROFILE%\.evolora\`.

When a teacher sends a lesson (REQ-4.25), Claude runs the check first and tells Gil what, if anything, needs fixing. Whenever the lesson file format changes, the check is updated together with `lessons/README.md`, the teacher kit (working rule 6 in `CLAUDE.md`) and the lesson reader in `tools/lib/lesson-parser.mjs`.

**Publishing the test site (REQ-12.8, D-71).** In the `web` folder, run `npm run build:test` (with the test teachers' password from `%USERPROFILE%.evoloraevolora-test-teachers.json`), then `firebase deploy --only hosting:full,functions,firestore:rules --project evolora-test`. The students-only address (evolora-test-students.web.app) is closed at Gil's request: never publish the "students" target or a bare `--only hosting`, because that would open it again.

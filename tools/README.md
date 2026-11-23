# Tools

Small programs Claude runs while working on Evolora. Gil doesn't need to run them.

| Tool | What it does | Requirement |
|---|---|---|
| `check-lesson.mjs` | Checks a lesson file before it is loaded: the lesson details, that every block is a known type, image files and sources, video sources, question answers, hints, solutions, check-again questions, levels, exam rules, and that every topic has enough questions. It lists errors (the lesson can't be loaded) and warnings (worth fixing). | REQ-4.24 |
| `load.mjs` | The loading program: runs the lesson check, then loads lessons and courses into a site. A course brings its lessons with it. An unchanged lesson is skipped; a changed one is saved as a new version. | REQ-4.24, 4.10 |
| `admin.mjs` | System admin tasks (D-47): make someone a teacher or system admin, take the role away, list everyone with their role, give a course to a whole class. | REQ-2.1, 2.2, 5.7 |
| `reset-test-site.mjs` | Fills or resets the test site with the standard test data: test users, the test class with its class code, the demo lessons, and the demo courses given to the whole class. It prints the test class code. Test site only. | REQ-12.6 |
| `test-checking.mjs` | End-to-end test of the checking service: answers real questions as test students (right, wrong, check-again, numbers, letters) and checks the scores and red flags. | REQ-4.16, 4.17, 4.22, 6.3 |
| `test-classes.mjs` | End-to-end test of classes: a teacher creates a class; students join with a good code, a mistyped code, a code of no class, a closed class and a new code; 10 wrong codes mean a wait; lessons given to the whole class and to one student; a student who joins later; finishing a lesson; removing a student while keeping their work. Cleans up after itself. | REQ-5.1, 5.2, 5.4, 5.6, 5.7, D-55 |
| `test-permissions.mjs` | Automatic permission tests: signs in as test users and checks that what must be blocked is blocked (for example, a student reading the correct answers). | REQ-3.4, 10.1, 10.3 |

`check-lesson.mjs` also checks course files (`courses/<name>.md`): every listed lesson must exist, have the matching type (teaching, practice or exam), and pass the lesson check.

```
node tools/check-lesson.mjs lessons/circles-teaching
node tools/check-lesson.mjs courses/circles-demo.md

node tools/load.mjs courses/circles-demo.md               (loads the course and its lessons into the test site)
node tools/load.mjs --skip-images lessons/circles-teaching (only while file storage isn't switched on)

node tools/admin.mjs add-teacher someone@gmail.com "Name"
node tools/admin.mjs remove-teacher someone@gmail.com
node tools/admin.mjs people
node tools/admin.mjs open circles-demo test-class

node tools/reset-test-site.mjs
node tools/test-permissions.mjs
node tools/test-checking.mjs
node tools/test-classes.mjs
```

The checking service itself is in the `functions` folder (system-design 5). Its scoring rules have their own tests: `npm test` in that folder. It is put on the test site with `firebase deploy --only functions --project evolora-test`.

All of these work on the test site (`--site test`, the default). The real site isn't set up yet; loading into it needs Gil's approval first (REQ-4.24).

The programs other than the lesson check need the Firebase library: run `npm install` in this folder once. They sign in with the loading program's own account (D-52). Its password is made the first time and kept on this computer only, in `%USERPROFILE%\.evolora\`.

When a teacher sends a lesson (REQ-4.25), Claude runs the check first and tells Gil what, if anything, needs fixing. Whenever the lesson file format changes, the check is updated together with `lessons/README.md`, the teacher kit (working rule 6 in `CLAUDE.md`) and the lesson reader in `tools/lib/lesson-parser.mjs`.

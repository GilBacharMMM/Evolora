# Tools

Small programs Claude runs while working on Evolora. Gil doesn't need to run them.

| Tool | What it does | Requirement |
|---|---|---|
| `check-lesson.mjs` | Checks a lesson file before it is loaded: the lesson details, that every block is a known type, image files and sources, video sources, question answers, hints, solutions, check-again questions, levels, exam rules, and that every topic has enough questions. It lists errors (the lesson can't be loaded) and warnings (worth fixing). | REQ-4.24 |

Run it on a lesson folder:

```
node tools/check-lesson.mjs lessons/circles-pi
```

When a teacher sends a lesson (REQ-4.25), Claude runs this check first and tells Gil what, if anything, needs fixing. Whenever the lesson file format changes, this check is updated together with `lessons/README.md` and the teacher kit (working rule 6 in `CLAUDE.md`).

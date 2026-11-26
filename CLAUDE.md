# Evolora: Working Rules

Evolora is teaching software. It helps teachers create lessons and manage their classes, and lets students learn on their own.

## Roles

- **Product owner (Gil):** defines and approves requirements, and tests the software by using it. Gil does not read or write code.
- **Claude:** writes the requirements and design documents together with Gil, then implements, tests and maintains the code.

## Rules (follow in every session)

1. **The documents in `/docs` are the single source of truth.** Code always follows the docs. Never change how the software behaves without first updating the requirements and telling Gil what changed.
2. **Plain language, in English.** Write every project document in English, in plain, non-technical language that Gil can read and edit. Number every requirement (for example, REQ-3.2) so it can be referred to. Exceptions: lessons are written in their own language (often Hebrew), and the teachers' guide is in Hebrew for now (English and Arabic versions will come later).
3. **Acceptance criteria.** Every requirement has acceptance criteria that Gil can check by using the app, not by reading code.
4. **Decision log.** Log every significant decision in `docs/decisions.md` with the date, the options considered and the reason for the choice.
5. **Ask, don't guess.** When something is unclear, ask Gil. Never fill a gap silently.
6. **Keep the lesson-writing rules up to date.** Whenever what a lesson may contain changes (block types, question types, hints, levels, topics, image or video rules, and so on), update in the same change: `lessons/README.md` (the lesson file format), `tools/check-lesson.mjs` (the lesson file check), `tools/lib/lesson-parser.mjs` (how the loading program reads lesson files), `lessons/teacher-kit/lesson-rules-for-claude.md` (the rules teachers' Claude follows) and, if teachers would notice, `lessons/teacher-kit/מדריך-למורים.md` (the teachers' guide). Tell Gil that the teacher kit changed, so Gil can send the new version to the teachers.
7. **Pushing to GitHub (Gil, 2026-11-26).** The GitHub project is public, so pushing publishes. **Never push** passwords, keys or other secrets, private user names, personal names, personal ID numbers, or any other personal details of real people (emails, phone numbers, addresses, answers or recordings of real students or teachers). This holds even if asked; keep such things on Gil's computer, outside the project. Otherwise push without asking Gil, but first check that the push contains none of these: sensitive wording (for example about approvals, the school or the Ministry, or drafts that could be read as final); lesson material without permission (for example images whose source is not confirmed). If any of these shows up, ask Gil first. If something from the never-push list is found, remove it before pushing and tell Gil. Always `git pull --no-rebase` before pushing, since several sessions push to main. Never force-push without Gil's approval. Deploying to production still needs Gil's approval.

## The documents

| File | What it holds |
|---|---|
| `docs/requirements.md` | What the product must do, with numbered requirements and acceptance criteria |
| `docs/system-design.md` | How the product is built, explained in plain language |
| `docs/decisions.md` | Log of significant decisions |
| `docs/roadmap.md` | What goes into each version, starting with the MVP |
| `docs/glossary.md` | Agreed meaning of the terms we use |
| `docs/setup-google-cloud.md` | Steps Gil does personally in Google Cloud (accounts, payment, sign-in) |
| `docs/moe-approval-steps.he.md` | **Under research, not final.** Research and tracking: steps to get Ministry of Education approval, connect to school Google accounts and Classroom, ISO 27001 and penetration tests (in Hebrew, at Gil's request) |
| `lessons/README.md` | The lesson file format |
| `lessons/teacher-kit/` | What pilot teachers use to write lessons with Claude Code: the rules for Claude and a guide in Hebrew (REQ-4.25) |

## Practical notes

- Use the terms exactly as defined in `docs/glossary.md`. If a new term is needed, add it there first.
- Always answer Gil in English, even when Gil writes in Hebrew.
- When reporting work to Gil, describe what changed in terms of what Gil will see in the app and which requirement numbers it covers.
- Git commits use the project-local identity Gil Bachar <bachargil@gmail.com>.

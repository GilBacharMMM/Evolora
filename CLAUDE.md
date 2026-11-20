# Evolora: Working Rules

Evolora is teaching software. It helps teachers create lessons and manage their classes, and lets students learn on their own.

## Roles

- **Product owner (Gil):** defines and approves requirements, and tests the software by using it. Gil does not read or write code.
- **Claude:** writes the requirements and design documents together with Gil, then implements, tests and maintains the code.

## Rules (follow in every session)

1. **The documents in `/docs` are the single source of truth.** Code always follows the docs. Never change how the software behaves without first updating the requirements and telling Gil what changed.
2. **Plain language.** Write every document in plain, non-technical language that Gil can read and edit. Number every requirement (for example, REQ-3.2) so it can be referred to.
3. **Acceptance criteria.** Every requirement has acceptance criteria that Gil can check by using the app, not by reading code.
4. **Decision log.** Log every significant decision in `docs/decisions.md` with the date, the options considered and the reason for the choice.
5. **Ask, don't guess.** When something is unclear, ask Gil. Never fill a gap silently.

## The documents

| File | What it holds |
|---|---|
| `docs/requirements.md` | What the product must do, with numbered requirements and acceptance criteria |
| `docs/system-design.md` | How the product is built, explained in plain language |
| `docs/decisions.md` | Log of significant decisions |
| `docs/roadmap.md` | What goes into each version, starting with the MVP |
| `docs/glossary.md` | Agreed meaning of the terms we use |
| `docs/setup-google-cloud.md` | Steps Gil does personally in Google Cloud (accounts, payment, sign-in) |

## Practical notes

- Use the terms exactly as defined in `docs/glossary.md`. If a new term is needed, add it there first.
- When reporting work to Gil, describe what changed in terms of what Gil will see in the app and which requirement numbers it covers.
- Git commits use the project-local identity Gil Bachar <bachargil@gmail.com>.

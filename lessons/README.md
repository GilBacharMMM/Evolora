# Lesson files

Each folder here holds one lesson in **lesson file** form: a plain-text version of the lesson, block by block, that Gil and Claude edit together before the lesson goes into Evolora. Later, Claude loads these files into the test site (REQ-12.6) and the real site.

## How a lesson file is written

The top of the file has the lesson details (title, language, subject, grade, creator, licence, type: learning lesson or practice lesson, REQ-4.20, and the default minimum questions per topic, REQ-4.21).

A heading like `# [TOPIC 2: name]` starts a new topic (REQ-4.21). Every block after it, until the next topic, belongs to that topic.

Each block starts with a heading in square brackets, matching the block types in REQ-4.2:

| Heading | Block |
|---|---|
| `[TEXT]` | Text |
| `[NOTE BOX]` | Highlighted side note |
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
| `- Hint:` | Shown after the 1st wrong answer (REQ-4.16) |
| `- Solution:` | The full worked solution, shown after the 2nd wrong answer (REQ-4.16) |
| `### Check-again question` | A similar question under the main one, asked right after the solution (REQ-4.17). Several can be added; each student gets one at random. Choices are shown in random order (REQ-4.19), so the order in the file doesn't matter. |

## Notes and comments

- `> 🟦 Claude:` a question or suggestion from Claude for Gil
- `> 🟨 Gil:` Gil's notes or answers. Write them anywhere; Claude reads them all.
- `[NEW: suggested by Claude]` on a block means Claude added it and Gil hasn't approved it yet. Delete the tag to approve, or delete the block to reject.

Gil can edit the file directly in any text editor, or ask Claude to make changes.

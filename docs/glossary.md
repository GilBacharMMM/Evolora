# Evolora: Glossary

These are the terms we use in all documents and in the app. When a term is used, it means exactly what is written here. Terms marked **proposed** are suggestions that still need Gil's approval.

## People and roles

| Term | Meaning | Status |
|---|---|---|
| **Creator** | A person who creates and edits lessons and courses. A teacher can also be a creator. In Hebrew: יוצר/ת שיעורים. | agreed |
| **Teacher** | A person who runs one or more classes: decides which lessons each student gets, follows progress, and checks and comments on students' work. | proposed |
| **Student** | A person who learns: reads the material, watches and listens to media, and answers questions. Gets lessons from a teacher, or enrolls in a public course alone. | proposed |
| **System admin** | A person who manages Evolora itself, including registering teachers. | proposed |

## Content

| Term | Meaning | Status |
|---|---|---|
| **Lesson** | A single unit of learning made by a creator. It contains material (text, images, graphs, math formulas, video, audio, simulations) and questions. A lesson is either a teaching lesson or a practice lesson. | proposed |
| **Trying a lesson** | A teacher going through a lesson as a student would, with extra Skip and Show answer buttons, without anything being recorded (REQ-5.32). Not the same as a creator's preview (REQ-4.6). | agreed |
| **Why it's right** | A short explanation the creator writes for a question, shown to the student after a correct answer (REQ-4.28). | agreed |
| **Suggestions inbox** | The place in Evolora where a creator sees the comments teachers sent about their lessons (REQ-4.27). | agreed |
| **Topic** | A part of a lesson about one subject (for example, "the area of a circle"), with a minimum number of questions every student must answer before moving on. The creator sets a default minimum; the teacher can change it when assigning. In Hebrew: נושא. | proposed |
| **Extra practice question** | A question in a topic that is asked only to students who haven't yet answered the topic's minimum number of questions correctly. In Hebrew: שאלת תרגול נוספת. | agreed |
| **Help tip** | A short explanation written in the lesson file for a question, with a title the student can choose ("What is a radius?"). Shown from the help line before AI is ready. It never gives the answer. In Hebrew: טיפ עזרה. | proposed |
| **Exam time window** | The date and times when an exam can be taken. In Hebrew: חלון זמן למבחן. | proposed |
| **Exam lock** | During an exam's time window, only the exam can be opened: in the class, or in all of Evolora. Together with the school's Google Admin, which allows only Evolora's address on the Chromebooks. In Hebrew: נעילה בזמן מבחן. | proposed |
| **Exam timer** | A clock in the exam showing the time left until its window ends, with a notice 5 minutes before the end. The teacher can turn it on or off. In Hebrew: שעון מבחן. | proposed |
| **Solved example** | A question shown with its full answer, for the student to learn from, with nothing to answer. In Hebrew: דוגמה פתורה. | proposed |
| **Type-a-number question** | A question where the student types a number, checked automatically; correct to one digit after the decimal point is enough. In Hebrew: שאלה עם תשובה מספרית. | proposed |
| **Teaching lesson** | A lesson that teaches new material. In Hebrew: שיעור הקניה. (Earlier called "learning lesson".) | agreed |
| **Practice lesson** | A lesson with questions only, on material already learned. No new material. In Hebrew: שיעור תרגול. (Details in OPEN Q-23.) | proposed |
| **Exam** | A lesson with questions only and exam rules: one attempt per question, no hints, solutions or extra questions, and the same questions for every student. In Hebrew: מבחן. | proposed |
| **Material** | The learning content inside a lesson that the student reads, watches or listens to. | proposed |
| **Simulation** | An interactive element inside a lesson: either a link or embed of an outside website, or one built into Evolora. | proposed |
| **Question** | Something the student must answer inside a lesson, usually before they can continue. | proposed |
| **Course** | An ordered list of teaching lessons, each with zero or more practice lessons paired with it. Usually one per semester. A course is either *public* or *private*. In stage 1, written as a course file. | proposed |
| **Course file** | A plain-text list of a course's lessons, in order, with each teaching lesson's practice lessons. In the `courses` folder. In Hebrew: קובץ קורס. | proposed |
| **Course order** | How a course's lessons open for a student, chosen by the teacher when assigning: **one after another** (each lesson opens when the previous one is finished), **paired** (teaching lessons in order; practice lessons of finished teaching lessons open in any order; recommended), or **any order** (all open; not recommended). In Hebrew: סדר הקורס. | proposed |
| **Archived course** | A course the teacher has put away, for example at the end of a semester. Students can still read its lessons. In Hebrew: קורס בארכיון. | proposed |
| **Public course** | A course that any student can find and enroll in, even without a teacher. Students who learn this way get no teacher feedback. | proposed |
| **Private course** | An unlisted course: it isn't shown in the course library, and only classes it is assigned to can use it. Its lessons are still open to everyone. | agreed |
| **Licence** | The terms for reusing content. Lessons use CC BY-SA 4.0 (reuse and change freely, credit the creator, share alike); code uses AGPL-3.0. | agreed |
| **Note box** | A highlighted box inside a lesson for side notes, such as "Historical note". | proposed |
| **Lesson library** | The searchable collection of all lessons in Evolora. Every lesson is open: any teacher can use it, and any creator can copy and change it. | proposed |
| **Copy (of a lesson)** | A new lesson made from an existing one, edited by a new creator. It credits both the new and the original creator. | proposed |
| **Attribution** | Showing the creator's name on their lessons, including on copies. | proposed |
| **Subject / grade level** | Tags on each lesson, such as "Science" and "Grade 7". Grades 7 to 12 are supported. | proposed |
| **Edit mode** | A mode any teacher (or creator) can switch on to create and edit lessons and courses. Stage 2. | proposed |
| **Lesson version** | A saved state of a lesson. When a creator changes a lesson, students who already started it finish the version they started; new students get the new version. | proposed |
| **Drag-and-drop question** | A question where the student drags items from a bank of snippets onto an image, like a puzzle. | proposed |
| **Lesson builder** | The screen where a creator builds and edits a lesson, block by block. Stage 2. | proposed |
| **Image source** | Where an image comes from: own work, AI-generated, or another source (with author, link and licence). Shown to students under each image. | agreed |
| **Lesson file** | A plain-text version of a lesson, block by block, that Gil and Claude edit together before the lesson goes into Evolora. Stored in the `lessons` folder. In stage 1 this is the only way to make a lesson. | agreed |
| **Lesson-writing kit** | What pilot teachers use to write lessons with Claude Code: rules for Claude and a guide for teachers in Hebrew. In `lessons/teacher-kit`. In Hebrew: ערכת כתיבת שיעורים. | proposed |
| **Loading (a lesson)** | Claude checking a lesson file and putting it into Evolora: first the test site, then the real site after Gil approves. In Hebrew: טעינת שיעור. | proposed |
| **Import** | Bringing an existing lesson into Evolora from a Google Doc or Word document. | proposed |

## Classes and work

| Term | Meaning | Status |
|---|---|---|
| **Class** | A group of students run by a teacher. | proposed |
| **Class list (roster)** | The list of students who belong to a class. | proposed |
| **Class card** | A box on the student's home page for one class, with its name, teacher and colour. In Hebrew: כרטיס כיתה. | proposed |
| **To do list** | The list on the student's home page of lessons waiting in all their classes, nearest due date first, and their pending notes. In Hebrew: רשימת משימות. | proposed |
| **Open classroom** | (Stage 2) The card on a student's home page that holds all the open courses they joined on their own, without a teacher. In Hebrew: כיתה פתוחה. | proposed |
| **Design language** | The shared look of all screens: colours, fonts, icons, spacing, buttons and cards. In Hebrew: שפה עיצובית. | proposed |
| **Class code** | A unique code a teacher shares so students can join a class, as in Google Classroom. | proposed |
| **Check character** | The last character of a class code, worked out from the other six. If one character is typed wrong, it doesn't fit, and the student sees "check the code" (REQ-5.2). In Hebrew: תו בדיקה. | proposed |
| **Joining on / off** | Whether a class accepts new students with its class code. The teacher turns it off, for example once everyone has joined (REQ-5.2). In Hebrew: הצטרפות פתוחה / סגורה. | proposed |
| **Finished lesson** | A lesson where every question the student received has been answered. Open answers count once sent; skipped extra practice questions count as done (D-55). In Hebrew: שיעור שהסתיים. | proposed |
| **Lesson status** | How a lesson appears to a student in a course or class: **open** (can be started or continued), **done** (finished), or **locked** (opens later; title greyed out). Always shown with an icon and a word (REQ-6.12). In Hebrew: פתוח, הושלם, נעול. | proposed |
| **Waiting lessons** | Single lessons a teacher gave outside a course, which the student hasn't finished yet. A section of the student's class page (REQ-6.11). In Hebrew: שיעורים ממתינים. | proposed |
| **Class dashboard** | The teacher's table of a class, a row per student, with status, level, where they are in each course, average grade, open red flags and when they last worked (REQ-5.10). In Hebrew: לוח הכיתה. | proposed |
| **Progress map** | On the class dashboard, a square per lesson of a course for each student: filled when finished, striped for the lesson they're working on (REQ-5.24). In Hebrew: מפת התקדמות. | proposed |
| **Not yet mastered list** | On the student page, the level 1 questions a student got wrong (also on the check-again question), until the teacher clears their red flag (REQ-5.25). In Hebrew: עדיין לא נשלט. | proposed |
| **Changed by the teacher** | A score the teacher set by hand for an automatically checked question (REQ-5.15). The student sees it next to the marks. In Hebrew: שונה על ידי המורה. | proposed |
| **Opening early** | A teacher opening a lesson of a course for the whole class or chosen students before the lessons before it are finished (REQ-5.20). In Hebrew: פתיחה מוקדמת. | proposed |
| **Invite** | An email from a teacher that lets a student join a class. | proposed |
| **Enroll** | To join a class (with a class code or invite) or a public course. | proposed |
| **Assignment** | A lesson, a course, or a selection of lessons that a teacher gives to a whole class or to specific students. Its settings: the course order (one after another, paired, or any order), optional due date, whether a redo counts (the latest redo's grade replaces the old one), and who checks open answers. | proposed |
| **Answer** | What a student gives in response to a question. | proposed |
| **Comment** | Feedback a teacher adds to a student's answer, either written text or an audio recording. | proposed |
| **Send back for corrections** | A teacher returning a finished lesson, or just some of its questions, to a student to fix. The new answers are graded again. | proposed |
| **Send back for review** | A teacher returning comments that the student must read, but nothing needs fixing. | proposed |
| **Pending notes** | Comments the student has not yet gone over. While a student has pending notes, they cannot start a new lesson. | proposed |
| **Hint** | Short guidance, written in advance by the creator, that Evolora shows after the 1st wrong answer to a multiple choice question. It helps without giving the answer. In Hebrew: רמז. | agreed |
| **Full solution** | The question solved step by step, written by the creator. Shown after the 2nd wrong answer. In Hebrew: פתרון מלא. | agreed |
| **Check-again question** | A similar question (different numbers or materials) from a bank under a multiple choice question. Asked right after the full solution, to check the student now understands. For a calculation, a similar calculation; for an understanding question, the same question in other words with different answers. In Hebrew: שאלת בדיקה חוזרת. It has 2 attempts, like the original question. | agreed |
| **Question level** | How hard a question is: 1 (easiest) to 3 (hardest). Set by the creator. In Hebrew: רמת שאלה. | proposed |
| **Student level** | A secret level from 1 to 3 that a teacher gives each student in a class. Only the class's teachers see it. A student sees only questions at or below their level. Everyone starts at 2. In Hebrew: רמת תלמיד. | proposed |
| **Help line** | The line under every question: "I didn't understand ___, please explain." Later, AI answers it without revealing the answer, staying on the question's subject. In Hebrew: שורת עזרה. | proposed |
| **Grading instructions** | Guidance a creator writes for an open question, describing a good answer. Teachers, and later AI grading, use it. | proposed |
| **Pending grade** | The lesson grade shown while open answers are still waiting for the teacher to grade them. | proposed |
| **Grading page** | The teacher's page for grading open and audio answers, one answer at a time: the question and grading instructions on top, the student's answer, the AI suggestion (stage 2) and the teacher's grade and comment. Sideways moves between students, up and down between questions. Earlier called "review screen". In Hebrew: דף בדיקה. | agreed |
| **Marking up an answer** | Highlighting parts of a student's written answer, and editing it in the teacher's colour (crossed-out student words, teacher words in colour). The student sees it. In Hebrew: סימון בתשובה. | agreed |
| **Students see grades** | An assignment setting: whether students see their grades for it. By default no for teaching lessons, yes for practice lessons and exams. The teacher always sees grades. In Hebrew: הצגת ציונים לתלמידים. | proposed |
| **Grade weight** | How much a question counts toward the lesson grade. By default all questions count equally; the creator may change this. | proposed |
| **Due date** | An optional deadline a teacher sets on an assignment. After it, the teacher's choice applies: the grade drops by a set percentage, or the lesson is locked. The teacher can extend it. | proposed |
| **Co-teacher** | A second (or further) teacher added to a class, with exactly the same permissions. When teachers change the same thing, the last change wins. | proposed |
| **Student status** | A colour, with a word, on the class dashboard for each student: red (open red flag), orange (behind the class), soft yellow (past a due date), green (on track); plus a star for students ahead. | agreed |
| **Teacher notes** | Private notes a teacher writes about a student, seen only by the class's teachers. In Hebrew: הערות צוות. | proposed |
| **Student page** | The teacher's page about one student in one class: progress, grades, flags, level, messages and teacher notes. In Hebrew: דף תלמיד. | proposed |
| **Success rate** | For one question: how many students got it right on the 1st attempt, on the 2nd, or not at all. In Hebrew: אחוז הצלחה. | proposed |
| **Messages** | A simple private conversation between one student and one teacher, for questions and answers. | proposed |
| **Attempt** | One try at answering a question. Multiple choice and type-a-number questions have 2 attempts: after the 1st wrong one, a hint; after the 2nd, the full solution and a check-again question (REQ-4.16, REQ-6.3). In an exam, every question has 1 attempt (REQ-4.26). | agreed |
| **Mastery** | The goal that every student fully understands every lesson, not just completes it. In particular, every student masters every level 1 question: they answer it correctly, or they are flagged to the teacher until the teacher clears the flag (REQ-1.3). | proposed |
| **Individual progress** | A key principle of Evolora: each student moves at their own pace; slower students get more practice, stronger students go further and deeper (REQ-1.2). | agreed |
| **Red flag** | An alert the teacher receives when a student keeps failing a question or lesson: for example, a wrong answer to a check-again question, or (later) a help-line conversation that didn't lead to a correct answer. It stays until the teacher clears it (REQ-5.19). | proposed |
| **Grade dashboard** | The teacher's view of grades per class, course, lesson and question, including who completed and who did not. An uncompleted lesson counts as grade 0. | proposed |
| **Progress** | How far a student has got and how well they are doing, per lesson and per course. | proposed |

## General

| Term | Meaning | Status |
|---|---|---|
| **MVP** | Minimum viable product: the first version, with only what is essential. | agreed |
| **Stage 1 / Stage 2** | Stage 1 is the first working product (the MVP), with no AI. Stage 2 adds import from documents and AI features. | proposed |
| **Pilot** | The first real use of Evolora at Gil's school: 5 teachers, about 120 seventh-grade students. | proposed |
| **Test site** | A separate copy of Evolora with made-up data, where Gil checks new features before they go to the real site. | agreed |
| **Loading program** | The program Claude runs to put lesson files and course files into Evolora, after the lesson check (REQ-4.24). | proposed |
| **Staff list** | The list of email addresses that have the teacher or system admin role. Everyone else who signs in is a student (REQ-2.2). | proposed |
| **Test user** | A made-up person (for example, "Test Student 3") that exists only on the test site. | agreed |
| **Milestone A / B** | The two parts of the MVP: A puts a first lesson in front of real students; B completes the teacher tools. | proposed |
| **Class language** | The interface language a teacher sets for a class, either required for students or just a default they can change. | proposed |
| **Requirement (REQ)** | A numbered statement of what the product must do, with acceptance criteria. | agreed |
| **Acceptance criteria** | Checks the product owner can perform in the app to confirm a requirement is met. | agreed |
| **RTL / LTR** | Right-to-left (Hebrew, Arabic) and left-to-right (English) text and layout direction. | agreed |
| **Interface language** | The language of the app's menus and buttons. | proposed |
| **Lesson language** | The language a lesson's content is written in. | proposed |

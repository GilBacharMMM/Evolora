# Evolora: Requirements

**Status:** First draft, waiting for Gil's review
**Last updated:** 2026-11-20

## How to read this document

- Each requirement has a number, such as **REQ-5.2**. The first number is the section, the second is the requirement within it.
- Each requirement has **acceptance criteria**: checks you can do yourself in the app to confirm it works.
- Each requirement has a **priority**: **MVP** (must be in the first version) or **Later**.
- Open points are marked **OPEN Q-n** and collected in section 14.
- Terms are used as defined in [glossary.md](glossary.md).

---

## 1. Product overview

Evolora helps students learn on their own, guided by teachers. Creators build lessons made of material (text, images, formulas, video, audio, simulations) and questions that students must answer to move on. Teachers give lessons to their classes, follow progress, review answers and give feedback. Everything in Evolora, both the software and the lessons, is open and shared, in the spirit of Wikipedia.

The first users are 5 teachers and about 120 seventh-grade students at Gil's school, using Chromebooks and the school's Google accounts.

**REQ-1.1: Open and shared** (Priority: MVP)
Every lesson in Evolora can be used by any teacher and copied and edited by any creator. The creator's name always stays attached to their work. The software code is open source.

*Acceptance criteria:*
- [ ] Every lesson shows the name of its creator, and of the original creator if it is a copy.
- [ ] Every lesson shows that it is shared under an open licence (see OPEN Q-1).

---

## 2. Users and roles

**REQ-2.1: Four roles** (Priority: MVP)
Evolora has four roles: **system admin**, **teacher**, **creator** and **student**. One person can hold several roles; for example, a teacher who switches on edit mode is also a creator.

*Acceptance criteria:*
- [ ] A system admin can see which role each person has.
- [ ] A person with several roles can reach the features of all of them without signing in again.

**REQ-2.2: System admin registers teachers** (Priority: MVP)
Only a system admin can make someone a teacher. Anyone else who signs in is a student.

*Acceptance criteria:*
- [ ] The admin enters a teacher's email address; when that person signs in, they see the teacher features.
- [ ] A person not registered as a teacher signs in and sees only student features.
- [ ] The admin can remove the teacher role from someone.

**REQ-2.3: Edit mode for teachers** (Priority: MVP)
Any teacher can switch on edit mode to create and edit lessons and courses.

*Acceptance criteria:*
- [ ] A teacher can switch edit mode on and off.
- [ ] With edit mode on, the teacher sees the tools for creating and editing lessons.

**REQ-2.4: Creators who are not teachers** (Priority: Later)
A system admin can register a person as a creator only, for example someone from the Ministry of Education who writes lessons but does not run classes.

*Acceptance criteria:*
- [ ] A creator-only person can create and edit lessons but cannot create classes.

---

## 3. Accounts, sign-in and access

**REQ-3.1: Sign in with Google** (Priority: MVP)
People sign in with their Google account. There are no separate Evolora passwords.

*Acceptance criteria:*
- [ ] On a school Chromebook, clicking "Sign in with Google" takes you into Evolora with your school account.

**REQ-3.2: School accounts only during the pilot** (Priority: MVP)
During the pilot, only accounts ending in **@taded.org.il** can sign in.

*Acceptance criteria:*
- [ ] Signing in with a @taded.org.il account works.
- [ ] Signing in with any other Google account (for example, a personal Gmail) shows a clear message that access is limited to the school.

**REQ-3.3: Other sign-in methods** (Priority: Later)
Allow other accounts: any Google account (for example, for students taking public courses), and the Ministry of Education sign-in.

**REQ-3.4: People only see what they are allowed to** (Priority: MVP)
Each person sees only what their role and classes allow.

*Acceptance criteria:*
- [ ] A student cannot open any teacher screen, even by typing its web address.
- [ ] A teacher cannot see a class they do not teach.
- [ ] A student cannot see another student's answers, grades or messages.

---

## 4. Lesson creation (creators)

**REQ-4.1: Create a lesson** (Priority: MVP)
In edit mode, a creator creates a lesson with a title, a short description, a lesson language (Hebrew, Arabic or English), a subject and a grade level.

*Acceptance criteria:*
- [ ] A creator can create a lesson, fill in these details, save it and find it again later.

**REQ-4.2: Lesson content blocks** (Priority: MVP)
A lesson is a sequence of blocks that the creator can add, edit, reorder and delete. Block types:
- **Text**: with headings, bold, italics, lists and links
- **Image**: uploaded from the computer
- **Formula**: see REQ-4.3
- **Video**: a YouTube (or other) link, played inside the lesson
- **Audio**: an uploaded audio file or a link, played inside the lesson
- **Simulation**: a link to an outside website, shown inside the lesson where the website allows it
- **Question**: see REQ-4.4

*Acceptance criteria:*
- [ ] A creator can add one block of each type and see it correctly in the lesson.
- [ ] A creator can move a block up or down and delete it.
- [ ] A YouTube video plays inside the lesson without leaving Evolora.
- [ ] If a simulation website refuses to be shown inside Evolora, the student sees a button that opens it in a new tab.

**REQ-4.3: Visual formula editor** (Priority: MVP)
Creators write math formulas with a visual editor (buttons and typing, no code), and formulas display properly inside Hebrew, Arabic and English text.

*Acceptance criteria:*
- [ ] A creator can write a fraction, a power, a square root and a Greek letter without typing any code.
- [ ] The formula looks the same to the student as it did in the editor.
- [ ] A formula inside a Hebrew sentence displays left-to-right as math should, without breaking the sentence.

**REQ-4.4: Question types for the first version** (Priority: MVP)
- **Multiple choice**: one correct answer, or several. Checked automatically.
- **Open written answer**: checked by the teacher.
- **Recorded audio answer**: the student records on the Chromebook; checked by the teacher.

For each question, the creator can set:
- the correct answer(s) (multiple choice)
- **grading instructions** describing a good answer (open and audio questions)
- the **grade weight** (by default, every question counts equally)

*Acceptance criteria:*
- [ ] A creator can create each of the three question types.
- [ ] A creator can mark one or several choices as correct.
- [ ] A creator can write grading instructions for an open or audio question.
- [ ] A creator can give one question double weight, and the lesson grade reflects it.

**REQ-4.5: Questions block progress** (Priority: MVP)
When a student reaches a question, they must answer it before they can see the rest of the lesson. Attempts and scoring are in REQ-6.3.

*Acceptance criteria:*
- [ ] As a student, you cannot scroll or click past an unanswered question.

**REQ-4.6: Preview as a student** (Priority: MVP)
A creator can go through the lesson exactly as a student would, without the answers being recorded as a real student's.

*Acceptance criteria:*
- [ ] A creator can preview a lesson, answer its questions, and no grade appears on any dashboard.

**REQ-4.7: Lesson versions** (Priority: MVP)
When a creator changes a lesson that students have already started, students who started it finish the version they started. Students who start it afterwards get the new version. Existing answers and grades are kept.

*Acceptance criteria:*
- [ ] Student A starts a lesson. The creator changes a question. Student A still sees the old question.
- [ ] Student B starts the lesson after the change and sees the new question.
- [ ] Student A's earlier answers and grades are unchanged.

**REQ-4.8: Copy any lesson** (Priority: MVP)
Any creator can copy any lesson and edit the copy as their own. The copy shows both the new creator and the original creator. The original lesson does not change.

*Acceptance criteria:*
- [ ] A creator copies another creator's lesson, edits it, and the original is unchanged.
- [ ] The copy shows "Based on a lesson by [original creator]".

**REQ-4.9: Lesson library** (Priority: MVP)
Teachers and creators can browse and search all lessons by title, subject, grade level, language and creator.

*Acceptance criteria:*
- [ ] A teacher can find a lesson made by another teacher by searching its title.
- [ ] A teacher can filter lessons to show only Hebrew, 7th-grade math lessons.

**REQ-4.10: Courses** (Priority: MVP)
A creator or teacher can bundle lessons, their own or anyone's, into an ordered course. A course is either public (anyone can find and enroll in it) or private (see OPEN Q-2).

*Acceptance criteria:*
- [ ] A teacher can create a course from 3 existing lessons and change their order.
- [ ] A public course appears in the course library; a private one does not.

**REQ-4.11: Import from Google Docs and Word** (Priority: Later)
A creator can import a Google Doc or Word document, and Evolora turns it into a lesson: text, images and formulas become blocks.

**REQ-4.12: More question types** (Priority: Later)
Short answer checked automatically (a word or a number), math-expression answers, file or photo upload, and drag-and-drop questions (dragging snippets from a bank onto an image).

**REQ-4.13: Simulations built into Evolora** (Priority: Later)
Interactive simulations that run inside Evolora rather than on an outside website.

**REQ-4.14: Lesson marketplace** (Priority: Later)
A place to discover, rate and share lessons widely, beyond the school.

---

## 5. Class management (teachers)

**REQ-5.1: Create a class** (Priority: MVP)
A teacher creates a class with a name, such as "Grade 7B Science".

*Acceptance criteria:*
- [ ] A teacher creates a class and sees it in their list of classes.

**REQ-5.2: Join with a class code** (Priority: MVP)
Each class has a unique code. A student who enters it joins the class.

*Acceptance criteria:*
- [ ] A teacher sees the class code and can copy it.
- [ ] A student enters the code and the class appears in their list.
- [ ] A wrong code shows a clear message.
- [ ] A teacher can create a new code, after which the old one stops working.

**REQ-5.3: Join by email invite** (Priority: MVP)
A teacher enters students' email addresses. Each student gets an email with a link that adds them to the class.

*Acceptance criteria:*
- [ ] A teacher invites a student by email; the student receives the email, clicks the link, and joins the class.
- [ ] The teacher can paste a list of many email addresses at once.

**REQ-5.4: Class list** (Priority: MVP)
A teacher sees the list of students in a class and can remove a student.

*Acceptance criteria:*
- [ ] A removed student no longer sees the class, but their past work is kept for the teacher.

**REQ-5.5: Co-teachers** (Priority: MVP)
A teacher can add other teachers to a class. All teachers of a class have the same permissions. When two teachers change the same thing (for example, a grade or a due date), the last change counts.

*Acceptance criteria:*
- [ ] Teacher A adds Teacher B to a class; Teacher B sees the class and can do everything Teacher A can.
- [ ] Teacher A sets a grade to 80, Teacher B then sets it to 90; the grade is 90.

**REQ-5.6: Many classes per student** (Priority: MVP)
A student can belong to any number of classes, with different teachers.

*Acceptance criteria:*
- [ ] A student in two classes sees both, with each class's own assignments.

**REQ-5.7: Assign lessons** (Priority: MVP)
A teacher can assign a single lesson, a course, or any selection of lessons, to the whole class or to selected students.

*Acceptance criteria:*
- [ ] A teacher assigns a lesson to the whole class; every student in the class sees it.
- [ ] A teacher assigns a lesson to 3 students only; only those 3 see it.
- [ ] A student who joins the class later also receives assignments given to the whole class.

**REQ-5.8: Fixed order or student's choice** (Priority: MVP)
When assigning several lessons, the teacher chooses:
- **Fixed order**: the student must finish each lesson before the next one opens.
- **Student's choice**: the student chooses which lessons to do (see OPEN Q-3).

*Acceptance criteria:*
- [ ] In fixed order, the second lesson is locked until the first is finished.
- [ ] In student's choice, all the lessons are open.

**REQ-5.9: Assignment settings** (Priority: MVP)
When assigning, the teacher sets:
- **Due date** (optional), and what happens after it: the grade is reduced by a set percentage, or the lesson is locked.
- **Redo improves grade**: whether redoing a finished lesson can change its grade (see REQ-6.7).
- **Who checks open answers**: in the MVP, always the teacher. AI options are in REQ-7.1.

*Acceptance criteria:*
- [ ] With "reduce by 10% after the due date", a lesson finished late gets 10% off its grade.
- [ ] With "lock after the due date", a student cannot open an unfinished lesson after the due date.
- [ ] A teacher can extend the due date for the whole class or for one student, and the lesson opens again for them.

**REQ-5.10: Class dashboard with status colours** (Priority: MVP)
For each class, the teacher sees every student with a status colour: **green** (on track), **orange** (behind), **red** (red flag). Clicking a student shows their progress in each assignment. The exact rules will be refined after trying the system; starting rules are in OPEN Q-4.

*Acceptance criteria:*
- [ ] The dashboard shows every student in the class with a colour.
- [ ] A student who has 3 wrong attempts on a question turns red (under the starting rules).
- [ ] Clicking a student shows which lessons they finished, which are in progress, and their grades.

**REQ-5.11: Grade dashboard** (Priority: MVP)
A teacher sees grades per class, per course, per lesson and per question. An unfinished lesson counts as grade 0 and is clearly marked as not done.

*Acceptance criteria:*
- [ ] A teacher sees a table of students and lessons with a grade in each cell.
- [ ] A teacher can open one lesson and see each student's result per question.
- [ ] Lessons not finished show "not done" and count as 0 in averages.
- [ ] Pending grades (waiting for the teacher) are shown as pending, not as 0.

**REQ-5.12: Review screen** (Priority: MVP)
For an open or audio question, the teacher sees all submitted answers, one below the other, with the question's grading instructions at the top. The teacher grades and comments on each one, and moves to the next student with the Tab key.

*Acceptance criteria:*
- [ ] A teacher opens a question and sees every submitted answer on one page.
- [ ] Pressing Tab moves to the next student's grade box.
- [ ] Audio answers can be played on the page.
- [ ] After grading, the student's lesson grade is no longer pending.

**REQ-5.13: Teacher comments** (Priority: MVP)
A teacher can add a comment to any answer, either written or as an audio recording.

*Acceptance criteria:*
- [ ] A teacher records a short audio comment on a student's answer; the student can play it.

**REQ-5.14: Send back for review or corrections** (Priority: MVP)
A teacher can send a finished lesson, or selected questions from it, back to a student:
- **For review**: the student must read or listen to the comments.
- **For corrections**: the student must also answer those questions again; the new answers are graded again.

In both cases, a student with pending notes cannot start any new lesson until they have gone over them.

*Acceptance criteria:*
- [ ] After a lesson is sent back for review, the student sees the comments, and new lessons are locked until they open them.
- [ ] After questions are sent back for corrections, the student can answer those questions again, and the teacher sees the new answers to grade.

**REQ-5.15: Teacher controls grades** (Priority: MVP)
A teacher can change any grade, up or down, at any time.

*Acceptance criteria:*
- [ ] A teacher changes an automatic grade from 67 to 100; the student and dashboard show 100.

**REQ-5.16: Messages** (Priority: MVP)
Each student has one private conversation with the teachers of each class they are in. All teachers of the class share it. No one else can see it. Students cannot message each other.

*Acceptance criteria:*
- [ ] A student sends a question; both teachers of the class can see and answer it.
- [ ] A teacher of a different class cannot see it.
- [ ] The student sees a notice when a teacher replies.
- [ ] There is no way for a student to message another student.

**REQ-5.17: Google Classroom connection** (Priority: Later)
Import class lists from Google Classroom, and possibly post assignments and grades back to it. See the advice in the open questions summary.

---

## 6. Student learning

**REQ-6.1: Student home page** (Priority: MVP)
A student sees their classes, what is assigned to them (with due dates), their pending notes, and the public courses they enrolled in.

*Acceptance criteria:*
- [ ] After signing in, a student sees what to do next, without searching.
- [ ] Pending notes are clearly highlighted.

**REQ-6.2: Taking a lesson** (Priority: MVP)
The student moves through the lesson block by block: reads, watches, listens and answers questions. If they leave, they continue from the same point next time.

*Acceptance criteria:*
- [ ] A student closes the lesson in the middle and later returns to exactly where they stopped.
- [ ] Answers already given are kept.

**REQ-6.3: Attempts and scoring** (Priority: MVP)
For automatically checked questions, a student has up to 3 attempts:
- correct on the 1st attempt: full marks
- 2nd attempt: 2/3 of the marks
- 3rd attempt: 1/3 of the marks
- 3 wrong attempts: the system shows the correct answer, the question scores 0, and the student continues

For open and audio questions, the student submits once and continues. The lesson grade stays **pending** until the teacher grades them.

*Acceptance criteria:*
- [ ] A wrong answer says it is wrong and lets you try again, up to 3 times.
- [ ] After 3 wrong attempts, the correct answer is shown and you can continue.
- [ ] A question answered correctly on the 2nd attempt scores 2/3 of its marks.
- [ ] A lesson with an open question shows "grade pending" until the teacher grades it.

**REQ-6.4: Student progress view** (Priority: MVP)
For each course or set of assigned lessons, the student sees the titles of the lessons ahead, which are done, and the percentage complete, with a progress bar.

*Acceptance criteria:*
- [ ] A student who finished 2 of 5 lessons sees 40% and the titles of the remaining 3.

**REQ-6.5: Redo a lesson** (Priority: MVP)
A student can redo a finished lesson. If the teacher allowed it when assigning (REQ-5.9), the new grade replaces the old one; otherwise the redo is for practice only. (See OPEN Q-5.)

*Acceptance criteria:*
- [ ] With "redo improves grade" on, redoing a lesson with a better result raises the grade.
- [ ] With it off, the grade stays the same after a redo.

**REQ-6.6: Recording audio answers** (Priority: MVP)
A student can record, listen back to, re-record and submit an audio answer on a Chromebook.

*Acceptance criteria:*
- [ ] The first time, the browser asks for microphone permission; after allowing it, recording works.
- [ ] The student can listen to the recording before submitting.

**REQ-6.7: Public courses without a teacher** (Priority: MVP)
A student can browse public courses and enroll in one on their own. They learn and answer questions as usual, but no teacher reviews their work (see OPEN Q-6).

*Acceptance criteria:*
- [ ] A student enrolls in a public course and sees it on their home page.
- [ ] Automatically checked questions work as usual.

**REQ-6.8: Game-like progress** (Priority: Later)
A more playful progress display (for example, a figure advancing along a path, like in a building-block instruction booklet) and possibly points or coins.

**REQ-6.9: AI help after wrong answers** (Priority: Later)
After wrong answers, AI explains what went wrong and gives an extra practice question. After several failures, the student may continue but the teacher gets a red flag.

---

## 7. AI features (all Later)

The MVP has no AI. The design must leave room for it. Gemini is preferred because the school has approved it. Before building any AI feature, Claude will prepare an estimate of its running costs for Gil to approve.

**REQ-7.1: AI grading options** (Priority: Later)
When assigning, the teacher chooses who checks open answers:
- (a) the teacher
- (b) AI grades, the teacher approves
- (c) AI grades and writes a comment, the teacher approves
- (d) AI grades and comments, without the teacher; the teacher can still look at the dashboard

**REQ-7.2: AI explanations and practice questions** (Priority: Later)
See REQ-6.9.

**REQ-7.3: AI lesson suggestion** (Priority: Later)
A creator gives Evolora a document; Evolora suggests a complete lesson, which the creator reviews and improves. AI can also suggest improvements to existing lessons.

**REQ-7.4: Audio transcription** (Priority: Later)
Audio answers are turned into text by AI (see REQ-10.5).

**REQ-7.5: Automatic translation of lessons** (Priority: Later)
A lesson can be translated into another language, and the translation reviewed by a person.

---

## 8. Subjects and age groups

**REQ-8.1: Any subject, grades 7 to 12** (Priority: MVP)
Evolora is not tied to any subject. Lessons are tagged with a subject and a grade level (7 to 12). The pilot is 7th grade.

*Acceptance criteria:*
- [ ] A creator can choose a subject from a list (or add a new one) and a grade from 7 to 12.

---

## 9. Language and right-to-left support

**REQ-9.1: Interface in Hebrew, Arabic and English** (Priority: MVP)
All menus, buttons and messages are available in Hebrew, Arabic and English.

*Acceptance criteria:*
- [ ] Switching the interface language changes every menu and button to that language.
- [ ] No untranslated text appears in any screen.

**REQ-9.2: Right-to-left and left-to-right layout** (Priority: MVP)
In Hebrew and Arabic, the whole layout is right-to-left; in English, left-to-right.

*Acceptance criteria:*
- [ ] In Hebrew, menus, text alignment, progress bars and arrows run right-to-left.
- [ ] In English, they run left-to-right.

**REQ-9.3: Lesson content in its own direction** (Priority: MVP)
A lesson is displayed in its own language direction, whatever the interface language. Mixed text, such as English words or numbers inside a Hebrew sentence, displays correctly.

*Acceptance criteria:*
- [ ] A Hebrew lesson shown in the English interface is still right-to-left.
- [ ] A Hebrew sentence containing an English term and a number reads correctly.

**REQ-9.4: Class language setting** (Priority: MVP)
A teacher sets the class language and chooses whether students must use it or may choose their own interface language (see OPEN Q-7).

*Acceptance criteria:*
- [ ] With the language set to Arabic and forced, students in the class see the Arabic interface.
- [ ] With "students may choose", each student can pick their own interface language.

---

## 10. Privacy, safety and protection of minors

Most students are minors (12 to 18). During the pilot, not every privacy rule will be fully met; the requirements below are the minimum. Full compliance comes before any wider release (REQ-10.6).

**REQ-10.1: Only school accounts** (Priority: MVP)
See REQ-3.2.

**REQ-10.2: Private messages** (Priority: MVP)
See REQ-5.16. Messages are visible only to the student and that class's teachers.

**REQ-10.3: Students cannot see each other's work** (Priority: MVP)
See REQ-3.4.

**REQ-10.4: Data stored in a safe place** (Priority: MVP)
Student data is stored with a major cloud provider, preferably in its Israel region, and is backed up daily.

*Acceptance criteria:*
- [ ] Claude can show Gil, in the hosting control panel, where the data is stored and when the last backup ran.

**REQ-10.5: Keeping audio recordings** (Priority: Later)
Audio recordings are kept until the end of the school year (end of July) and then deleted, or transcribed to text by AI and deleted sooner. The choice depends on AI costs.

**REQ-10.6: Full privacy compliance** (Priority: Later)
Before Evolora is used beyond the pilot, it must meet Israeli privacy law and Ministry of Education rules for student data.

---

## 11. Platform, hosting and scale

**REQ-11.1: Web app for Chromebooks** (Priority: MVP)
Evolora is a website used in the Chrome browser on school Chromebooks. Phones are not supported.

*Acceptance criteria:*
- [ ] Every screen works on a school Chromebook, at its normal screen size, without zooming.

**REQ-11.2: Cloud hosting and own web address** (Priority: MVP)
Evolora runs in the cloud and is reached at its own web address (see OPEN Q-8 and OPEN Q-9).

*Acceptance criteria:*
- [ ] Typing the Evolora web address in Chrome opens the sign-in page.

**REQ-11.3: Pilot size** (Priority: MVP)
Evolora supports 5 teachers and 120 students, with at least one full class of 30 students working at the same time. It can grow later.

*Acceptance criteria:*
- [ ] With 30 students working in the same lesson at once, pages still open quickly (see REQ-12.1).

---

## 12. Quality: speed, reliability, accessibility

**REQ-12.1: Speed** (Priority: MVP)
On the school network, pages open within 3 seconds and answers are checked within 1 second.

*Acceptance criteria:*
- [ ] During a class session, no page takes noticeably longer than 3 seconds to open.

**REQ-12.2: No lost work** (Priority: MVP)
An answer is saved as soon as the student submits it. If the internet connection drops, the student sees a clear message, and nothing already submitted is lost.

*Acceptance criteria:*
- [ ] Turning off Wi-Fi in the middle of a lesson shows a message; after turning it back on, the student continues without losing answers.

**REQ-12.3: Basic accessibility** (Priority: MVP)
Text is readable, colours are not the only way information is shown (status colours also have a label or icon), and main actions work with the keyboard.

*Acceptance criteria:*
- [ ] Each status colour on the dashboard also shows a word or icon.

---

## 13. Out of scope for now

- Phone apps
- Student-to-student communication
- Parents' access
- Payment of any kind

---

## 14. Open questions

| # | Question | Affects |
|---|---|---|
| **Q-1** | Which open licences? My proposal: lessons under **CC BY-SA 4.0** (the Wikipedia licence: anyone may use and change, must credit the creator and share alike), code under **AGPL-3.0** (a GNU licence for websites: anyone may use and change, must share their changes). | REQ-1.1 |
| **Q-2** | If everything is open, what does a "private" course mean? My proposal: a private course is **unlisted**: it doesn't appear in the course library and students can't enroll on their own, but its lessons can still be found and copied by other teachers. | REQ-4.10 |
| **Q-3** | In "student's choice", must the student do **all** the lessons in any order, or only **some** of them (for example, "choose 2 of these 4")? | REQ-5.8 |
| **Q-4** | Starting rules for status colours. My proposal: **red** = 3 wrong attempts on any question in the past week; **orange** = an assignment is past its due date and unfinished; **green** = everything else. | REQ-5.10 |
| **Q-5** | When a redo counts, is the grade the **latest** attempt or the **best** one? | REQ-6.5 |
| **Q-6** | In a public course without a teacher, what happens to open and audio questions? Skip them, accept any answer, or don't allow them in public courses? | REQ-6.7 |
| **Q-7** | A student is in two classes, one set to Arabic (forced) and one to Hebrew (forced). Which language do they see? My proposal: the forced language applies while they are inside that class. | REQ-9.4 |
| **Q-8** | Hosting: approve Google Cloud in the Israel region? Who owns the cloud account: you personally, or the school? | REQ-11.2, REQ-10.4 |
| **Q-9** | Web address: which name to buy? | REQ-11.2 |
| **Q-10** | Privacy in the pilot: should the school's management or IT give written approval before real students use Evolora? | Section 10 |
| **Q-11** | Your first lesson is a Google Doc. Since importing is Later, I'll rebuild it in Evolora by hand from your document. Please share it with me when you're ready (for example, export it as a Word file into this folder). | REQ-4.11 |

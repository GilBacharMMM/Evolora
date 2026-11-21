# Evolora: Requirements

**Status:** Draft 4: adds hints, check-again questions, levels, the help line, random answer order and lesson types (Gil's ideas, 2026-11-20); still in review
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
Every lesson in Evolora can be used by any teacher and copied and edited by any creator. The creator's name always stays attached to their work. Lessons are shared under the **CC BY-SA 4.0** licence (the Wikipedia licence). The software code is open source under the **AGPL-3.0** licence (a GNU licence for websites).

*Acceptance criteria:*
- [ ] Every lesson shows the name of its creator, and of the original creator if it is a copy.
- [ ] Every lesson shows that it is shared under CC BY-SA 4.0.
- [ ] Before publishing a lesson for the first time, the creator is told that it will be shared under this licence.

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

**REQ-3.2: Any Google account during the pilot** (Priority: MVP)
During the pilot, people sign in with a regular Google account, such as a Gmail address. School accounts (@taded.org.il) can't be used yet, because a website using them must first be approved by the Ministry of Education (decision D-19).

A new person who signs in is a student with no classes. They see nothing except an empty home page with a box to enter a class code. They can only see lessons once they join a class (OPEN Q-15).

*Acceptance criteria:*
- [ ] Signing in with a Gmail account works.
- [ ] A new person who hasn't joined a class sees only the "enter class code" box, and no lessons, classes or people.

**REQ-3.3: Other sign-in methods** (Priority: Later)
Allow school accounts (@taded.org.il) after Ministry of Education approval, and the Ministry of Education sign-in.

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
- **Note box**: a highlighted text box, for example "Historical note"
- **Image**: uploaded from the computer, with an optional caption and a required source (see REQ-4.15)
- **Table**: rows and columns of text and numbers
- **Formula**: see REQ-4.3
- **Video**: a YouTube video, played inside the lesson window, optionally only a part of it (see REQ-4.23)
- **Audio**: an uploaded audio file or a link, played inside the lesson (or opened in a new tab if the website doesn't allow playing it inside Evolora, as with some podcast sites)
- **Simulation**: a link to an outside website, shown inside the lesson where the website allows it
- **Link list**: a list of further-reading links with a title for each
- **Solved example**: a question with its full answer, shown to the student as an example, with nothing to answer. It is shown as "Question: ..." followed by "Answer: to calculate ..., you ...". (Added 2026-11-21; see the circles lesson, which has two in each topic.)
- **Question**: see REQ-4.4

*Acceptance criteria:*
- [ ] A creator can add one block of each type and see it correctly in the lesson.
- [ ] Gil's first lesson (Archimedes and density) can be fully rebuilt in Evolora: story text, 6 images with captions, the metals density table, note boxes, podcast link, videos, the density simulation and the questions.
- [ ] A creator can move a block up or down and delete it.
- [ ] A YouTube video plays inside the lesson without leaving Evolora.
- [ ] In the circles lesson, each of the four videos plays inside the lesson, and the questions about it come right after it.
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
A creator or teacher can bundle lessons, their own or anyone's, into an ordered course. A course is either **public** (listed in the course library) or **private**, which means unlisted: it doesn't appear in the course library and only classes it is assigned to can use it, but its lessons are still open to everyone in the lesson library.

*Acceptance criteria:*
- [ ] A teacher can create a course from 3 existing lessons and change their order.
- [ ] A public course appears in the course library; a private one does not.
- [ ] The lessons inside a private course can still be found in the lesson library.

**REQ-4.15: Image sources** (Priority: MVP)
For every image, the creator must say where it comes from, as on Wikipedia. Lessons are shared under CC BY-SA, so every image must be allowed to be shared that way. The choices are:
- **My own work** (photo or drawing by the creator)
- **AI-generated** (with the name of the AI tool, if known)
- **From another source**: the creator enters the author, a link to the original, and its licence (for example, "Public domain" or "CC BY-SA 4.0")

Students see a small "Source" note under each image. Clicking it shows the full details.

*Acceptance criteria:*
- [ ] A creator can't save an image without choosing its source.
- [ ] For "From another source", the author, link and licence must all be filled in.
- [ ] A student can click "Source" under an image and see where it comes from.
- [ ] In the Archimedes lesson, the Renaissance woodcut shows its Wikimedia Commons source, and the other images show "AI-generated".

**REQ-4.16: Two attempts, a hint and a full solution** (Priority: to be set by Gil, see the roadmap)
Every multiple choice question, and every type-a-number question (REQ-4.22), gives the student **2 attempts**. For each one, the creator writes in advance:
- a **hint**: short guidance on how to solve the question, without giving the answer
- a **full solution**: the question solved step by step

After the 1st wrong attempt, Evolora shows the hint and the student tries again. After the 2nd wrong attempt, Evolora shows the full solution with the correct answer, and right away asks a check-again question (REQ-4.17). Scoring is in REQ-6.3.

*Acceptance criteria:*
- [ ] A creator can write a hint and a full solution for a multiple choice question.
- [ ] As a student, a wrong answer shows the hint and lets you try once more.
- [ ] A second wrong answer shows the full solution, followed at once by a check-again question.
- [ ] There is no 3rd attempt.
- [ ] In the Archimedes lesson, each multiple choice question shows the hint and solution written for it.

**REQ-4.17: Check-again questions** (Priority: to be set by Gil, see the roadmap)
The creator adds a bank of one or more **check-again questions** to each multiple choice question, to check that the student understands after seeing the full solution:
- If the question is a **calculation** (for example, "what is the density of this block?"), the check-again question is a similar calculation with different numbers or materials.
- If the question is about **understanding** (for example, "why did the king have a doubt?"), the check-again question asks the same thing in different words, mostly with different answers.

Right after the full solution (REQ-4.16), Evolora picks one check-again question from the bank at random and asks it. If the student answers it wrongly too, the teacher gets a **red flag** for that student and question, and the student continues.

*Acceptance criteria:*
- [ ] A creator can add several check-again questions under a multiple choice question.
- [ ] As a student, right after the full solution you get one check-again question; different students may get different ones.
- [ ] Answering the check-again question wrongly sends a red flag; the teacher sees it on the class dashboard (REQ-5.10) with the student's name and the question.
- [ ] Answering it correctly sends no flag.

**REQ-4.18: Question levels** (Priority: to be set by Gil, see the roadmap)
Every question has a **level** from 1 to 3: 1 is the easiest, 3 the hardest. The creator sets it, and a new question starts at level 1. Who sees which questions is in REQ-6.10.

For example, in the Archimedes lesson most questions are level 1, the tungsten question is level 2, and the challenge question about ships is level 3.

*Acceptance criteria:*
- [ ] A creator can set each question to level 1, 2 or 3.
- [ ] In the lesson builder, each question shows its level.

**REQ-4.19: Answers in random order** (Priority: to be set by Gil, see the roadmap)
In every multiple choice question (including check-again questions), Evolora shows the choices in a random order, different for each student, so that students sitting next to each other can't simply copy "the second answer". A student who leaves and comes back sees the same order as before.

*Acceptance criteria:*
- [ ] Two test students open the same question and see the choices in different orders (try a few questions; sometimes the order may match by chance).
- [ ] Closing and reopening the lesson keeps the same order for the same student.
- [ ] The correct answer is still marked correct, whatever its position.

**REQ-4.20: Learning lessons and practice lessons** (Priority: to be set by Gil, see the roadmap; details in OPEN Q-23)
When creating a lesson, the creator chooses its type:
- **Learning lesson** (in Hebrew: שיעור הקניה): teaches new material, with text, media and questions, like the Archimedes lesson.
- **Practice lesson** (in Hebrew: שיעור תרגול): only questions, on material the students have already learned. No new material. This matters most in mathematics.

*Acceptance criteria:*
- [ ] A creator chooses "learning" or "practice" when creating a lesson, and the lesson library shows each lesson's type.
- [ ] A practice lesson contains questions only (the exact rules depend on OPEN Q-23).

**REQ-4.21: Topics, with a minimum number of questions** (Priority: to be set by Gil, see the roadmap)
A creator can divide a lesson into **topics** (for example, in the circles lesson: what a circle is, the circumference, the number π, the area). Every student must answer at least a **minimum number of questions correctly** in each topic before moving on to the next one, whatever their student level (REQ-6.10). A student who reaches the minimum moves on (Gil, Q-24). The details (Gil, Q-26):
- The creator marks some questions in a topic as **extra practice**. Extra practice questions are asked, in order, only until the student reaches the minimum; students who have reached it skip them. All other questions, including challenge questions at levels 2 and 3, are always asked.
- A correct answer to a check-again question counts toward the minimum.
- Open and audio questions don't count, because the teacher grades them later.
- If a student runs out of extra practice questions without reaching the minimum, they continue to the next topic, and the teacher gets a red flag.
- Extra practice questions have a hint and a full solution, but they don't need a check-again question: the next extra practice question plays that part.

- The **creator** sets a default minimum for the lesson: for example, 3 for the circles lesson, and 1 for the Archimedes lesson.
- The **teacher** can change it when assigning the lesson (REQ-5.9).

*Acceptance criteria:*
- [ ] A creator can group blocks into topics and give each topic a name.
- [ ] A creator can set the lesson's default minimum number of questions per topic.
- [ ] When assigning the circles lesson, the teacher sees 3 as the minimum and can change it.
- [ ] If a topic has fewer level 1 questions than the minimum, the lesson builder warns the creator, and the assignment screen warns the teacher (because level 1 students would not reach the minimum).
- [ ] As a test student in the circles lesson, the next topic opens only after you answer 3 questions in the current topic correctly.
- [ ] A student who answers every question correctly skips the extra practice questions.
- [ ] A student who gets one question wrong gets extra practice questions until they have 3 correct answers.
- [ ] A student who runs out of extra practice questions moves on, and the teacher sees a red flag.

**REQ-4.23: Videos inside the lesson** (Priority: to be set by Gil, see the roadmap)
YouTube videos are shown with YouTube's own player, **embedded in the lesson window**: the student watches without leaving Evolora, and the video stays on YouTube. For each video, the creator:
- pastes the YouTube link
- may set a **start time** and an **end time** (for example, 1:20 to 3:05), when only part of the video is needed; the player then starts and stops there
- records the **source**: the channel name, filled in automatically from the link

Evolora uses YouTube's **privacy-enhanced mode**, which doesn't store tracking information about the student until they press play. Ads may appear before or during some videos; see decision D-32. If a video's owner doesn't allow it to be embedded, the student sees a button that opens it on YouTube instead.

*Acceptance criteria:*
- [ ] Each video in the circles lesson plays inside the lesson window.
- [ ] A creator sets start 0:30 and end 1:00; as a student, the video starts at 0:30 and stops at 1:00.
- [ ] Under each video, the student sees its source (the channel name), and clicking it opens the video on YouTube.
- [ ] A video whose owner doesn't allow embedding shows an "Open on YouTube" button instead of an error.

**REQ-4.22: Type-a-number questions** (Priority: to be set by Gil, see the roadmap)
A new question type: the student types a number, and Evolora checks it automatically. The creator enters the correct answer and the unit (for example, "ס\"מ"), which is shown next to the box. An answer is accepted if it is correct to one digit after the decimal point: it may differ from the exact answer by up to 0.1. For example, if the exact answer is 11.46, then 11.5 and 11.4 are accepted, but 11 is not.

Type-a-number questions have the same 2 attempts, hint, full solution and check-again question as multiple choice questions (REQ-4.16, REQ-4.17).

*Acceptance criteria:*
- [ ] A creator can write a type-a-number question with its answer and unit.
- [ ] As a student, typing 11.5 or 11.46 for an exact answer of 11.46 is marked correct; typing 12 is marked wrong.
- [ ] The box accepts a decimal point and numbers like 7,850 or 7850, and rejects letters with a friendly message, without using up an attempt.
- [ ] In the circles lesson, all of Gil's calculation questions, and their check-again questions, are type-a-number questions.

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
- **Student's choice**: the student must do all the lessons, but chooses the order.

*Acceptance criteria:*
- [ ] In fixed order, the second lesson is locked until the first is finished.
- [ ] In student's choice, all the lessons are open, and the assignment counts as done only when all of them are finished.

**REQ-5.9: Assignment settings** (Priority: MVP)
When assigning, the teacher sets:
- **Due date** (optional), and what happens after it: the grade is reduced by a set percentage, or the lesson is locked.
- **Redo counts**: whether redoing a finished lesson replaces its grade (see REQ-6.5).
- **Who checks open answers**: in the MVP, always the teacher. AI options are in REQ-7.1.
- **Minimum questions per topic**: starts at the lesson's default, set by the creator (REQ-4.21); the teacher can change it.

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
- [ ] Red flags from check-again questions (REQ-4.17) and, later, from the help line (REQ-6.9) appear here, saying which question caused them.

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

**REQ-5.18: Student levels (secret)** (Priority: to be set by Gil, see the roadmap; details in OPEN Q-21)
Each student has a **student level** from 1 to 3 in each class. Only the class's teachers can see it; the student and other students never do. Every student starts at level 2. Only a teacher can raise or lower a student's level.

To help the teacher, Evolora can **suggest** levels based on average grades: the weakest 10% of the class at level 1, the strongest 10% at level 3, and everyone else at level 2. The teacher sees the suggestions and approves or changes each one; nothing changes without the teacher.

*Acceptance criteria:*
- [ ] On the class list, a teacher sees each student's level and can change it.
- [ ] A new student in the class is at level 2.
- [ ] Clicking "Suggest levels" in a class of 20 students suggests level 1 for the 2 lowest averages and level 3 for the 2 highest, and changes nothing until the teacher approves.
- [ ] Signed in as a student, you cannot see your level anywhere.

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
For multiple choice questions, a student has **2 attempts** (REQ-4.16):
- correct on the 1st attempt: full marks
- correct on the 2nd attempt, after the hint: *proposed (OPEN Q-18):* half the marks
- 2 wrong attempts: the full solution is shown, the question scores 0, and a check-again question follows (REQ-4.17)

For open and audio questions, the student submits once and continues. The lesson grade stays **pending** until the teacher grades them.

The lesson grade is based only on the questions the student received (see REQ-6.10). Using the help line (REQ-6.9) never lowers the grade.

*Acceptance criteria:*
- [ ] A wrong answer says it is wrong, shows the hint and lets you try once more.
- [ ] After 2 wrong attempts, the full solution is shown and you can continue.
- [ ] A question answered correctly on the 2nd attempt scores the agreed part of its marks (OPEN Q-18).
- [ ] A lesson with an open question shows "grade pending" until the teacher grades it.

**REQ-6.4: Student progress view** (Priority: MVP)
For each course or set of assigned lessons, the student sees the titles of the lessons ahead, which are done, and the percentage complete, with a progress bar.

*Acceptance criteria:*
- [ ] A student who finished 2 of 5 lessons sees 40% and the titles of the remaining 3.

**REQ-6.5: Redo a lesson** (Priority: MVP)
A student can redo a finished lesson. If the teacher allowed it when assigning (REQ-5.9), the grade of the latest redo replaces the old one, even if it is lower. Otherwise the redo is for practice only.

*Acceptance criteria:*
- [ ] With "redo counts" on, redoing a lesson with a better result raises the grade.
- [ ] With "redo counts" on, redoing a lesson with a worse result lowers the grade.
- [ ] With it off, the grade stays the same after a redo.

**REQ-6.6: Recording audio answers** (Priority: MVP)
A student can record, listen back to, re-record and submit an audio answer on a Chromebook.

*Acceptance criteria:*
- [ ] The first time, the browser asks for microphone permission; after allowing it, recording works.
- [ ] The student can listen to the recording before submitting.

**REQ-6.7: Public courses without a teacher** (Priority: Later)
A student can browse public courses and enroll in one on their own. Automatically checked questions work as usual. Audio questions are skipped. Open written questions can be answered for practice, but are not graded. No teacher reviews their work.

*Acceptance criteria:*
- [ ] A student enrolls in a public course and sees it on their home page.
- [ ] Automatically checked questions work as usual.
- [ ] Audio questions don't appear.
- [ ] Open written questions can be answered, and show "practice, not graded".

**REQ-6.8: Game-like progress** (Priority: Later)
A more playful progress display (for example, a figure advancing along a path, like in a building-block instruction booklet) and possibly points or coins.

**REQ-6.9: "I didn't understand" help line** (Priority: to be set by Gil, see the roadmap; uses AI; details in OPEN Q-20)
Under every question there is a help line: **"I didn't understand ______, please explain."** The student fills in the gap and sends it. AI answers in writing and tries to help **without revealing the answer**. It may go on for a few messages back and forth.

The help must stay on the subject of the question. If the student asks about anything else (for example, a chocolate cake recipe), the AI politely refuses and brings them back to the question.

Asking for help never lowers the student's grade (Gil, Q-20). If, after a few messages back and forth, the student still can't answer the question, the teacher gets a **red flag**. The class's teachers can read every help conversation.

*Acceptance criteria:*
- [ ] Every question shows the help line.
- [ ] Asking "I didn't understand what density is" gets a short explanation that doesn't give away the answer.
- [ ] Asking directly "what is the answer?" gets help, not the answer.
- [ ] Asking for a cake recipe gets a polite refusal and a reminder to stay on the question.
- [ ] After the set number of messages without a correct answer, the teacher sees a red flag.
- [ ] A teacher can open and read a student's help conversation.

**REQ-6.10: Each student sees questions up to their level** (Priority: to be set by Gil, see the roadmap; details in OPEN Q-21)
A student sees only questions at or below their student level (REQ-5.18), and the lesson simply skips the others:
- level 1 student: level 1 questions only
- level 2 student: levels 1 and 2
- level 3 student: all questions

The lesson grade is calculated only from the questions the student received (Gil, Q-21). *Proposed (OPEN Q-21):* the grade dashboard shows each student's level next to their grade.

*Acceptance criteria:*
- [ ] Signed in as a level 1 test student, the Archimedes lesson has no tungsten question and no ships question.
- [ ] As a level 2 student, you get the tungsten question but not the ships question.
- [ ] As a level 3 student, you get both.
- [ ] Nothing on the student's screen says that questions were skipped.

---

## 7. AI features (all Later)

The MVP has no AI. The design must leave room for it. Gemini is preferred because the school has approved it. Before building any AI feature, Claude will prepare an estimate of its running costs for Gil to approve.

**REQ-7.1: AI grading options** (Priority: Later)
When assigning, the teacher chooses who checks open answers:
- (a) the teacher
- (b) AI grades, the teacher approves
- (c) AI grades and writes a comment, the teacher approves
- (d) AI grades and comments, without the teacher; the teacher can still look at the dashboard

**REQ-7.2: AI help and AI-suggested check-again questions** (Priority: Later)
The help line is in REQ-6.9. In addition, AI may suggest check-again questions (REQ-4.17) for the creator to approve or change.

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

**REQ-9.4: Choose interface language** (Priority: MVP)
Each person chooses their own interface language, and Evolora remembers it.

*Acceptance criteria:*
- [ ] A student switches to Arabic, signs out and in again, and still sees Arabic.

**REQ-9.5: Class language setting** (Priority: Later)
A teacher sets a class language and chooses whether students must use it or may choose. A student can be in classes with different required languages (for example, Science in Hebrew and English class in English); the class's language applies while the student is inside that class.

*Acceptance criteria:*
- [ ] With the language set to English and required, students see the English interface inside that class.
- [ ] The same student sees Hebrew inside their Hebrew-only Science class.

---

## 10. Privacy, safety and protection of minors

Most students are minors (12 to 18). During the pilot, not every privacy rule will be fully met, and no formal school approval is needed (decision D-13). The requirements below are the minimum. Full compliance comes before any wider release (REQ-10.6).

**REQ-10.1: Strangers see nothing** (Priority: MVP)
Anyone with a Google account can sign in (REQ-3.2), so a person who hasn't joined a class must see no lessons, classes, names or student work.

*Acceptance criteria:*
- [ ] A Google account that has never joined a class sees only the "enter class code" box.

**REQ-10.2: Private messages** (Priority: MVP)
See REQ-5.16. Messages are visible only to the student and that class's teachers.

**REQ-10.3: Students cannot see each other's work** (Priority: MVP)
See REQ-3.4.

**REQ-10.4: Data stored in a safe place** (Priority: MVP)
Student data is stored on Google Cloud in its Israel (Tel Aviv) region, and is backed up daily.

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
Evolora runs on Google Cloud (Firebase) and is reached at **evoloraedu.org**.

*Acceptance criteria:*
- [ ] Typing evoloraedu.org in Chrome opens the Evolora sign-in page.
- [ ] The browser shows the address as secure (padlock icon).

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

**REQ-12.4: Test site** (Priority: MVP)
There is a separate test site, with made-up data only, where Gil checks every new feature before it goes to the real site (decision D-18).

*Acceptance criteria:*
- [ ] The test site has its own address and clearly shows a "TEST SITE" banner on every screen.
- [ ] Nothing done on the test site appears on the real site, and the other way round.

**REQ-12.5: Switching users on the test site** (Priority: MVP)
On the test site only, Gil can switch between made-up test users (for example, "Test Teacher 1" or "Test Student 3") with one click, without signing out. This lets Gil see each screen as each role. Gil's own Google accounts can also be used.

*Acceptance criteria:*
- [ ] On the test site, a "Switch user" menu lists the test users with their roles.
- [ ] Choosing a test user shows Evolora exactly as that person would see it.
- [ ] The "Switch user" menu doesn't exist on the real site.

**REQ-12.6: Ready-made test data** (Priority: MVP)
The test site can be filled with a standard set of test data with one command, by Claude: test teachers, test students, a test class, the Archimedes lesson and the circles lesson. It can be reset to that state at any time.

*Acceptance criteria:*
- [ ] After a reset, the test site has the same test users, class and lesson as before, and no leftover answers.
- [ ] The test students include at least one student at each level (1, 2 and 3), so REQ-6.10 can be checked.

## 13. Out of scope for now

- Phone apps
- Student-to-student communication
- Parents' access
- Payment of any kind

---

## 14. Open questions

### Still open

| # | Question | Affects |
|---|---|---|
| **Q-4** | Starting rules for status colours. My proposal: **red** = 3 wrong attempts on any question in the past week; **orange** = an assignment is past its due date and unfinished; **green** = everything else. *(Gil is reading.)* | REQ-5.10 |
| **Q-14** | **Lessons on GitHub.** Now that the image sources are known (all AI-generated except one Wikimedia image), I've put the converted Archimedes lesson in the `lessons` folder, which *is* stored on GitHub, so it's backed up and open like the rest of the project. The original Word file stays out of GitHub. Is that OK? | — |
| **Q-15** | **Who may sign in?** With regular Google accounts (REQ-3.2), anyone in the world could sign in. My proposal: anyone may sign in, but they see nothing until they join a class with a class code (REQ-10.1). Teachers are still only added by the system admin. Also note that Google only allows children under 13 to have a Gmail account under a parent's supervision (Google Family Link). Some 7th graders are 12, so some students may need a parent to set up their account. Is that acceptable for the pilot? | REQ-3.2, REQ-10.1 |
| **Q-16** | **"Creator" or "builder"?** See the summary in my message. My recommendation: **creator** (in Hebrew: יוצר/ת שיעורים) for the person, and **lesson builder** for the editing screen. | Glossary |
| **Q-17** | **The name in Hebrew and Arabic.** On the test site I wrote Evolora as **אבולורה** in Hebrew and **إيفولورا** in Arabic. Are these the spellings you want? Also, the Arabic texts on the site were written by Claude; a native Arabic speaker (for example, an Arabic teacher) should check them before students see them. | REQ-9.1 |

| **Q-18** | **Marks on the 2nd attempt.** You decided: 2 attempts, a hint after the 1st wrong answer, the full solution and a check-again question after the 2nd. How many marks for a correct 2nd attempt? My proposal: half. | REQ-6.3 |
| **Q-19** | **Check-again question details** (REQ-4.17). (a) How many tries? My proposal: one, with no hint. (b) Does it change the grade? My proposal: no; the question already scored 0, and the check-again question only decides whether the teacher gets a red flag. | REQ-4.17 |
| **Q-20** | **The help line** (REQ-6.9). It needs AI. (a) Until AI is ready, should the help line send the student's question to the teacher as a message (REQ-5.16)? My recommendation: yes. (b) Red flag after how many messages? My proposal: after 5 messages from the student, if they still don't answer correctly. (c) The students are minors chatting with AI: the teacher can read every conversation, and the school must agree before we turn it on. OK? | REQ-6.9 |
| **Q-21** | **Levels** (REQ-4.18, 5.18, 6.10). (a) Level per class, not one for the whole school? A student may be strong in science and weak in English. My proposal: per class. (b) If the teacher changes a level in the middle of a lesson, it applies from the next question. (c) Students may notice they got fewer questions than a friend. Is that acceptable? (d) Should the teacher see each student's level next to their grade? My proposal: yes. | REQ-4.18, REQ-5.18, REQ-6.10 |
| **Q-23** | **Practice lessons** (REQ-4.20). You wrote that a practice lesson has "only questions that students saw before". Which do you mean? (a) **Questions on material already learned**: new questions that the creator writes for practice, like a math exercise sheet. (b) **The same questions again**: Evolora collects questions the students already met in learning lessons (for example, their check-again questions). (c) Both. Also: are practice lessons graded like learning lessons, or practice only? | REQ-4.20 |

### Answered (2026-11-20)

| # | Question | Answer |
|---|---|---|
| Q-26 | Extra practice questions? | Accepted as proposed: the creator marks extra practice questions, which are asked only until the student reaches the minimum; other questions are always asked; check-again answers count; open and audio answers don't; running out means moving on with a red flag to the teacher. (REQ-4.21) |
| Q-24 | Minimum questions per topic: who sets it, and what does it mean? | The teacher sets it when assigning; the creator gives a default (3 for the circles lesson, 1 for Archimedes). The student moves on to the next topic once they answer the minimum correctly. (REQ-4.21, 5.9) |
| Q-25 | A type-a-number question? | Yes. All of Gil's calculation questions in the circles lesson are typed in; one digit after the decimal point is enough. (REQ-4.22) |
| Q-22 | When to build each feature? | When the requirements are finished, Claude gives Gil a list of all features with suggested priorities, and Gil sets each one to one of 3 priority levels. (Roadmap, D-26) |
| Q-18 (part) | Attempts with hints? | 2 attempts for multiple choice. After the 1st wrong attempt, a hint; after the 2nd, the full solution and a check-again question. (REQ-4.16, 6.3) |
| Q-19 (part) | When is the check-again question asked? | Right away, after the full solution. (REQ-4.17) |
| Q-20 (part) | Does asking for help lower the grade? | No. (REQ-6.3, 6.9) |
| Q-21 (part) | Grade from which questions? | Only the questions the student received. (REQ-6.3, 6.10) |
| Q-1 | Which open licences? | CC BY-SA 4.0 for lessons, AGPL-3.0 for code. (REQ-1.1, D-5) |
| Q-2 | What does "private course" mean? | Unlisted: not in the course library; its lessons stay open. (REQ-4.10, D-12) |
| Q-3 | Student's choice: all lessons or some? | All of them, in any order. (REQ-5.8) |
| Q-5 | Redo: latest or best grade? | Latest. (REQ-6.5) |
| Q-6 | Open and audio questions in public courses? | Audio questions are skipped; written answers allowed for practice, not graded. Not MVP. (REQ-6.7) |
| Q-7 | Student in two classes with different required languages? | Possible (for example, Science in Hebrew, English class in English). Not MVP. (REQ-9.5) |
| Q-8 | Hosting? | Google Cloud. (REQ-11.2, D-10) |
| Q-9 | Web address? | **evoloraedu.org**, bought at Cloudflare. (REQ-11.2, D-14) |
| Q-10 | School approval before the pilot? | Not needed for now. (D-13) |
| Q-11 | First lesson? | "Density: Archimedes and his discovery", in the lessons_drafts folder. |
| Q-12 | Image rights? | All images in the Archimedes lesson are AI-generated, except the Renaissance woodcut from Wikimedia Commons. Every image must record its source, like Wikipedia. (REQ-4.15, D-20) |
| Q-13 | Questions inside the lesson? | Yes: add questions during the lesson, move the simulation and the videos into the lesson itself, and develop the lesson together in an Evolora lesson file (lessons/archimedes-density). |
| D-Q1 | First admin's school account? | School Google sign-in needs Ministry of Education approval, so the pilot uses regular Google accounts instead. (REQ-3.2, D-19) |
| D-Q2 | Separate test site? | Approved. Created as Firebase project evolora-test. (REQ-12.4, D-18) |
| D-Q3 | Email invites? | Approved: a free email service sending from noreply@evoloraedu.org (Milestone B). |
| D-Q4 | Test accounts? | Approved, with a one-click user switcher on the test site; Gil's own Google accounts can also be used. (REQ-12.5, REQ-12.6) |

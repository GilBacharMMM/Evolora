# Evolora: Requirements

**Status:** Draft 8: teacher screens added (2026-11-22); still in review
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

**REQ-1.1: Open and shared** (Priority 2: should have)
Every lesson in Evolora can be used by any teacher and copied and edited by any creator. The creator's name always stays attached to their work. Lessons are shared under the **CC BY-SA 4.0** licence (the Wikipedia licence). The software code is open source under the **AGPL-3.0** licence (a GNU licence for websites).

*Acceptance criteria:*
- [ ] Every lesson shows the name of its creator, and of the original creator if it is a copy.
- [ ] Every lesson shows that it is shared under CC BY-SA 4.0.
- [ ] Before publishing a lesson for the first time, the creator is told that it will be shared under this licence.

**REQ-1.2: Key principle: each student progresses at their own pace** (Priority 1: foundation)
A major goal of Evolora is individual progress. Slower students get more practice; fast and strong students go further and deeper. Many requirements serve this principle: student levels (REQ-5.18, 6.10), extra practice questions (REQ-4.21), opening lessons early for individual students (REQ-5.20), and course orders that let students choose their practice (REQ-5.8). Every new feature is checked against it.

*Acceptance criteria:*
- [ ] In one class, two students can be at different points of the same course: one has opened lessons ahead of the class, the other is still practising an earlier topic.

**REQ-1.3: Key principle: every student masters every level 1 question** (Priority 1: foundation)
Everything marked level 1 is the core that every student must know well. For every level 1 question, each student either answers it correctly (directly, after the hint, or through a check-again or extra practice question) or is **flagged** to the teacher. The teacher then makes sure the student understands, and clears the flag (REQ-5.19).

*Acceptance criteria:*
- [ ] For every student, the teacher can see which level 1 questions are not yet mastered: each one is either answered correctly or has an open red flag.
- [ ] A student with an open red flag stays visible on the class dashboard until the teacher clears it.

---

## 2. Users and roles

**REQ-2.1: Four roles** (Priority 1: foundation)
Evolora has four roles: **system admin**, **teacher**, **creator** and **student**. One person can hold several roles; for example, a teacher who switches on edit mode is also a creator. In stage 1 there is no lesson creation inside Evolora (D-33): Gil writes lessons with Claude as lesson files, so the creator role starts being used in Evolora only in stage 2.

*Acceptance criteria:*
- [ ] A system admin can see which role each person has.
- [ ] A person with several roles can reach the features of all of them without signing in again.

**REQ-2.2: System admin registers teachers** (Priority 1: foundation)
Only a system admin can make someone a teacher. Anyone else who signs in is a student. In stage 1 there are no admin screens: the system admin's tasks (adding teachers, loading lessons and courses, resetting the test site) are done by asking Claude (D-47). Admin screens come in stage 2.

*Acceptance criteria:*
- [ ] The admin enters a teacher's email address; when that person signs in, they see the teacher features.
- [ ] A person not registered as a teacher signs in and sees only student features.
- [ ] The admin can remove the teacher role from someone.

**REQ-2.3: Edit mode for teachers** (Priority: Later, stage 2; see D-33)
Any teacher can switch on edit mode to create and edit lessons and courses.

*Acceptance criteria:*
- [ ] A teacher can switch edit mode on and off.
- [ ] With edit mode on, the teacher sees the tools for creating and editing lessons.

**REQ-2.4: Creators who are not teachers** (Priority: Later)
A system admin can register a person as a creator only, for example someone from the Ministry of Education who writes lessons but does not run classes.

*Acceptance criteria:*
- [ ] A creator-only person can create and edit lessons but cannot create classes.

**REQ-2.5: Schools** (Priority 1: must have; Gil, 2026-11-24, D-69)
A **school** holds teachers. When the system admin makes someone a teacher, they also put them in a school (in stage 1, Claude does both, with no screen, D-47). Only teachers of the same school can be added to a class as co-teachers (REQ-5.5). Each class remembers the school of the teacher who created it.

*Acceptance criteria:*
- [ ] Teacher A and Teacher B are in the same school: A adds B to a class, and B sees it.
- [ ] Teacher C is in another school: A tries to add C, and sees a message that C is in a different school.

---

## 3. Accounts, sign-in and access

**REQ-3.1: Sign in with Google** (Priority 1: foundation)
People sign in with their Google account. There are no separate Evolora passwords.

*Acceptance criteria:*
- [ ] On a school Chromebook, clicking "Sign in with Google" takes you into Evolora with your Google account.

**REQ-3.2: Any Google account during the pilot** (Priority 1: foundation)
During the pilot, people sign in with a regular Google account, such as a Gmail address. School accounts (@taded.org.il) can't be used yet, because a website using them must first be approved by the Ministry of Education (decision D-19).

A new person who signs in is a student with no classes. They see nothing except an empty home page with a box to enter a class code. They can only see lessons once they join a class (OPEN Q-15).

*Acceptance criteria:*
- [ ] Signing in with a Gmail account works.
- [ ] A new person who hasn't joined a class sees only the "enter class code" box, and no lessons, classes or people.

**REQ-3.3: Other sign-in methods** (Priority: Later)
Allow school accounts (@taded.org.il) after Ministry of Education approval, and the Ministry of Education sign-in.

*Acceptance criteria:* to be written when this requirement is planned in detail.

**REQ-3.4: People only see what they are allowed to** (Priority 1: foundation)
Each person sees only what their role and classes allow.

*Acceptance criteria:*
- [ ] A student cannot open any teacher screen, even by typing its web address.
- [ ] A teacher cannot see a class they do not teach.
- [ ] A student cannot see another student's answers, grades or messages.

---

## 4. Lessons: content and creation

**Stage 1 (decision D-33):** lessons are not created inside Evolora. Gil, and pilot teachers who want to write lessons, write each lesson with Claude Code as a **lesson file** (REQ-4.25). Teachers send their finished lesson files to Gil, and Claude loads them into Evolora (REQ-4.24). Stage 1 concentrates on what teachers and students see and do.

So in this section, wherever a requirement says that "the creator writes" or "the creator sets" something (hints, levels, topics, video times and so on), in stage 1 this means it is written in the lesson file. The screens for creating and editing lessons inside Evolora (REQ-2.3, 4.1, the editing part of 4.2, the formula editor in 4.3, 4.6, 4.8) come in stage 2. Acceptance criteria that mention the lesson builder are checked in stage 2; in stage 1, the same check is done by Claude when loading the lesson file.

**REQ-4.1: Create a lesson** (Priority: Later, stage 2; see D-33)
In edit mode, a creator creates a lesson with a title, a short description, a lesson language (Hebrew, Arabic or English), a subject and a grade level.

*Acceptance criteria:*
- [ ] A creator can create a lesson, fill in these details, save it and find it again later.

**REQ-4.2: Lesson content blocks** (Priority 1: foundation)
A lesson is a sequence of blocks, shown to the student in order. In stage 1 the blocks come from the lesson file; in stage 2 the creator can also add, edit, reorder and delete them in the lesson builder. Block types:
- **Text**: with headings, bold, italics, lists and links
- **Note box**: a highlighted text box, for example "Historical note"
- **Quote**: a quotation, such as a verse from the Bible, shown in a classic Hebrew font (David), with its source under it (Gil, D-54)
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
- [ ] A test lesson with one block of each type shows every block correctly to a student.
- [ ] Gil's first lesson (Archimedes and density) can be fully rebuilt in Evolora: story text, 6 images with captions, the metals density table, note boxes, podcast link, videos, the density simulation and the questions.
- [ ] (Stage 2) A creator can move a block up or down and delete it.
- [ ] A YouTube video plays inside the lesson without leaving Evolora.
- [ ] In the circles lesson, each of the four videos plays inside the lesson, and the questions about it come right after it.
- [ ] If a simulation website refuses to be shown inside Evolora, the student sees a button that opens it in a new tab.
- [ ] In the circles lesson, the verse from the Book of Kings ("ויעש את הים מוצק...") is shown in a classic, Bible-like Hebrew font, with its source (ספר מלכים א', פרק ז', פסוק כ"ג) under it in the regular font.

**REQ-4.3: Formulas** (Priority 1: must have)
Formulas display properly inside Hebrew, Arabic and English text. In stage 1 formulas are written in the lesson file. In stage 2, creators write them with a visual editor (buttons and typing, no code).

*Acceptance criteria:*
- [ ] The formulas in the circles lesson (for example P = π × D and S = πR²) display correctly to the student.
- [ ] (Stage 2) A creator can write a fraction, a power, a square root and a Greek letter without typing any code.
- [ ] (Stage 2) The formula looks the same to the student as it did in the editor.
- [ ] A formula written inside a Hebrew (or Arabic) sentence is shown on a line of its own, left-to-right, so Hebrew and math are never mixed on one line (Gil, D-53). For example, in the circles lesson's solved example about a diameter of 14 cm, "R = D ÷ 2 = 14 ÷ 2 = 7 ס"מ" appears as "R = D ÷ 2 = 14 ÷ 2 = 7" on its own line under the Hebrew sentence, reading correctly from left to right, followed by the line "כלומר 7 ס"מ." (the unit is never inside the formula line).
- [ ] Formulas in tables and in answer choices stay where they are.

**REQ-4.4: Question types for the first version** (Priority 1: foundation)
- **Multiple choice**: one correct answer, or several. Checked automatically.
- **Open written answer**: checked by the teacher.
- **Recorded audio answer**: the student records on the Chromebook; checked by the teacher.

For each question, the lesson file (in stage 2, the creator) sets:
- the correct answer(s) (multiple choice)
- **grading instructions** describing a good answer (open and audio questions)
- (much later, D-56) a **grade weight**; until then every question counts equally

*Acceptance criteria:*
- [ ] A loaded lesson can contain each of the three question types, and each works for the student.
- [ ] A multiple choice question with two correct choices accepts only the right combination.
- [ ] The teacher sees the grading instructions of an open or audio question on the grading page (REQ-5.12).
- [ ] (Much later, D-56) A question given double weight in the lesson file counts double in the lesson grade.

**REQ-4.5: Questions block progress** (Priority 1: foundation)
When a student reaches a question, they must answer it before they can see the rest of the lesson. Attempts and scoring are in REQ-6.3.

*Acceptance criteria:*
- [ ] As a student, you cannot scroll or click past an unanswered question.

**REQ-4.6: Preview as a student** (Priority: Later, stage 2; see D-33)
A creator can go through the lesson exactly as a student would, without the answers being recorded as a real student's. In stage 1, Gil checks each new lesson on the test site as a test student instead (REQ-12.4, 12.5).

*Acceptance criteria:*
- [ ] A creator can preview a lesson, answer its questions, and no grade appears on any dashboard.

**REQ-4.7: Lesson versions** (Priority 3: later)
When a lesson that students have already started is changed (in stage 1: when Claude loads a new version of its lesson file), students who started it finish the version they started. Students who start it afterwards get the new version. Existing answers and grades are kept.

*Acceptance criteria:*
- [ ] Student A starts a lesson. A question is changed and the lesson loaded again. Student A still sees the old question.
- [ ] Student B starts the lesson after the change and sees the new question.
- [ ] Student A's earlier answers and grades are unchanged.

**REQ-4.8: Copy any lesson** (Priority: Later, stage 2; see D-33)
Any creator can copy any lesson and edit the copy as their own. The copy shows both the new creator and the original creator. The original lesson does not change.

*Acceptance criteria:*
- [ ] A creator copies another creator's lesson, edits it, and the original is unchanged.
- [ ] The copy shows "Based on a lesson by [original creator]".

**REQ-4.9: Lesson library** (Priority 3: later)
Teachers can browse and search all lessons by title, subject, grade level, language and creator, to choose lessons to assign.

*Acceptance criteria:*
- [ ] A teacher can find a lesson by searching its title.
- [ ] A teacher can filter lessons to show only Hebrew, 7th-grade math lessons.

**REQ-4.10: Courses** (Priority 1: must have)
A course is an ordered list of **teaching lessons**. Each teaching lesson has **zero or more practice lessons** (for example, none, one, or three), which the course's creator names and pairs with it. In stage 1, courses are written as **course files** by Gil with Claude, or by pilot teachers with Claude Code (sent to Gil, who loads them), like lessons (D-37). In stage 2, a teacher can also bundle lessons from the lesson library into a course inside Evolora. A course is either **public** (listed in the course library) or **private**, which means unlisted: it doesn't appear in the course library and only classes it is assigned to can use it, but its lessons are still open to everyone in the lesson library.

When a lesson is added to a course that classes already have, every class that has the course gets the new lesson by itself, with the same students as the rest of the course (D-72). The teacher doesn't need to give the course again. A lesson taken out of a course stays open to classes that already had it, so students don't lose their work.

*Acceptance criteria:*
- [ ] A course is given to a class. A practice lesson is then added to the course file and loaded. The class's students see the new practice lesson in the course and can open it, and the teacher sees it on the class's follow-up page, without giving the course again.
- [ ] A course file with 3 teaching lessons, the first with 2 practice lessons and the second with none, loads and shows the lessons in the right order and pairing.
- [ ] (Stage 2) A teacher can create a course from 3 existing lessons and change their order.
- [ ] A public course appears in the course library; a private one does not.
- [ ] The lessons inside a private course can still be found in the lesson library.

**REQ-4.15: Image sources** (Priority 2: should have)
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

**REQ-4.16: Two attempts, a hint and a full solution** (Priority 1: must have)
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

**REQ-4.17: Check-again questions** (Priority 1: must have)
The creator adds a bank of one or more **check-again questions** to each multiple choice and type-a-number question, to check that the student understands after seeing the full solution:
- If the question is a **calculation** (for example, "what is the density of this block?"), the check-again question is a similar calculation with different numbers or materials.
- If the question is about **understanding** (for example, "why did the king have a doubt?"), the check-again question asks the same thing in different words, mostly with different answers.

Right after the full solution (REQ-4.16), Evolora picks one check-again question from the bank at random and asks it. The check-again question has **2 attempts**, like the original question (Gil, Q-19): after a wrong 1st attempt the student tries again (the creator may write a hint for the check-again question; otherwise the original question's hint is shown again). If the 2nd attempt is wrong too, Evolora shows the correct answer, the teacher gets a **red flag** for that student and question, and the student continues. The check-again question doesn't change the grade: the original question already scored 0, and the check-again question decides only whether the teacher gets a red flag (Gil, Q-31).

*Acceptance criteria:*
- [ ] A creator can add several check-again questions under a multiple choice question.
- [ ] As a student, right after the full solution you get one check-again question; different students may get different ones.
- [ ] A wrong 1st answer to the check-again question lets the student try once more.
- [ ] Two wrong answers to the check-again question show its correct answer and send a red flag; the teacher sees it on the class dashboard (REQ-5.10) with the student's name and the question.
- [ ] Answering it correctly, on the 1st or 2nd attempt, sends no flag.

**REQ-4.18: Question levels** (Priority 2: should have)
Every question has a **level** from 1 to 3: 1 is the easiest, 3 the hardest. The creator sets it, and a new question starts at level 1. Who sees which questions is in REQ-6.10.

For example, in the Archimedes lesson most questions are level 1, the tungsten question is level 2, and the challenge question about ships is level 3.

*Acceptance criteria:*
- [ ] A creator can set each question to level 1, 2 or 3.
- [ ] (Stage 2) In the lesson builder, each question shows its level.

**REQ-4.19: Answers in random order** (Priority 2: should have)
In every multiple choice question (including check-again questions), Evolora shows the choices in a random order, different for each student, so that students sitting next to each other can't simply copy "the second answer". A student who leaves and comes back sees the same order as before.

*Acceptance criteria:*
- [ ] Two test students open the same question and see the choices in different orders (try a few questions; sometimes the order may match by chance).
- [ ] Closing and reopening the lesson keeps the same order for the same student.
- [ ] The correct answer is still marked correct, whatever its position.

**REQ-4.20: Teaching, practice and exam lessons** (Priority 1: must have)
Every lesson has a type, and students always see it marked on the lesson ("Teaching", "Practice" or "Exam"). When creating a lesson, the creator chooses its type:
- **Teaching lesson** (in Hebrew: שיעור הקניה): teaches new material, with text, media and questions, like the Archimedes lesson.
- **Practice lesson** (in Hebrew: שיעור תרגול): only questions, on material the students have already learned. No new material. This matters most in mathematics.
- **Exam** (in Hebrew: מבחן): questions only, like a practice lesson, but with exam rules (REQ-4.26).

*Acceptance criteria:*
- [ ] Every lesson shows its type ("Teaching", "Practice" or "Exam") on the course page, the class page and the lesson itself, in the student's language.
- [ ] The lesson library shows each lesson's type.
- [ ] A practice lesson contains questions only: new questions on material already taught, never new material (Gil, Q-23). Like other lessons, it can have hints, solutions, check-again questions, extra practice questions, levels and help tips.

**REQ-4.21: Topics, with a minimum number of questions** (Priority 1: must have)
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
- [ ] If a topic has fewer level 1 questions than the minimum, Claude's loading check warns about it (in stage 2, the lesson builder warns the creator), and the assignment screen warns the teacher (because level 1 students would not reach the minimum).
- [ ] As a test student in the circles lesson, the next topic opens only after you answer 3 questions in the current topic correctly.
- [ ] A student who answers every question correctly skips the extra practice questions.
- [ ] A student who gets one question wrong gets extra practice questions until they have 3 correct answers.
- [ ] A student who runs out of extra practice questions moves on, and the teacher sees a red flag.

**REQ-4.23: Videos inside the lesson** (Priority 1: must have)
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

**REQ-4.22: Type-a-number questions** (Priority 1: must have)
A new question type: the student types a number, and Evolora checks it automatically. The creator enters the correct answer and the unit (for example, "ס\"מ"), which is shown next to the box. An answer is accepted if it is correct to one digit after the decimal point: it may differ from the exact answer by up to 0.1. For example, if the exact answer is 11.46, then 11.5 and 11.4 are accepted, but 11 is not.

Type-a-number questions have the same 2 attempts, hint, full solution and check-again question as multiple choice questions (REQ-4.16, REQ-4.17).

*Acceptance criteria:*
- [ ] A creator can write a type-a-number question with its answer and unit.
- [ ] As a student, typing 11.5 or 11.46 for an exact answer of 11.46 is marked correct; typing 12 is marked wrong.
- [ ] The box accepts a decimal point and numbers like 7,850 or 7850, and rejects letters with a friendly message, without using up an attempt.
- [ ] In the circles lesson, all of Gil's calculation questions, and their check-again questions, are type-a-number questions.

**REQ-4.24: Loading lesson files** (Priority 1: foundation)
Claude loads a lesson file, with its images, into Evolora with one command (course files are loaded the same way, REQ-4.10): first into the test site, and after Gil has checked it there, into the real site. Before loading, Claude's loading check makes sure the file is complete: every block is a known type, every image has its file and source, every question has its answer, and every topic has enough questions. If anything is wrong, nothing is loaded and Claude reports what to fix. Loading a changed lesson again follows the lesson versions rule (REQ-4.7).

*Acceptance criteria:*
- [ ] The Archimedes lesson and the circles lesson are loaded into the test site, and look and work as described in their lesson files.
- [ ] A lesson file with a missing image source is refused, with a clear message saying which image.
- [ ] After Gil approves a lesson on the test site, the same lesson appears on the real site.
- [ ] Changing a lesson file and loading it again creates a new version (REQ-4.7); students in the middle of the old version are not affected.

**REQ-4.25: Lesson-writing kit for teachers** (Priority 1: foundation)
Pilot teachers can write lessons themselves with Claude Code, using the **lesson-writing kit** in `lessons/teacher-kit`:
- **Rules for Claude** (`lesson-rules-for-claude.md`): the teacher saves it as `CLAUDE.md` in an empty folder, and Claude Code then follows the lesson file format and the lesson rules (image rights, levels, hints, check-again questions, topics, privacy). Claude interviews the teacher, writes the lesson, suggests improvements and runs a final check.
- **A guide for teachers in Hebrew** (`מדריך-למורים.md`): the steps, in plain language, and the important rules. English and Arabic versions will be added later.

When the lesson is ready, the teacher sends the lesson folder (as a zip file) to Gil, who has Claude load it (REQ-4.24). The kit is kept up to date whenever what a lesson may contain changes.

*Acceptance criteria:*
- [ ] A pilot teacher who has never seen a lesson file follows the guide and, with Claude Code, produces a lesson that passes the loading check (REQ-4.24), at most after one round of fixes.
- [ ] The teacher never has to read or write the lesson file format themselves, unless they want to.
- [ ] When Claude is given an image copied from the internet, it explains why it can't be used and offers an alternative.
- [ ] When the lesson format changes, the kit is updated in the same change, and Gil is told to send the new version to the teachers.

**REQ-4.26: Exams** (Priority 3: later)
An exam is a lesson of type "Exam". It has questions only, and these rules:
- **One attempt** for every question. No hints, no full solution and no check-again question during the exam.
- **No extra practice questions**, and the minimum number of questions per topic doesn't apply.
- **The same questions for every student**, whatever their student level (levels don't apply in exams).
- Multiple choice answers still appear in random order for each student (REQ-4.19), to reduce copying.

Decided with Gil (Q-30):
- An exam opens only when the teacher opens it (REQ-5.20), or at the start of its **exam time window** (REQ-5.23), whatever the course order.
- Students can move between the exam's questions and change answers until they press "Submit exam"; after that, nothing can be changed.
- Students see their grade and the correct answers only when the teacher releases the results. The creator may write a full solution for each question, shown then.
- There is no countdown timer; instead, the teacher can set a time window, and can lock everything else during it (REQ-5.23).
- A wrong answer to a level 1 question in an exam sends a red flag, following the mastery principle (REQ-1.3).
- A student can retake an exam only if the teacher allows it.
- There are no help tips during an exam (REQ-6.15).

*Acceptance criteria:*
- [ ] In an exam, a wrong answer shows no hint and no solution, and the question can't be tried again.
- [ ] A level 1 test student and a level 3 test student get exactly the same exam questions.
- [ ] Two test students see the choices of the same question in different orders.
- [ ] An exam inside a course stays locked until the teacher opens it or its time window starts.
- [ ] During an exam, the help line and tips don't appear.

**REQ-4.11: Import from Google Docs and Word** (Priority: Later)
A creator can import a Google Doc or Word document, and Evolora turns it into a lesson: text, images and formulas become blocks.

*Acceptance criteria:* to be written when this requirement is planned in detail.

**REQ-4.12: More question types** (Priority: Later; drag-and-drop built first, at Gil's request, D-70)
Short answer checked automatically (a word or a number), math-expression answers, file or photo upload, and drag-and-drop questions (dragging snippets from a bank onto an image).

**Drag-and-drop checking (Gil, D-70):**
- The answer is right only when every spot has its right card.
- The student gets as many attempts as the number of cards (extra cards included) minus 2, and never fewer than 2.
- After each attempt, each placed card gets a green outline if right and a red outline if wrong. Right cards stay locked; wrong cards go back to the pile.
- The hint shows after the first wrong attempt.
- Grades: full on the first attempt, half on the second, a quarter on a later one, 0 if all fail.
- If all attempts fail, the solution shows the right card on every spot, and the teacher gets a red flag. There is no check-again question.

*Acceptance criteria:*
- [ ] As a student, in the circles teaching lesson, place the cards on the circle drawing by dragging, and also by clicking a card and then a spot: both work.
- [ ] Place one card wrongly and check: the right cards have a green outline and stay on their spots, the wrong card has a red outline and goes back to the pile, and the hint appears.
- [ ] The circle question (4 spots and 1 extra card, 5 cards) gives 3 attempts. A question with 4 cards or fewer gives 2.
- [ ] All cards right on the first attempt gives full marks; on the second, half; on the third, a quarter.
- [ ] Fail every attempt: the solution shows the right card on every spot, no check-again question appears, and the teacher sees a red flag for that student and question on the class dashboard.
- [ ] An extra card that fits nowhere can be left out, and the answer is still right.

**REQ-4.13: Simulations built into Evolora** (Priority: Later)
Interactive simulations that run inside Evolora rather than on an outside website.

*Acceptance criteria:* to be written when this requirement is planned in detail.

**REQ-4.14: Lesson marketplace** (Priority: Later)
A place to discover, rate and share lessons widely, beyond the school.

*Acceptance criteria:* to be written when this requirement is planned in detail.

**REQ-4.27: Teachers send comments to the lesson's creator** (Stage 2)
While going over a lesson (trying it, REQ-5.32), a teacher can attach a comment to any place in it: a block of material, a question, an answer, a hint or a solution, much like adding a comment in Microsoft Word. The teacher sends the comments to the lesson's creator.

- The creator gets an email saying that new comments arrived on the lesson, with a link.
- The creator has a **suggestions inbox** in Evolora listing all comments on their lessons: which lesson, where in the lesson, who sent it, when, and the text. Clicking a comment opens the lesson at that place.
- The creator can mark each comment "done" or "not taken"; the teacher who sent it sees that mark.

*Acceptance criteria:*
- [ ] As a teacher, try a lesson, add a comment on a question and another on a block of text, and send them.
- [ ] The lesson's creator receives an email about the new comments.
- [ ] As the creator, the suggestions inbox shows both comments; clicking one opens the lesson at that place.
- [ ] As the creator, mark one comment "done": as the teacher, you see it marked "done".

**REQ-4.28: Explanation after a right answer** (Priority 1: must have)
When a student answers a multiple choice or type-a-number question correctly, Evolora tells them it is right **and shows a short explanation of why**, so the student knows they got it right for the right reason and grows more confident (Gil, 2026-11-23). The creator writes this explanation in advance, in 1 or 2 sentences ("Why it's right").

- If the creator didn't write one, Evolora shows the full solution (REQ-4.16) instead.
- A check-again question (REQ-4.17) may have its own explanation; if it has none, Evolora shows its correct answer only.
- Writing an explanation for every question is **good practice** for creators, and is in the lesson-writing rules. It is not required: the lesson check gives a reminder (a warning) when explanations are missing, but the lesson can still be loaded.
- Not in exams: during an exam students don't see whether they were right (REQ-4.26).
- In the future, AI can suggest explanations for the creator to approve (REQ-7.2).

*Acceptance criteria:*
- [ ] As a student, answer a question correctly on the first try: you see that it's right and its short explanation.
- [ ] Answer a question correctly on the second try (after the hint): you also see the explanation.
- [ ] For a question without a written explanation, a correct answer shows the full solution.
- [ ] In an exam, no explanation appears after answering.
- [ ] Checking a lesson that has questions without explanations gives a warning that names how many, and the lesson still loads.

---

**REQ-4.29: Explanations of words, shown on hover** (Stage 2)
A creator can mark a word or term in the lesson text and attach a short explanation to it. The word is shown underlined with a dotted line, and the explanation opens in a small window when the student moves the mouse over it (or taps it). This replaces explanations written in brackets inside the sentence, which interrupt reading. For example, in the circles lesson: "עשר **אמות**", with the explanation "אמה בתנ"ך היא בערך 45 ס"מ, האורך של יד מהמרפק עד קצה האצבעות" (Gil, 2026-11-23).

*Acceptance criteria:*
- [ ] In the circles lesson, the word "אמות" is underlined with a dotted line, and moving the mouse over it shows the explanation of a cubit in a small window, without the explanation in brackets.
- [ ] Moving the mouse away closes the window.
- [ ] A creator can add an explanation to a word in the lesson file (and in stage 2, in the lesson builder).

**REQ-4.30: Fill-in-the-blanks questions** (Priority 2: should have; Gil, D-78)
The student sees a text with missing words (blanks) and fills each blank with a word or two. There are three kinds; one question uses one kind:
- **Typed:** the student types into each blank.
- **Choose in each blank:** each blank has a dropdown list of words, in random order.
- **Word list:** the words are shown as cards below the text, in random order. The student drags a card into a blank, or clicks a card and then a blank, as in drag-and-drop questions (REQ-4.12). Each card is used once. The writer may add extra cards that fit nowhere.

**Checking typed blanks:** extra spaces, nikud and punctuation are ignored. The writer may give more than one right answer for a blank (for example "זהב" or "הזהב"). A typing mistake counts as wrong.

**In teaching and practice lessons**, checking works like drag-and-drop (D-70):
- The answer is right only when every blank is right.
- Attempts: the number of blanks minus 2 (for the word list: the number of cards, extra cards included, minus 2), and never fewer than 2.
- After each attempt, each blank gets a green outline if it's right and a red outline if it's wrong. Right blanks are locked; wrong ones are emptied, to fill again.
- The hint shows after the first wrong attempt.
- Grades: full marks on the first attempt, half on the second, a quarter on a later one, 0 if every attempt fails.
- If every attempt fails, the solution shows the right word in every blank, and the teacher gets a red flag. There is no check-again question.

**In exams:** one attempt. The grade is the share of blanks that are right (3 of 4 right gives 75% of the question's marks). As with every exam question, nothing shows as right or wrong until the exam ends.

Fill-in-the-blanks questions can be used in every type of lesson: teaching lessons, practice lessons and exams, and any type added later.

*Acceptance criteria:*
- [ ] As a student, in the Archimedes teaching lesson, answer the three demo questions (typed, choose in each blank, word list) about the crown.
- [ ] Typed: "הזהב" and "זהב " are accepted where the writer allowed them; "זהבב" is wrong.
- [ ] The dropdown words and the word-list cards are in a different order for different students.
- [ ] Fill one blank wrongly: it gets a red outline and empties, the right blanks get a green outline and stay, and the hint shows.
- [ ] The crown question with 4 blanks gives 2 attempts; a word list with 4 words and 1 extra card gives 3.
- [ ] Fail every attempt: the solution shows every right word, and the teacher sees a red flag on the class dashboard.
- [ ] In an exam with this question, 3 of 4 blanks right gives 75% of the question's marks, shown only when the exam ends.

## 5. Class management (teachers)

**REQ-5.1: Create a class** (Priority 1: must have)
A teacher creates a class with a name, such as "Grade 7B Science".

*Acceptance criteria:*
- [ ] A teacher creates a class and sees it in their list of classes.

**REQ-5.2: Join with a class code** (Priority 1: must have)
Each class has a unique **class code**, made by Evolora. On their home page, a student clicks **"Join a class"** and types the code. They join at once, with no approval needed.

The code, similar to Google Classroom's:
- is 7 characters long: letters and digits, without characters that are easy to confuse (0 and O, 1, I and L)
- is made at random, so it can't be guessed
- ends with a **check character**, so a typing mistake is caught at once ("check the code") instead of joining a wrong class
- works in upper or lower case
- After 10 wrong codes in a row, the student must wait 5 minutes before trying again. This stops computer programs from trying many codes.

The teacher can **reset** the code (the old one stops working) and **turn joining off**, for example once all students have joined.

*Acceptance criteria:*
- [ ] A teacher sees the class code and can copy it.
- [ ] A student enters the code and the class appears in their list.
- [ ] A wrong code shows a clear message.
- [ ] A teacher can create a new code, after which the old one stops working.
- [ ] With joining turned off, the code doesn't work, and the student sees a message saying the class is closed to new students.
- [ ] A code with one character mistyped is rejected with "check the code".
- [ ] After 10 wrong codes in a row, the student sees a message asking them to wait 5 minutes.
- [ ] A student can't leave a class on their own; only the teacher can remove a student (REQ-5.4).

**REQ-5.3: Join by email invite** (Priority 3: later)
A teacher enters students' email addresses. Each student gets an email with a link that adds them to the class.

*Acceptance criteria:*
- [ ] A teacher invites a student by email; the student receives the email, clicks the link, and joins the class.
- [ ] The teacher can paste a list of many email addresses at once.

**REQ-5.4: Class list** (Priority 1: must have)
A teacher sees the list of students in a class and can remove a student.

*Acceptance criteria:*
- [ ] A removed student no longer sees the class, but their past work is kept for the teacher.

**REQ-5.5: Co-teachers** (Priority 1: must have; raised by Gil on 2026-11-23, D-66)
A teacher can add other teachers **of the same school** (REQ-2.5) to a class. All teachers of a class have the same permissions. When two teachers change the same thing (for example, a grade or a due date), the last change counts.

*Acceptance criteria:*
- [ ] Teacher A adds Teacher B to a class; Teacher B sees the class and can do everything Teacher A can.
- [ ] Teacher A sets a grade to 80, Teacher B then sets it to 90; the grade is 90.

**REQ-5.6: Many classes per student** (Priority 1: must have)
A student can belong to any number of classes, with different teachers.

*Acceptance criteria:*
- [ ] A student in two classes sees both, with each class's own assignments.

**REQ-5.7: Assign lessons** (Priority 1: must have)
A teacher can assign a single lesson, a course, or any selection of lessons, to the whole class or to selected students.

*Acceptance criteria:*
- [ ] A teacher assigns a lesson to the whole class; every student in the class sees it.
- [ ] A teacher assigns a lesson to 3 students only; only those 3 see it.
- [ ] A student who joins the class later also receives assignments given to the whole class.

**REQ-5.8: Course order** (Priority 2: should have; until then, lessons open one after another)
When assigning a course, the teacher chooses how its lessons open for each student:
- **One after another**: learning A → practice A → learning B → practice B, and so on. Each lesson opens when the one before it is finished.
- **Paired** (recommended): teaching lessons open in order, each one when the previous teaching lesson is finished. The practice lessons of every finished teaching lesson are open, and the student does them in any order, whenever they like.
- **Any order**: everything is open from the start. The teacher sees it marked "optional, not recommended".

In every order, the student must finish all the lessons for the course to count as done, and the teacher can open any lesson early (REQ-5.20). For a selection of single lessons, the same three choices apply.

*Acceptance criteria:*
- [ ] In "one after another", practice A is locked until learning A is finished, and learning B until practice A is finished.
- [ ] In "paired", finishing learning A opens practice A and learning B together; finishing learning B opens learning C even if practice A isn't done yet.
- [ ] In "any order", all lessons are open, and the assignment screen shows "optional, not recommended" next to this choice.
- [ ] The course counts as done only when all its lessons are finished.

**REQ-5.9: Assignment settings** (Priority 2: should have)
When assigning, the teacher sets:
- **Due date** (optional), and what happens after it: the grade is reduced by a set percentage, or the lesson is locked.
- **Redo counts**: whether redoing a finished lesson replaces its grade (see REQ-6.5).
- **Who checks open answers**: in the MVP, always the teacher. AI options are in REQ-7.1.
- **Minimum questions per topic**: starts at the lesson's default, set by the creator (REQ-4.21); the teacher can change it.
- **Students see grades**: yes or no (REQ-5.22).
- For exams: an optional **time window** and **lock** (REQ-5.23).

*Acceptance criteria:*
- [ ] With "reduce by 10% after the due date", a lesson finished late gets 10% off its grade.
- [ ] With "lock after the due date", a student cannot open an unfinished lesson after the due date.
- [ ] A teacher can extend the due date for the whole class or for one student, and the lesson opens again for them.

**REQ-5.10: Class dashboard** (Priority 1: must have)
For each class, the teacher sees one table with a row per student (Gil, Q-33). The columns:
- **status**: a colour with a word (REQ-12.3):
  - **red**: the student has an open red flag (REQ-5.19)
  - **orange**: the student is behind: more than 1 lesson behind the middle of the class in a course
  - **soft yellow**: an assignment is past its due date and unfinished
  - **green**: everything else

  When more than one applies, the most serious shows, in this order: red, orange, yellow (Gil, Q-41). The rules are kept in one place so they can be changed after trying them. A small **star** marks students who are ahead of the class, so strong students are noticed too (REQ-1.2).
- **level**, with **− and +** buttons to change it, and a **suggested change** when the student's average is well above or below their current level (REQ-5.18)
- **where they are** in each course (the progress map, REQ-5.24)
- **average grade**, **open flags**, and **when they last worked**

The table can be sorted by any column. Clicking a student opens their student page (REQ-5.28).

*Acceptance criteria:*
- [ ] The dashboard shows every student in the class with a status colour and a word.
- [ ] A student with an open red flag shows red; one with an unfinished assignment past its due date, and no flag, shows soft yellow; one more than 1 lesson behind the middle of the class shows orange.
- [ ] A student ahead of the class has a star.
- [ ] Pressing + next to a student's level raises it by one; the change is saved at once.
- [ ] A student whose average is well above their level shows a suggested change, which the teacher can accept with one click or ignore.
- [ ] Clicking a column header sorts the table by it.
- [ ] Red flags from check-again questions (REQ-4.17), from drag-and-drop questions (REQ-4.12) and, later, from the help line (REQ-6.9) appear here, saying which question caused them.

**REQ-5.11: Grade dashboard** (Priority 1: must have)
A teacher sees grades per class, per course, per lesson and per question. An unfinished lesson counts as grade 0 and is clearly marked as not done. The grade table can be downloaded as a **CSV file** (a spreadsheet file), for example to copy grades into the school's system, Smart School (Gil, Q-39).

*Acceptance criteria:*
- [ ] A teacher sees a table of students and lessons with a grade in each cell.
- [ ] A teacher can open one lesson and see each student's result per question.
- [ ] Lessons not finished show "not done" and count as 0 in averages.
- [ ] Pending grades (waiting for the teacher) are shown as pending, not as 0.
- [ ] Clicking "Download as CSV" saves a file that opens in a spreadsheet program, with a row per student and a column per lesson.

**REQ-5.12: Grading page** (Priority 1: must have; marking up answers: priority 3)
In a class, when the teacher opens a lesson that has open or audio answers, a button **"Grade open answers"** opens the grading page. It shows one answer at a time (Gil, 2026-11-22):
- **at the top**: the question and its grading instructions
- **below it**: the student's answer
- **below that**: in stage 2, the AI's suggested grade and comment (REQ-7.1); and the teacher's own grade and comment, which the teacher can change at any time

**Grade:** a score for the question out of its full marks, with quick buttons for full, half and zero marks, or any number.

**Marking up the answer (Gil, D-64):** the teacher marks up the student's written answer **in place**, like "track changes" in Word: click into the answer and type, with no button to open first. Deleted words stay visible, crossed out; the teacher's words appear in the teacher's colour (purple), underlined. Selecting words shows a small **Highlight** button. Ctrl+Z undoes, and **Undo all changes** returns the original. Changes are marked exactly where they were made, so fixing a comma marks only the comma. The student sees the highlights, the edits and the comment when the work comes back to them.

**Audio answers** have a player for the recording instead; the teacher comments in writing or by recording audio (REQ-5.13).

**Moving around:**
- sideways: the same question for the next or previous student in the class. The arrows follow the reading direction, so in Hebrew and Arabic the left arrow goes to the next student.
- up and down: the next or previous question for the same student.
- keyboard shortcuts: Alt + arrow keys, so the plain arrow keys still move inside the comment box.

The page shows how many answers are graded ("graded 7 of 24"), has a button to jump to the next answer not yet graded, and lets the teacher **send the answer back for corrections** (REQ-5.14) from the same page. Moving to another student or question saves what the teacher changed (grade, comment, mark-up or recorded comment), as if they had pressed the save button; a comment without a grade is saved too (Gil, D-68).

*Acceptance criteria:*
- [ ] Clicking "Grade open answers" on a lesson opens the first answer not yet graded, with the question and grading instructions above it.
- [ ] In Hebrew, the left arrow (or Alt + left) shows the same question for the next student; the down arrow (or Alt + down) shows the next question for the same student.
- [ ] Pressing "half" sets half of the question's full marks; typing a number also works.
- [ ] A teacher highlights two words and replaces one word in their colour; signed in as that student after the work is returned, the student sees the highlight, the crossed-out word and the teacher's word in colour.
- [ ] Audio answers can be played on the page.
- [ ] The counter shows how many answers are graded, and "next not graded" skips graded ones.
- [ ] After grading, the student's lesson grade is no longer pending.
- [ ] On the grading page, click into a student's written answer and type: no button is needed, the new words appear purple and underlined, and deleted words stay visible, crossed out.
- [ ] Select words: a Highlight button appears next to them, and pressing it marks them yellow.
- [ ] Remove only a comma: only the comma is crossed out. Ctrl+Z undoes the last change, and "Undo all changes" returns the original answer.
- [ ] Move to the next student, then sign in as the student: the marked-up answer shows the same marks.

**REQ-5.13: Teacher comments** (Priority 1: must have; audio comments: priority 3)
A teacher can add a comment to any answer, either written or as an audio recording, on the grading page (REQ-5.12).

*Acceptance criteria:*
- [ ] A teacher records a short audio comment on a student's answer; the student can play it.

**REQ-5.14: Send back for review or corrections** (Priority 2: should have)
A teacher can send a finished lesson, or selected questions from it, back to a student:
- **For review**: the student must read or listen to the comments.
- **For corrections**: the student must also answer those questions again; the new answers are graded again.

When sending back, the teacher marks either (Gil, D-68):
- **the student must go over it before going on**: lessons of the same course that the student hasn't started yet stay locked until they do; or
- **at their own time**: nothing is locked.

In either case, a lesson the student is in the middle of isn't stopped.

**Correcting an open answer (Gil, D-77):**
- The student sees their last answer, with the teacher's marks and comment, under "Your last answer was:". It can't be edited.
- Below it is an empty box: "Write a new answer, based on your teacher's corrections."
- The student sends the new answer once, and it waits for the teacher's grade, as the first time.
- On the grading page, the teacher sees both answers, one above the other: the last answer with its marks, which can't be changed any more, and the new answer, which the teacher marks up and grades.
- If it still needs work, the teacher can send it back again; each time is counted (REQ-5.34).

*Acceptance criteria:*
- [ ] As a teacher, mark up and comment on an open answer, then send it back for corrections. As the student, the question shows "Your last answer was:" with the marks and comment, which can't be edited, and an empty box below.
- [ ] As the student, send the new answer: it waits for grading, with no second attempt.
- [ ] As the teacher, the grading page shows the last answer with its marks (not editable) above the new answer, which can be marked up and graded.
- [ ] After a lesson is sent back for review, the student sees the comments, and new lessons are locked until they open them.
- [ ] After questions are sent back for corrections, the student can answer those questions again, and the teacher sees the new answers to grade.

**REQ-5.15: Teacher controls grades** (Priority 2: should have)
A teacher can change any grade, up or down, at any time.

*Acceptance criteria:*
- [ ] A teacher changes an automatic grade from 67 to 100; the student and dashboard show 100.

**REQ-5.16: Messages** (Priority 3: later)
Each student has one private conversation with the teachers of each class they are in. All teachers of the class share it. No one else can see it. Students cannot message each other.

*Acceptance criteria:*
- [ ] A student sends a question; both teachers of the class can see and answer it.
- [ ] A teacher of a different class cannot see it.
- [ ] The student sees a notice when a teacher replies.
- [ ] There is no way for a student to message another student.

**REQ-5.18: Student levels (secret)** (Priority 2: should have)
Each student has a **student level** from 1 to 3 **in each class** (Gil, Q-21): a student can be at level 3 in science and level 2 in English. Only the class's teachers can see it; the student and other students never do. Every student starts at level 2. Only a teacher can raise or lower a student's level, and the change stays until the teacher changes it again. A change made while a student is in the middle of a lesson applies from the next question.

To help the teacher, Evolora **keeps suggesting** levels, based on average grades in the class: it suggests lowering the weakest 10% of the class to level 1, and raising the strongest 10% to level 3. It also suggests a change when a student's average is well above or below what fits their current level, for example a level 1 student who now does better than half the class (Gil, Q-33). The average is taken from the lessons finished in the class in the last 4 weeks, including lessons whose grades are hidden from students, and only after the student has at least 5 graded lessons, so one bad day doesn't move anyone (Gil, Q-38). The suggestions appear on the class dashboard all the time, and the teacher accepts or ignores each one; nothing changes without the teacher. The teacher sees every student's level on the class dashboard (REQ-5.10).

*Acceptance criteria:*
- [ ] On the class list, a teacher sees each student's level and can change it.
- [ ] A new student in the class is at level 2.
- [ ] In a class of 20 test students, the dashboard suggests level 1 for the 2 lowest averages and level 3 for the 2 highest, and nothing changes until the teacher accepts.
- [ ] A student moved to level 3 in one class is still at level 2 in another class.
- [ ] The class dashboard shows each student's level.
- [ ] Signed in as a student, you cannot see your level anywhere.

**REQ-5.19: Clearing a red flag** (Priority 1: must have)
A red flag stays until the teacher clears it. After making sure the student understands (for example, by talking with them), the teacher clears the flag, optionally with a short note. Cleared flags stay in the student's history.

*Acceptance criteria:*
- [ ] A teacher clears a student's red flag; the student's status on the dashboard updates.
- [ ] The teacher can still see the cleared flag, with the date and note, in the student's history.

**REQ-5.20: Opening lessons early for individual students** (Priority 1: must have)
In any course order, the teacher can open any lesson of the course early: for the whole class, or for one or more students they choose. This lets strong students move ahead (REQ-1.2).

*Acceptance criteria:*
- [ ] A teacher opens teaching lesson D for 2 students only; only they see it as open, and for everyone else it stays locked.

**REQ-5.21: Archiving courses** (Priority 3: later)
At the end of a semester (or any time), a teacher can archive a course in a class. It moves to "Archived courses" on the students' class page (REQ-6.11). Students can still open its lessons to read them, and grades are kept.

*Acceptance criteria:*
- [ ] After archiving, the course appears under "Archived courses" for every student in the class.

**REQ-5.22: Whether students see their grades** (Priority 2: should have)
Students should learn without the stress of grades. So when assigning, the teacher chooses whether students see the grades of that assignment. The defaults (Gil, 2026-11-22):
- **teaching lessons**: students don't see grades
- **practice lessons**: students see grades
- **exams**: students see grades (after the teacher releases the results, REQ-4.26)

When grades are hidden, the student still sees whether each answer is right, the hints, the solutions and their progress (lessons done), but no marks or grades anywhere for that assignment. The teacher always sees all grades, to understand each student's level and see who needs support.

*Acceptance criteria:*
- [ ] Assigning a teaching lesson, the "students see grades" setting starts as "no"; for a practice lesson or an exam it starts as "yes".
- [ ] With grades hidden, a student finishes the lesson and sees no grade or marks on the lesson, course page, class page or home page, but still sees which answers were right.
- [ ] The teacher sees the grades of the same lesson on the grade dashboard.

**REQ-5.23: Exam time window and lock** (Priority 3: later)
When assigning an exam, the teacher can set a **time window** (a date, a start time and an end time). The exam opens at the start and closes at the end. A student who hasn't pressed "Submit exam" by the end has their answers submitted automatically (Gil, Q-31).

The teacher can turn on an **exam timer** (on by default when there is a time window). The timer shows the student how much time is left until the window ends, and a notice appears 5 minutes before the end, saying the exam will be submitted automatically.

During the window, the teacher can **lock** Evolora for the class's students, so that only the exam can be opened:
- **in this class**: the class's other lessons can't be opened, or
- **in all of Evolora**: nothing else can be opened, including other classes and messages.

Locking works in two layers (Gil, Q-31):
- **The Chromebook**: during exams, the school's Google Admin allows only Evolora's web address on the students' Chromebooks, so students can't open other websites. This is set up by the school's IT person, not inside Evolora. (Google Classroom's "locked mode" can't do this: it works only with Google Forms quizzes.)
- **Inside Evolora**: Evolora's own lock shows only the exam, because the school's tool can't tell Evolora's exam apart from Evolora's lessons.

*Acceptance criteria:*
- [ ] An exam with a window of 10:00 to 10:45 can't be opened at 9:55, opens at 10:00 and closes at 10:45.
- [ ] With "lock in this class", during the window a student can open the exam but not the class's other lessons; other classes still work.
- [ ] With "lock in all of Evolora", during the window the student can open only the exam.
- [ ] After the window ends, everything opens again.
- [ ] With the timer on, the student sees the time left, and a notice 5 minutes before the end; with the timer off, neither appears.
- [ ] A student still working when the window ends finds their answers submitted, and the teacher sees them.

**REQ-5.24: Progress map** (Priority 1: must have)
On the class dashboard, the teacher sees where each student is in each course: which lessons each student has finished, and which they are working on, so it is clear at a glance who is ahead and who is behind (REQ-1.2; Gil, Q-27).

*Acceptance criteria:*
- [ ] In a class where students are at different points of the same course, the progress map shows each student's current lesson.

**REQ-5.25: "Not yet mastered" list** (Priority 2: should have)
For each student, the teacher sees a list of the level 1 questions the student hasn't mastered yet: questions they didn't answer correctly, with any open red flags (REQ-1.3; Gil, Q-27).

*Acceptance criteria:*
- [ ] A test student who answered one level 1 question wrongly twice, and its check-again question wrongly twice, has that question on their "not yet mastered" list, with its red flag.
- [ ] After the teacher clears the flag (REQ-5.19), the question leaves the list.

**REQ-5.26: Nudge when a student runs out of work** (Priority: Later)
When a student finishes everything open to them, the teacher gets a nudge suggesting to open more lessons or raise the student's level (Gil, Q-27).

*Acceptance criteria:*
- [ ] As a student, finish every lesson open to you: the teacher sees a nudge for that student, suggesting to open more lessons or raise the level.
- [ ] Once the teacher opens a new lesson for the student, the nudge disappears.

**REQ-5.27: Teacher's home page** (Priority 1: must have)
After signing in, a teacher sees a card for each of their classes, like the student's home page. Each card shows what needs attention in that class: open red flags, answers waiting to be graded, unread messages and level suggestions. Beside the cards, a teacher **"To do" list** shows the same items for all classes together (Gil, Q-32).

*Acceptance criteria:*
- [ ] A teacher with 2 classes sees 2 cards, each with its own counts.
- [ ] The "To do" list shows an open red flag, an answer to grade and an unread message, and clicking each opens the right screen.

**REQ-5.28: Student page** (Priority 2: should have)
For one student in one class, the teacher sees (Gil, Q-34):
- their progress in each course, and their grades
- the "not yet mastered" list, with red flags to clear (REQ-5.25, 5.19)
- how many help tips they opened (REQ-6.15)
- how many times their answers were sent back for corrections (REQ-5.34), and, in stage 2, the time on each lesson and the time away (REQ-5.33)
- their level, with − and + buttons, and the suggested change, if any (REQ-5.18)
- a box to **message the student** (REQ-5.16)
- **teacher notes**: private notes about the student, seen only by the class's teachers, never by the student (for example, "talked with the parents; needs more time on fractions")

*Acceptance criteria:*
- [ ] A teacher writes a teacher note; a co-teacher of the class sees it; the student can't see it anywhere.
- [ ] A teacher changes the student's level with − or + on this page, and the class dashboard shows the new level.
- [ ] A teacher sends a message from this page, and the student sees it in their messages.

**REQ-5.29: Which questions are hard for the class** (Priority 3: later)
For every lesson, and for every exam after its results are released, the teacher sees each question's **success rate**: how many students got it right on the 1st attempt, on the 2nd, and not at all. This shows what to teach again (Gil, Q-35).

*Acceptance criteria:*
- [ ] In a lesson where 4 of 10 test students got question 3 right on the 1st attempt, the teacher sees "40% right on the 1st attempt" for that question.

**REQ-5.30: Live view during class** (Priority: Later)
A screen for when the class works on a lesson together: who is working right now, on which question, and who is stuck (Gil, Q-36: later).

*Acceptance criteria:* to be written when this requirement is planned in detail.

**REQ-5.31: Daily email summary for teachers** (Priority 3: later)
Besides seeing everything inside Evolora, each teacher can get one email a day with what is new: red flags, answers to grade and messages. Each teacher can turn it off (Gil, Q-37).

*Acceptance criteria:*
- [ ] A teacher with the email on gets one email a day listing the new items; with it off, no email arrives.

**REQ-5.32: Teacher tries a lesson** (Priority 2: should have)
A teacher can try any lesson or exam they can see, straight from the teacher screens: from the lesson list, from a course, and from a class's assigned lessons. This works both before the lesson is given to students and after. The teacher goes through the lesson exactly as a student would: questions block progress, wrong answers show the hint, then the solution and a check-again question, and help tips work. A clear banner says "Trying the lesson: answers are not saved".

- What the teacher does while trying is never recorded as a student's: it does not appear on any dashboard, grade table, grading page or CSV, and it does not change any student's level or the question success rates.
- The teacher can leave at any moment and start again from the beginning.
- After the lesson is given to students, trying it shows the same version the students get (REQ-4.7).
- Each question also has two buttons only the teacher sees: **Skip** (move on without answering) and **Show answer** (show the correct answer and the full solution), so checking a long lesson is quick (Gil, Q-43).

This is different from REQ-4.6, which is about a lesson's creator previewing it while writing it inside Evolora (stage 2).

*Acceptance criteria:*
- [ ] As a teacher, open a lesson that is not yet given to any class and press "Try the lesson": it opens like the student's lesson, with the "Trying the lesson" banner.
- [ ] Answer a question wrongly: the hint appears and you get a second attempt, as a student would.
- [ ] Give the same lesson to a class, then try it again from that class's page: it still works, and it is the same version the students see.
- [ ] After trying, the class dashboard, grade table, grading page and CSV show nothing from your attempt.
- [ ] Leave in the middle and press "Try the lesson" again: it starts from the beginning.
- [ ] On any question, press **Skip**: the lesson moves on. Press **Show answer**: the correct answer and the full solution appear.
- [ ] Signed in as a student, the lesson has no Skip or Show answer buttons.

**REQ-5.33: Time on each lesson, and time away** (Stage 2; Gil, Q-44)
For each student and each lesson, Evolora measures:
- **Total time**: from the moment the student started the lesson to the moment they finished it, in real-world time, even when it took several sittings.
- **Net time**: only the time the student was actually working. The counter stops when the student is **away** and starts again when they come back.

The student counts as **away** when:
- the Evolora tab is not the one in front (another tab, or another app, is in front), or the browser is closed or minimised, or the computer is closed or asleep; or
- there has been no mouse, keyboard or touch screen use for **2 minutes**. While a video or audio in the lesson is playing, the student is not away for this reason (only while the tab is in front).

Evolora also counts the **times away** (every time, however short) and the **time away** in each lesson. A student who keeps wandering off is not well concentrated, so the teacher should see it (Gil).

- **Where the teacher sees it:** on the student page (REQ-5.28), for each lesson: total time, net time, times away and time away. On the class dashboard (REQ-5.10), a small sign next to a student who was **away a lot** in a lesson.
- **Away a lot:** more times away in one lesson than a number the teacher sets for the class; the default is **5**. Being away a lot also gives the teacher a **red flag** for that student and lesson, cleared like any red flag (REQ-5.19).
- Evolora can't know what the student did while away (which tab or app), and doesn't try to.
- Students are told about this in a general note in the terms of use (Gil).

*Acceptance criteria:*
- [ ] As a student, work on a lesson for 5 minutes, close the laptop for 10 minutes, then finish it in 5 more minutes. As the teacher, the student page shows a total time of about 20 minutes and a net time of about 10 minutes.
- [ ] As a student, switch to another tab 3 times during a lesson, for a few seconds each time: the student page shows 3 times away.
- [ ] As a student, leave the lesson open without touching anything for 3 minutes: that counts as one time away, and the net time grows by only about 2 minutes.
- [ ] As a student, watch a 4-minute video in the lesson without touching anything: no time away is counted.
- [ ] As a student, leave the tab 6 times in one lesson (default number 5): the class dashboard shows the "away a lot" sign and a red flag for that student.
- [ ] As the teacher, change the number to 10 for the class: the same student no longer gets the sign for a new lesson with 6 times away.

**REQ-5.34: Count of answers sent back for corrections** (Priority 2: should have; Gil, Q-45)
For each student, Evolora counts how many times the teacher sent their answers back for corrections (REQ-5.14). A high number shows a problem, so the teacher should notice it.
- **Student page** (REQ-5.28): the count for each lesson and the total for each course.
- **Class dashboard** (REQ-5.10): the total per course, and a warning sign when it reaches a number the teacher sets for the class; the default is **10** in one course.

*Acceptance criteria:*
- [ ] As a teacher, send a student's answers back for corrections twice in one lesson and once in another lesson of the same course: the student page shows 2 and 1, and a course total of 3.
- [ ] With the default number (10), the warning sign appears on the class dashboard when the student reaches 10 in one course, not before.
- [ ] As the teacher, change the number to 3 for the class: the warning sign appears for that student at once.

**REQ-5.17: Google Classroom connection** (Priority: Later)
Import class lists from Google Classroom, and possibly post assignments and grades back to it. See the advice in the open questions summary.

*Acceptance criteria:* to be written when this requirement is planned in detail.

---

## 6. Student learning

**REQ-6.1: Student home page** (Priority 1: must have)
After signing in, a student sees a page similar to Google Classroom:
- a **card for each class** they belong to, with the class name, the teacher's name and a colour
- a **"Join a class"** button (REQ-5.2)
- a **"To do" list** beside the cards: lessons waiting in all their classes, those with the nearest due date first, and their pending notes
- (Stage 2) an **"Open courses"** tab and an **"Open classroom"** card (REQ-6.7)

*Acceptance criteria:*
- [ ] After signing in, a student sees what to do next, without searching.
- [ ] A student in 2 classes sees 2 cards, and clicking a card opens that class (REQ-6.11).
- [ ] The "To do" list shows the lesson with the nearest due date at the top.
- [ ] Pending notes are clearly highlighted.

**REQ-6.11: Class page for students** (Priority 1: must have)
Inside a class, the student sees, from top to bottom:
1. **Active courses**: usually one per semester, sometimes more.
2. **Waiting lessons**: single lessons the teacher assigned outside a course, for example extra work for this student or the class.
3. **Finished this semester**: courses and single lessons the student has finished.
4. **Archived courses**: courses the teacher has archived, for example from past semesters (REQ-5.21).

*Acceptance criteria:*
- [ ] A test student sees an active course and a single waiting lesson in separate sections.
- [ ] After finishing the single lesson, it moves to "Finished this semester".
- [ ] A course the teacher archived appears under "Archived courses".

**REQ-6.12: Course page for students** (Priority 1: must have)
Inside a course, the student sees all its lessons in order, each teaching lesson with its practice lessons. Every lesson shows its status: **open**, **done**, or **locked**. Locked lessons show their titles, greyed out, so students see what's ahead. Which lessons are open follows the course order the teacher chose (REQ-5.8) and any lessons the teacher opened early (REQ-5.20).

*Acceptance criteria:*
- [ ] Locked lessons show their titles, greyed out, and can't be opened.
- [ ] A practice lesson appears under the teaching lesson it belongs to.
- [ ] The course page shows the percentage done (REQ-6.4).

**REQ-6.13: Going back to finished lessons** (Priority 2: should have)
A student can open any finished lesson again, to read it and see their own answers. This is not a redo: answers can't be changed and the grade stays (redo is REQ-6.5).

*Acceptance criteria:*
- [ ] A student opens a finished lesson and sees the material and their answers, without being able to change them.

**REQ-6.14: Asking for more practice** (Priority: Later, stage 2)
On a finished lesson, a student can ask for more practice, and gets more questions on the same topics.

*Acceptance criteria:*
- [ ] As a student, on a finished lesson, press "More practice": you get new questions on the same topics, not ones you already answered.

**REQ-6.2: Taking a lesson** (Priority 1: foundation)
The student moves through the lesson block by block: reads, watches, listens and answers questions. If they leave, they continue from the same point next time.

*Acceptance criteria:*
- [ ] A student closes the lesson in the middle and later returns to exactly where they stopped.
- [ ] Answers already given are kept.

**REQ-6.3: Attempts and scoring** (Priority 1: foundation)
For multiple choice questions, a student has **2 attempts** (REQ-4.16):
- correct on the 1st attempt: full marks
- correct on the 2nd attempt, after the hint: half the marks (Gil, Q-18)
- 2 wrong attempts: the full solution is shown, the question scores 0, and a check-again question follows (REQ-4.17)

For open and audio questions, the student submits once and continues. The lesson grade stays **pending** until the teacher grades them.

The lesson grade is based only on the questions the student received (see REQ-6.10). Using the help line or help tips (REQ-6.9, 6.15) never lowers the grade. Whether the student sees the grade is set per assignment (REQ-5.22).

*Acceptance criteria:*
- [ ] A wrong answer says it is wrong, shows the hint and lets you try once more.
- [ ] After 2 wrong attempts, the full solution is shown and you can continue.
- [ ] A question answered correctly on the 2nd attempt scores half its marks.
- [ ] A lesson with an open question shows "grade pending" until the teacher grades it.

**REQ-6.4: Student progress view** (Priority 1: must have)
For each course or set of assigned lessons, the student sees the titles of the lessons ahead, which are done, and the percentage complete, with a progress bar.

*Acceptance criteria:*
- [ ] A student who finished 2 of 5 lessons sees 40% and the titles of the remaining 3.

**REQ-6.5: Redo a lesson** (Priority 3: later)
A student can redo a finished lesson. If the teacher allowed it when assigning (REQ-5.9), the grade of the latest redo replaces the old one, even if it is lower. Otherwise the redo is for practice only.

*Acceptance criteria:*
- [ ] With "redo counts" on, redoing a lesson with a better result raises the grade.
- [ ] With "redo counts" on, redoing a lesson with a worse result lowers the grade.
- [ ] With it off, the grade stays the same after a redo.

**REQ-6.6: Recording audio answers** (Priority 3: later)
A student can record, listen back to, re-record and submit an audio answer on a Chromebook.

*Acceptance criteria:*
- [ ] The first time, the browser asks for microphone permission; after allowing it, recording works.
- [ ] The student can listen to the recording before submitting.

**REQ-6.7: Public courses without a teacher** (Priority: Later, stage 2)
On their home page, a student has an **"Open courses"** tab, where they can browse public courses and enroll in one on their own, as they please, without a grade. All the open courses a student joined are grouped in one card on their home page, called **"Open classroom"**. Open courses use the **paired** course order (REQ-5.8). In stage 1 only Gil publishes open courses, through Claude. Automatically checked questions work as usual. Audio questions are skipped. Open written questions can be answered for practice, but are not graded. No teacher reviews their work.

*Acceptance criteria:*
- [ ] A student enrolls in a public course and sees it on their home page.
- [ ] Automatically checked questions work as usual.
- [ ] Audio questions don't appear.
- [ ] Open written questions can be answered, and show "practice, not graded".

**REQ-6.8: Game-like progress** (Priority: Later)
A more playful progress display (for example, a figure advancing along a path, like in a building-block instruction booklet) and possibly points or coins.

*Acceptance criteria:* to be written when this requirement is planned in detail.

**REQ-6.9: "I didn't understand" help line with AI** (Priority: Later, stage 2; uses AI)
Under every question there is a help line: **"I didn't understand ______, please explain."** The student fills in the gap and sends it. AI answers in writing and tries to help **without revealing the answer**. It may go on for a few messages back and forth.

The help must stay on the subject of the question. If the student asks about anything else (for example, a chocolate cake recipe), the AI politely refuses and brings them back to the question.

Asking for help never lowers the student's grade (Gil, Q-20). If, after a few messages back and forth, the student still can't answer the question, the teacher gets a **red flag**. The class's teachers can read every help conversation. The school must agree before students chat with AI. Until AI is ready, the help line shows the lesson's written help tips instead (REQ-6.15).

*Acceptance criteria:*
- [ ] Every question shows the help line.
- [ ] Asking "I didn't understand what density is" gets a short explanation that doesn't give away the answer.
- [ ] Asking directly "what is the answer?" gets help, not the answer.
- [ ] Asking for a cake recipe gets a polite refusal and a reminder to stay on the question.
- [ ] After the set number of messages without a correct answer, the teacher sees a red flag.
- [ ] A teacher can open and read a student's help conversation.

**REQ-6.15: Help tips (the help line before AI)** (Priority 1: must have)
Until AI help is ready (REQ-6.9), every question shows the line **"I didn't understand… show me a tip"**. It opens the question's **help tips**: short explanations written in advance in the lesson file, each with a title the student can choose (for example, "What is a radius?" or "How do I multiply by 3.14?"). Tips explain the ideas and methods needed for the question, but **never give its answer**. Opening tips never lowers the grade, and there are no tips in exams (REQ-4.26). *Proposed:* the teacher can see how many tips each student opened on each question, as another sign of who needs support.

*Acceptance criteria:*
- [ ] Under a question with tips, a student clicks "I didn't understand…" and sees the list of tip titles; clicking a title shows the tip.
- [ ] No tip contains the answer to its question.
- [ ] Opening tips doesn't change the grade.
- [ ] In an exam, no tips appear.

**REQ-6.10: Each student sees questions up to their level** (Priority 2: should have)
A student sees only questions at or below their student level (REQ-5.18), and the lesson simply skips the others:
- level 1 student: level 1 questions only
- level 2 student: levels 1 and 2
- level 3 student: all questions

The lesson grade is calculated only from the questions the student received (Gil, Q-21). The teacher sees each student's level next to their grade. Students may notice that a friend got more questions; that is acceptable (Gil, Q-31).

*Acceptance criteria:*
- [ ] Signed in as a level 1 test student, the Archimedes lesson has no tungsten question and no ships question.
- [ ] As a level 2 student, you get the tungsten question but not the ships question.
- [ ] As a level 3 student, you get both.
- [ ] Nothing on the student's screen says that questions were skipped.

---

## 7. AI features (all Later, stage 2)

The MVP has no AI. The design must leave room for it. Gemini is preferred because the school has approved it. Before building any AI feature, Claude will prepare an estimate of its running costs for Gil to approve.

**REQ-7.1: AI grading options** (Priority: Later)
When assigning, the teacher chooses who checks open answers:
- (a) the teacher
- (b) AI grades, the teacher approves
- (c) AI grades and writes a comment, the teacher approves
- (d) AI grades and comments, without the teacher; the teacher can still look at the dashboard

*Acceptance criteria:*
- [ ] As a teacher, when assigning, choose each of the four options (a) to (d), and check that open answers are graded by the right person, with or without an AI comment.
- [ ] With option (b) or (c), no AI grade reaches the student before the teacher approves it.
- [ ] With option (d), the student gets the AI grade and comment, and the teacher still sees them on the dashboard.

**REQ-7.2: AI help and AI-suggested check-again questions** (Priority: Later)
The help line is in REQ-6.9. In addition, AI may suggest check-again questions (REQ-4.17) and explanations for right answers (REQ-4.28) for the creator to approve or change.

*Acceptance criteria:* to be written when this requirement is planned in detail.

**REQ-7.3: AI lesson suggestion** (Priority: Later)
A creator gives Evolora a document; Evolora suggests a complete lesson, which the creator reviews and improves. AI can also suggest improvements to existing lessons.

*Acceptance criteria:* to be written when this requirement is planned in detail.

**REQ-7.4: Audio transcription** (Priority: Later)
Audio answers are turned into text by AI (see REQ-10.5).

*Acceptance criteria:*
- [ ] As a student, record an audio answer: as the teacher, the grading page shows the recording and its text.

**REQ-7.5: Automatic translation of lessons** (Priority: Later)
A lesson can be translated into another language, and the translation reviewed by a person.

*Acceptance criteria:* to be written when this requirement is planned in detail.

**REQ-7.6: Teacher sees a student's answered lesson, with the AI conversations** (Stage 2)
From the student page (REQ-5.28) or the class dashboard, a teacher can open any lesson a student has worked on and see it as the student went through it: each question with the student's answers and attempts, the hints and solutions they got, the help tips they opened, and the full conversation they had with the AI help line (REQ-6.9) next to the question it was about. This helps the teacher understand what the student needs.

- Students are told, in the help line itself, that their teacher can read these conversations.
- Only the student's own teachers (and co-teachers of that class) can see them.

*Acceptance criteria:*
- [ ] As a student, answer a question wrongly and ask the AI help line about it. As that student's teacher, open the student's lesson: you see the wrong answer, the second attempt and the whole AI conversation, placed by that question.
- [ ] As a student, the AI help line says that the teacher can read the conversation.
- [ ] As a teacher of a different class, you cannot open this student's lesson.

**REQ-7.7: AI summary of a student's difficulties** (Stage 2)
When a student finishes a lesson in which they talked to the AI help line, the AI writes a short summary for the teacher: which questions the student asked about, what they found hard and what doubts they had. The summary appears on the student's card on the student page (REQ-5.28), with a link to the full conversations (REQ-7.6). A lesson without AI conversations gets no summary.

*Acceptance criteria:*
- [ ] As a student, finish a lesson after asking the AI help line about two questions. As the teacher, the student's card shows a short summary naming those two questions and what the student found hard, with a link to the conversations.
- [ ] As a student, finish a lesson without using the AI help line: no summary appears.
- [ ] The summary is written in the teacher's language.
---

## 8. Subjects and age groups

**REQ-8.1: Any subject, grades 7 to 12** (Priority 1: foundation)
Evolora is not tied to any subject. Lessons are tagged with a subject and a grade level (7 to 12). The pilot is 7th grade.

*Acceptance criteria:*
- [ ] A creator can choose a subject from a list (or add a new one) and a grade from 7 to 12.

---

## 9. Language and right-to-left support

**REQ-9.1: Interface in Hebrew, Arabic and English** (Priority 1: foundation)
All menus, buttons and messages are available in Hebrew, Arabic and English.

*Acceptance criteria:*
- [ ] Switching the interface language changes every menu and button to that language.
- [ ] No untranslated text appears in any screen.

**REQ-9.2: Right-to-left and left-to-right layout** (Priority 1: foundation)
In Hebrew and Arabic, the whole layout is right-to-left; in English, left-to-right.

*Acceptance criteria:*
- [ ] In Hebrew, menus, text alignment, progress bars and arrows run right-to-left.
- [ ] In English, they run left-to-right.

**REQ-9.3: Lesson content in its own direction** (Priority 1: foundation)
A lesson is displayed in its own language direction, whatever the interface language. Mixed text, such as English words or numbers inside a Hebrew sentence, displays correctly.

*Acceptance criteria:*
- [ ] A Hebrew lesson shown in the English interface is still right-to-left.
- [ ] A Hebrew sentence containing an English term and a number reads correctly.

**REQ-9.4: Choose interface language** (Priority 1: foundation)
A new person's interface starts in their browser's language, if it is Hebrew, Arabic or English, and in English otherwise. Each person can change their interface language at any time, without anyone's approval, and Evolora remembers it.

*Acceptance criteria:*
- [ ] A student switches to Arabic, signs out and in again, and still sees Arabic.
- [ ] On a computer whose browser is set to Arabic, a new student sees Arabic at first sign-in; with a browser set to French, they see English.

**REQ-9.6: Teacher changes a student's interface language** (Priority 3: later)
A teacher can change a student's interface language remotely, for example when a student is stuck in a language they don't read.

*Acceptance criteria:*
- [ ] A teacher changes a student's language to Hebrew; the next time the student opens Evolora, it is in Hebrew.

**REQ-9.5: Class language setting** (Priority: Later)
A teacher sets a class language and chooses whether students must use it or may choose. A student can be in classes with different required languages (for example, Science in Hebrew and English class in English); the class's language applies while the student is inside that class.

*Acceptance criteria:*
- [ ] With the language set to English and required, students see the English interface inside that class.
- [ ] The same student sees Hebrew inside their Hebrew-only Science class.

---

## 10. Privacy, safety and protection of minors

Most students are minors (12 to 18). During the pilot, not every privacy rule will be fully met, and no formal school approval is needed (decision D-13). The requirements below are the minimum. Full compliance comes before any wider release (REQ-10.6).

**REQ-10.1: Strangers see nothing** (Priority 1: foundation)
Anyone with a Google account can sign in (REQ-3.2), so a person who hasn't joined a class must see no lessons, classes, names or student work.

*Acceptance criteria:*
- [ ] A Google account that has never joined a class sees only the "enter class code" box.

**REQ-10.7: Alerting the system admin about attempts to guess class codes** (Priority 3: later)
Evolora tells the system admin when someone may be trying to guess class codes:
- when one person enters **more than 10 wrong class codes** (the point where they must wait 5 minutes, REQ-5.2), and
- when the number of wrong class codes in a week, across all of Evolora, is **more than twice the average of past weeks**.

The alert says who tried (their Google account), how many times and when. In stage 1 there is no admin page (D-47), so alerts are sent by email only, at most once a day; the weekly comparison starts after 4 weeks of use, so there is a fair average to compare with (Gil, Q-29).

*Acceptance criteria:*
- [ ] On the test site, a test student enters 11 wrong codes; the system admin sees an alert naming that student.
- [ ] With made-up numbers on the test site (an average of 20 wrong codes a week, then 45 in one week), the system admin gets the weekly alert.

**REQ-10.8: Terms of use** (Priority 1: must have; Gil, Q-46)
Evolora has short **terms of use**, written in plain language in Hebrew, Arabic and English, that say what Evolora records about students and teachers, who can see it, and how long it is kept. They include, as each feature arrives:
- **Answers and grades**: every answer, attempt, hint and solution seen, and every grade and teacher comment. Only the student and their class's teachers see them (REQ-10.3).
- **Audio recordings** (Gil, 2026-11-25): students' recorded answers (REQ-6.6) and teachers' recorded comments (REQ-5.13). Only the student and their class's teachers can listen to them. They are kept until the end of the school year and then deleted, or turned into text and deleted sooner (REQ-10.5).
- **Time on lessons and time away** (Gil, 2026-11-25): total and net time per lesson, and how many times and for how long the student was away (REQ-5.33). Evolora never knows what else the student did while away.
- **Conversations with the AI help line** (stage 2): the student's class teachers can read them (REQ-7.6).
- **Where the data is kept**: on Google Cloud in Israel (REQ-10.4). No advertising, and student data is never sold or shared outside the school.

How people see and agree to them:
- On first sign-in, before anything else, Evolora shows a short summary, a link to the full text and an **"I agree"** button. Nobody can use Evolora without agreeing.
- When the terms change, everyone sees the new summary and agrees again at their next sign-in.
- A **"Terms of use"** link at the bottom of every page opens the full text at any time.

Claude drafts the text for Gil to edit and approve. A lawyer checks it before Evolora is used beyond the pilot (REQ-10.6). For the pilot, the school also sends parents a short letter (Claude drafts it) explaining Evolora and what it records.

*Acceptance criteria:*
- [ ] Sign in for the first time with a new test student: the terms summary and the "I agree" button appear before anything else, and nothing else can be opened until you agree.
- [ ] Agree, sign out and sign in again: the terms don't appear again.
- [ ] Claude loads a changed version of the terms: at the next sign-in, the test student must agree again.
- [ ] The "Terms of use" link at the bottom of any page opens the full text, in the language Evolora is shown in.
- [ ] The full text has a part about audio recordings and a part about time measurement.

**REQ-10.2: Private messages** (Priority 3: later)
See REQ-5.16. Messages are visible only to the student and that class's teachers.

*Acceptance criteria:*
- [ ] See the acceptance criteria of REQ-5.16.

**REQ-10.3: Students cannot see each other's work** (Priority 1: foundation)
See REQ-3.4.

*Acceptance criteria:*
- [ ] See the acceptance criteria of REQ-3.4.

**REQ-10.4: Data stored in a safe place** (Priority 1: foundation)
Student data is stored on Google Cloud in its Israel (Tel Aviv) region, and is backed up daily.

*Acceptance criteria:*
- [ ] Claude can show Gil, in the hosting control panel, where the data is stored and when the last backup ran.

**REQ-10.5: Keeping audio recordings** (Priority: Later)
Audio recordings are kept until the end of the school year (end of July) and then deleted, or transcribed to text by AI and deleted sooner. The choice depends on AI costs.

*Acceptance criteria:*
- [ ] On the test site, with the date set after the end of July, recordings from the past school year are deleted, and the grading page says the recording was deleted.

**REQ-10.6: Full privacy compliance** (Priority: Later)
Before Evolora is used beyond the pilot, it must meet Israeli privacy law and Ministry of Education rules for student data.

*Acceptance criteria:* to be written when this requirement is planned in detail.

---

## 11. Platform, hosting and scale

**REQ-11.1: Web app for Chromebooks and laptops** (Priority 1: foundation)
Evolora is a website. It works in **Google Chrome only**: on school Chromebooks, and in Chrome on Windows and Mac laptops and computers (Gil, Q-40). In any other browser (for example Edge, Safari or Firefox), Evolora shows only a short message, in the person's language, asking them to open it in Chrome, with a link to download Chrome. Phones are not supported; they may come much later, if needed.

*Acceptance criteria:*
- [ ] Every screen works on a school Chromebook, at its normal screen size, without zooming.
- [ ] The same screens work in Chrome on a Windows laptop and on a Mac, including recording an audio answer.
- [ ] Opening Evolora in Edge or Safari shows only the "please open in Chrome" message, with a link to download Chrome.

**REQ-11.2: Cloud hosting and own web address** (Priority 1: foundation)
Evolora runs on Google Cloud (Firebase) and is reached at **evoloraedu.org**.

*Acceptance criteria:*
- [ ] Typing evoloraedu.org in Chrome opens the Evolora sign-in page.
- [ ] The browser shows the address as secure (padlock icon).

**REQ-11.3: Pilot size** (Priority 1: foundation)
Evolora supports 5 teachers and 120 students, with at least one full class of 30 students working at the same time. It can grow later.

*Acceptance criteria:*
- [ ] With 30 students working in the same lesson at once, pages still open quickly (see REQ-12.1).

---

## 12. Quality: speed, reliability, accessibility

**REQ-12.1: Speed** (Priority 1: foundation)
On the school network, pages open within 3 seconds and answers are checked within 1 second.

*Acceptance criteria:*
- [ ] During a class session, no page takes noticeably longer than 3 seconds to open.

**REQ-12.2: No lost work** (Priority 1: foundation)
An answer is saved as soon as the student submits it. If the internet connection drops, the student sees a clear message, and nothing already submitted is lost.

*Acceptance criteria:*
- [ ] Turning off Wi-Fi in the middle of a lesson shows a message; after turning it back on, the student continues without losing answers.

**REQ-12.3: Basic accessibility** (Priority 1: foundation)
Text is readable, colours are not the only way information is shown (status colours also have a label or icon), and main actions work with the keyboard. Lesson text is real text (not pictures of text), so the Chromebook's built-in **"Select to speak"** can read it aloud for students who struggle with reading. Teachers are told about this in their guide.

*Acceptance criteria:*
- [ ] Each status colour on the dashboard also shows a word or icon.
- [ ] With "Select to speak" turned on, a student selects a paragraph of a Hebrew lesson on a Chromebook and hears it read aloud; the same works in Arabic and English.
- [ ] The teachers' guide explains how to turn on "Select to speak".

**REQ-12.7: One design language** (Priority 1: foundation)
All screens share one **design language** (in Hebrew: שפה עיצובית): colours, fonts, icons, spacing and the look of buttons and cards. Claude proposes it, with mockups Gil can click through, and Gil approves it before the screens are built (D-38).

*Acceptance criteria:*
- [ ] Gil has approved the design language from mockups.
- [ ] The student and teacher screens look like parts of the same product, in Hebrew, Arabic and English.

---

**REQ-12.4: Test site** (Priority 1: foundation)
There is a separate test site, with made-up data only, where Gil checks every new feature before it goes to the real site (decision D-18).

*Acceptance criteria:*
- [ ] The test site has its own address and clearly shows a "TEST SITE" banner on every screen.
- [ ] Nothing done on the test site appears on the real site, and the other way round.

**REQ-12.5: Switching users on the test site** (Priority 1: foundation)
On the test site only, Gil can switch between made-up test users (for example, "Test Teacher 1" or "Test Student 3") with one click, without signing out. This lets Gil see each screen as each role. Gil's own Google accounts can also be used.

*Acceptance criteria:*
- [ ] On the test site, a "Switch user" menu lists the test users with their roles.
- [ ] Choosing a test user shows Evolora exactly as that person would see it.
- [ ] The "Switch user" menu doesn't exist on the real site.

**REQ-12.8: Students-only test address** (Priority 1: foundation)
A second address for the test site lets a student test Evolora and look for bugs without being able to act as a teacher (D-71). It shows the same test data, but its "Switch user" list has only the test students, and it has no Google sign-in. It opens in Hebrew, whatever the browser's language; the language can still be changed.

**Closed (Gil, 2026-11-26):** the students-only test address is closed and shows "Site not found". Deploying to the test site must leave it closed (deploy only the full address). To open it again, Claude deploys it again, at Gil's request.

*Acceptance criteria:*
- [ ] At https://evolora-test-students.web.app, in a browser that has never opened it (for example, an English one), the page is in Hebrew.
- [ ] At https://evolora-test-students.web.app, the sign-in page lists Test Student 1 to 7 and no teachers, and has no "Sign in with Google" button.
- [ ] Choosing a test student there shows Evolora as that student, with the same classes and work as on the full test site.
- [ ] At https://evolora-test.web.app, everything works as before, including switching to Test Teacher 1 and 2.

**REQ-12.6: Ready-made test data** (Priority 1: foundation)
The test site can be filled with a standard set of test data with one command, by Claude: test teachers, test students, a test class, the Archimedes lesson with its two practice lessons, the circles lesson and the circles practice lesson, with their two demo courses (`courses/circles-demo.md`, `courses/density-demo.md`). It can be reset to that state at any time.

**Test Student 5 comes with finished work (Gil, 2026-11-25):** after every reset, Test Student 5 has finished the Archimedes teaching lesson and the circles teaching lesson, so Gil can try grading without filling in answers first.
- The answers are chosen at random on each reset: some right on the first attempt, some on the second, some wrong.
- Written answers are filler text ("lorem ipsum"); the audio answer is a short test recording.
- The written and audio answers wait for the teacher to grade them.

*Acceptance criteria:*
- [ ] After a reset, the test site has the same test users, class and lesson as before, and no leftover answers, except Test Student 5's.
- [ ] After a reset, Test Teacher 1 sees Test Student 5's written and audio answers in the Archimedes and circles teaching lessons waiting to be graded, and the class dashboard shows Test Student 5 has finished both lessons.
- [ ] After a second reset, Test Student 5's answers are different.
- [ ] The test students include at least one student at each level (1, 2 and 3), so REQ-6.10 can be checked.

## 13. Out of scope for now

- Phone apps
- Student-to-student communication
- Parents' access
- Payment of any kind

---

## 14. Open questions

### Still open

| # | Question | Notes |
|---|---|---|
| Q-47 | Suggested level changes (REQ-5.18): when is a student's average "well above or below what fits their level"? | Gil: to be decided later (D-61, point 3). Until then only the 10% rule is built: after 5 graded lessons in 4 weeks, the weakest 10% of the class are suggested level 1 and the strongest 10% level 3. |
| Q-48 | Parents' letter (REQ-10.8): a notice, or a consent form? | Gil is asking the school (2026-11-26): did parents sign the Ministry's general consent for digital tools in the parents' portal, and how does the school treat a tool the Ministry hasn't approved? Voice recordings may need parents' consent (research, docs/moe-approval-steps.he.md section 7.1). |

### Answered (2026-11-20)

| # | Question | Answer |
|---|---|---|
| Q-14 | Lessons on GitHub? | Yes. The original Word files stay out of GitHub once converted (they also contain images without permission). |
| Q-15 | Who may sign in? | As proposed: anyone with a Google account may sign in, but sees nothing until joining a class; under-13 Gmail accounts through Family Link are acceptable. (REQ-3.2, 10.1) |
| Q-16 | "Creator" or "builder"? | Creator for the person, lesson builder for the editing screen (stage 2). |
| Q-17 | Hebrew and Arabic spelling of the name | OK. The name stays Evolora (D-27). |
| Q-18 | Marks for a correct 2nd attempt? | Half. Also: the teacher chooses whether students see grades; by default hidden for teaching lessons, shown for practice lessons and exams. (REQ-6.3, 5.22) |
| Q-19 | Check-again question tries? | Two attempts, like the original question. (REQ-4.17) |
| Q-20 | The help line before AI? | In the demo, written help tips in the lessons instead of AI. (REQ-6.15) |
| Q-21 | Levels | Per class; a teacher's change stays until the teacher changes it again; Evolora keeps suggesting (weakest 10% lower, strongest 10% to level 3); the teacher sees levels on the dashboard. (REQ-5.18, 6.10) |
| Q-23 | Practice lessons | New questions on material already taught; no new material. (REQ-4.20) |
| Q-27 | More support for individual progress | Agreed: progress map and "not yet mastered" list in the MVP, the nudge later. (REQ-5.24 to 5.26) |
| Q-29 | Class-code guessing alerts | On the admin's page and by email at most once a day; weekly comparison after 4 weeks. (REQ-10.7) |
| Q-30 | Exams | As proposed, but instead of "no time limit": the teacher can set a time window and lock everything else during it. (REQ-4.26, 5.23) |
| Q-41 | Status colour order | Red, then orange (behind), then soft yellow (past due). (REQ-5.10) |
| Q-4 | Status colours | Red = open red flag; orange = behind the class; **soft yellow = past due date**; green = everything else; a star for students ahead. (REQ-5.10) |
| Q-32 | Teacher's home page | Class cards with what needs attention, and a teacher "To do" list. (REQ-5.27) |
| Q-33 | Class dashboard | One table per class, with − and + to change levels and a suggested change when the average is well above or below the level. (REQ-5.10) |
| Q-34 | Student page | As proposed, plus − and + for the level, messaging the student, and private teacher notes the student can't see. (REQ-5.28) |
| Q-35 | Hard questions | Success rate for every question. (REQ-5.29) |
| Q-36 | Live view | Later. (REQ-5.30) |
| Q-37 | Notifications | Inside Evolora, plus an optional daily email. (REQ-5.31) |
| Q-42 | Priority of teacher tries a lesson | Priority 2: should have (Gil, 2026-11-23). (REQ-5.32) |
| Q-43 | Shortcuts while trying | Like a student, plus Skip and Show answer buttons. (REQ-5.32) |
| Q-44 | Time on lesson | Total and net time, times away and time away. Away = tab not in front, or no use for 2 minutes (a playing video counts as use); every time away counts; "away a lot" above a number the teacher sets (default 5) gives a sign and a red flag; stage 2 (Gil, 2026-11-25). (REQ-5.33) |
| Q-45 | Sent back for corrections | Counted per lesson and per course; warning above a number the teacher sets (default 10 in a course); priority 2 (Gil, 2026-11-25). (REQ-5.34) |
| Q-46 | Terms of use | Claude drafts, Gil approves, a lawyer checks before wider use; "I agree" at first sign-in and when the terms change; a letter to parents from the school for the pilot; priority 1 (Gil, 2026-11-25). (REQ-10.8) |
| Q-38 | Level suggestions | Average of the last 4 weeks, after at least 5 graded lessons. (REQ-5.18) |
| Q-39 | Exporting grades | The school uses Smart School; a CSV download is enough. (REQ-5.11) |
| Q-40 | Devices | Chromebooks and Windows and Mac laptops, in Google Chrome only; other browsers (Edge, Safari) are blocked for now with a "please use Chrome" message; phones much later, maybe never. Level suggestions confirmed. (REQ-11.1, 5.18) |
| Q-31 | Follow-ups: check-again and grade; fewer questions; exam end; Chromebook lock | Check-again questions don't change the grade; fewer questions than a friend is OK; answers are submitted automatically at the end of the exam window, with a timer the teacher can turn on or off and a notice before the end; the school's Google Admin allows only Evolora's address during exams, and Evolora locks itself to show only the exam. (REQ-4.17, 6.10, 5.23) |
| Q-26 | Extra practice questions? | Accepted as proposed: the creator marks extra practice questions, which are asked only until the student reaches the minimum; other questions are always asked; check-again answers count; open and audio answers don't; running out means moving on with a red flag to the teacher. (REQ-4.21) |
| Q-24 | Minimum questions per topic: who sets it, and what does it mean? | The teacher sets it when assigning; the creator gives a default (3 for the circles lesson, 1 for Archimedes). The student moves on to the next topic once they answer the minimum correctly. (REQ-4.21, 5.9) |
| Q-25 | A type-a-number question? | Yes. All of Gil's calculation questions in the circles lesson are typed in; one digit after the decimal point is enough. (REQ-4.22) |
| Student screens (2026-11-22) | Home page, joining, class page, course page, course orders, open courses, language | Class cards with a "To do" list; open courses in stage 2; 7-character class codes with a check character and a 5-minute pause after 10 wrong tries; joining needs no approval, only the teacher removes students; class page sections down to archived courses; locked lessons greyed out with titles; three course orders with "any order" not recommended; any lesson can be opened early for chosen students; 0 or more practice lessons per teaching lesson; courses as course files in stage 1; browser language first. (REQ-5.2, 5.8, 6.1, 6.7, 6.11 to 6.14, 9.4, 9.6) |
| Q-28 | The "16." in Gil's message? | A typing mistake; nothing to add. |
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
| Q-13 | Questions inside the lesson? | Yes: add questions during the lesson, move the simulation and the videos into the lesson itself, and develop the lesson together in an Evolora lesson file (now lessons/archimedes-density-teaching). |
| D-Q1 | First admin's school account? | School Google sign-in needs Ministry of Education approval, so the pilot uses regular Google accounts instead. (REQ-3.2, D-19) |
| D-Q2 | Separate test site? | Approved. Created as Firebase project evolora-test. (REQ-12.4, D-18) |
| D-Q3 | Email invites? | Approved: a free email service sending from noreply@evoloraedu.org (Milestone B). |
| D-Q4 | Test accounts? | Approved, with a one-click user switcher on the test site; Gil's own Google accounts can also be used. (REQ-12.5, REQ-12.6) |

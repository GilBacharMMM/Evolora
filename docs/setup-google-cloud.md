# Setting up Google Cloud for Evolora

**For:** Gil · **Time needed:** about 20 minutes · **Last updated:** 2026-11-20

This guide covers only the steps Gil needs to do personally: creating the account, entering payment details and signing in. Claude does everything else (database, sign-in settings, deploying the app). The reasons for using Google Cloud are in decision D-10.

We use **Firebase**, Google's friendly front door to Google Cloud. A Firebase project *is* a Google Cloud project, just with a simpler control panel.

---

## Before you start: which Google account?

The account you use becomes the **owner** of Evolora's cloud project and gets the bills.

- **Your personal account (bachargil@gmail.com):** you have full control; works today. Recommended for the pilot.
- **A school account (@taded.org.il):** the school's Google admin may have blocked creating cloud projects, and the project would belong to the school.

You can add more owners later (for example, someone from the school), so this choice isn't final. Tell Claude which you chose so it can be logged.

---

## Step 1: Create the project

1. Open **https://console.firebase.google.com** and sign in with the chosen account.
2. Click **Create a project** (or **Add project**).
3. Project name: **Evolora**. Google adds a code to make the ID unique (for example, `evolora-4f2a1`). **Write the project ID down**; Claude will need it.
4. When asked about **Google Analytics**, switch it **off**. We don't want tracking in a product for minors.
5. Click **Create project** and wait until it's ready.

## Step 2: Switch to the pay-as-you-go plan and set a spending alert

Storing students' audio recordings needs the pay-as-you-go plan (called **Blaze**). It includes a generous free allowance; for a pilot of 120 users, we expect it to cost little or nothing. Claude will check the real usage after the first weeks.

1. In the Firebase console, at the bottom left, click **Upgrade** (next to "Spark plan").
2. Choose **Blaze**, and follow the steps to create a billing account and enter your payment card. **Only you should enter card details. Never give them to Claude.**
3. When asked for a **budget**, set **$10 per month**. You will get an email if spending reaches parts of that amount. (A budget only sends alerts; it doesn't stop the service.)

## Step 3: Let Claude work on the project from this computer

Claude has prepared a sign-in command. When you're ready, tell Claude **"I finished steps 1 and 2"** along with the project ID. Claude will then:

1. Install Google's Firebase tools on this computer.
2. Start the sign-in. A browser window opens and asks you to sign in with the same Google account and to allow access. **You** do this sign-in, not Claude.

After that, Claude can set up the database (in the Israel region), Google sign-in, and file storage, and publish the app.

## Step 4 (later): the web address

When you buy the domain name (open question Q-9), Claude will tell you the two or three settings to enter at the domain seller's website to point it to Evolora. Until then, Evolora will be reachable at a free address like `evolora-4f2a1.web.app`.

---

## What it might cost

| Item | Expected for the pilot |
|---|---|
| Hosting the website | Free allowance covers it |
| Database (lessons, answers, grades) | Free allowance very likely covers it |
| File storage (images, audio recordings) | A few dollars a month at most |
| Domain name | About $10–25 a year, paid to the domain seller |
| AI (Gemini) | Nothing; not part of the MVP |

These are estimates. Claude will check the real billing page with you after the first month.

---

## Step 5: The test project (Evolora Test)

Claude created a second project, **evolora-test**, for the test site (decision D-18). It's on the free plan, which is enough to start. When Milestone A needs file storage (images and audio) on the test site, it will also need the pay-as-you-go plan:

1. Open **https://console.firebase.google.com/project/evolora-test/overview**.
2. Click **Upgrade**, choose **Blaze**, and pick the **same billing account** you already created. You don't need to enter your card again.
3. Set a budget alert, for example 20 ILS per month.

Claude will tell you when this step is needed.

## Step 6: Email (for teachers' comments on lessons)

Teachers' comments on lessons (REQ-4.27, D-93) arrive in your comments inbox in Evolora already. This step also sends you an email for each new comment, from **noreply@evoloraedu.org** (system design 7.4). It's free. Do it on the test project first; the real project gets the same steps later.

**Only you do these steps. Claude never sees the email service's password or key.**

**A. Open an email-sending account and verify the address** (about 20 minutes)
1. Open a free account at an email-sending service. Claude suggests **Brevo** (https://www.brevo.com, free for up to 300 emails a day). Any service that offers "SMTP" works the same way.
2. In Brevo, go to **Senders, Domains & Dedicated IPs → Domains → Add a domain**, and type **evoloraedu.org**.
3. Brevo shows a few lines to add to the domain's settings (DNS records: a "Brevo code", "DKIM" and "DMARC"). Open **Cloudflare → evoloraedu.org → DNS → Records**, and add each line exactly as Brevo shows it (type, name and value).
4. Back in Brevo, click **Verify**. It can take up to an hour.
5. In Brevo, add the sender **noreply@evoloraedu.org** (name: **Evolora**).
6. In Brevo, go to **SMTP & API → SMTP**. Note the **SMTP server**, **port**, **login**, and create an **SMTP key**. Keep this page open for part B; don't send the key to anyone, Claude included.

**B. Connect it to the test project** (about 10 minutes)
1. Open **https://console.firebase.google.com/project/evolora-test/extensions**.
2. Find **Trigger Email from Firestore** (by Firebase) and click **Install**.
3. When it asks for its settings:
   - **SMTP connection URI:** `smtp://LOGIN@smtp-relay.brevo.com:587` (put your Brevo login instead of LOGIN).
   - **SMTP password:** the SMTP key from Brevo.
   - **Email documents collection:** `mail`
   - **Default FROM address:** `Evolora <noreply@evoloraedu.org>`
   - **Firestore instance location:** the same as the project (me-west1, Tel Aviv).
   - Leave the rest as they are.
4. Click **Install extension**. It takes a few minutes.
5. Tell Claude it's done. Claude switches the emails on for the test site (a setting called `settings/email`), sends a test comment, and checks that the email arrived.

Until part B is done, nothing is emailed: the comments only wait in the inbox.

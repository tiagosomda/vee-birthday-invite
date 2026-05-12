# Task: RSVP Email Notification

## Goal

Send an email to Tiago whenever a new RSVP is submitted — i.e. whenever a document is created in the `vee-first-birthday-rsvps` Firestore collection.

Uses **Firebase Cloud Functions + Nodemailer + Gmail app password**. No third-party email service required.

---

## Prerequisites

1. Firebase project must be on the **Blaze (pay-as-you-go)** plan — Cloud Functions require it. Personal usage will stay well within the free tier.
2. A **Gmail App Password** for `tsomda@gmail.com`:
   - Google Account → Security → 2-Step Verification → App Passwords
   - Generate one, label it "Firebase RSVP Notifier"
   - Store it as a Firebase secret (see below) — never commit it

---

## Project Setup

Initialize Firebase Functions in the repo root (if not already):

```bash
firebase init functions
```

- Language: **JavaScript**
- ESLint: optional
- Install dependencies: yes

This creates a `functions/` directory.

---

## Secret

Store the Gmail app password as a Firebase secret:

```bash
firebase functions:secrets:set GMAIL_APP_PASSWORD
```

Paste the app password when prompted.

---

## Function

**`functions/index.js`**

```js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

exports.notifyOnRsvp = onDocumentCreated(
  {
    document: "vee-first-birthday-rsvps/{docId}",
    secrets: [gmailAppPassword],
  },
  async (event) => {
    const data = event.data.data();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "tsomda@gmail.com",
        pass: gmailAppPassword.value(),
      },
    });

    const poolLine = data.joiningPool
      ? `Pool: yes — ${(data.poolNames || []).join(", ")}`
      : "Pool: no";

    await transporter.sendMail({
      from: "tsomda@gmail.com",
      to: "tsomda@gmail.com",
      subject: `New RSVP: ${data.rsvpName}`,
      text: [
        `Name: ${data.rsvpName}`,
        `Adults: ${data.adultsCount}`,
        `Kids: ${data.kidsCount}`,
        poolLine,
        data.phone ? `Phone: ${data.phone}` : null,
        data.email ? `Email: ${data.email}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }
);
```

Install nodemailer in the functions package:

```bash
cd functions && npm install nodemailer
```

---

## Deploy

```bash
firebase deploy --only functions
```

---

## Out of Scope

- SMS notifications
- Notifications for updates or deletes (create only)
- Email to anyone other than Tiago

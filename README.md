# vee-birthday-invite

Birthday invitation site with RSVP, admin panel, and email notifications.

## Stack

- **Frontend** — vanilla HTML/CSS/JS, no build step. Hosted via GitHub Pages from `docs/`.
- **Database** — Firebase Firestore. Each RSVP is stored as a document in `vee-first-birthday-rsvps`, keyed by contact (email/phone, lowercased) or a device UUID if no contact is provided.
- **Auth** — Firebase Auth (Google sign-in). Firestore rules restrict read access to authenticated admins; writes are open so guests can submit RSVPs without logging in.
- **Email notifications** — Firebase Cloud Function (`functions/index.js`) triggered on `onDocumentCreated`. Uses Nodemailer with a Gmail app password to send a summary email on each new RSVP.
- **Secrets** — Gmail app password stored in Firebase Secret Manager (`GMAIL_APP_PASSWORD`), never committed.

## Project layout

```
docs/          # static site (GitHub Pages)
functions/     # Firebase Cloud Functions (Node 24)
firebase.json  # functions deploy config
.firebaserc    # project alias → tiago-dev-site
```

## Deploy

**Site** — push to `main`; GitHub Pages serves from `docs/`.

**Functions** — from repo root:
```sh
firebase deploy --only functions
```

To update the Gmail app password:
```sh
firebase functions:secrets:set GMAIL_APP_PASSWORD
```

# Task: Admin Panel

## Goal

Add a lightly hidden admin panel that lets authorized users (Tiago and Pri) sign in with Google and view/manage all RSVP responses from Firestore.

## File Structure

The project now has separate files — place new code in the right place:

| What | Where |
|---|---|
| Firebase Auth `<script>` tag | `index.html` `<head>` |
| Admin section HTML + trigger button | `index.html` `<body>` (bottom) |
| Admin CSS | `styles.css` |
| Admin JS | `script.js` |

---

## Entry Point — Hidden Trigger Button

- A small, low-contrast button fixed to the **bottom-right corner** of the page
- Should not be obviously visible — e.g., a faint `·` or `⚙` icon, low opacity (~20%), no label
- On click: smoothly scrolls to (or reveals) the `#adminSection` at the bottom of the `<body>`
- Does NOT require auth to reveal — auth happens inside the section

---

## Admin Section (`#adminSection`)

Sits at the very bottom of `<body>`, below all existing content. Hidden by default (`display: none`), revealed when the trigger is pressed.

### State 1 — Not signed in

- Heading: "Admin"
- A **"Sign in with Google"** button using Firebase Auth (`GoogleAuthProvider`)
- Uses Firebase Auth compat SDK (`firebase-auth-compat.js`) — load it alongside the existing compat SDKs in `<head>`
- On sign-in success: check if the authenticated email is admin (this is just a UX shortcut — the real gate is Firestore rules). If the Firestore read succeeds, show State 2. If it fails with permission-denied, show a "Not authorized" message.

### State 2 — Signed in as admin

- Show the signed-in user's email + a **Sign out** button
- Two sub-sections below:

#### 2a. Summary

Render a card with three counts derived from all RSVP documents:

- **Adults** — sum of `adultsCount` across all docs
- **Kids** — sum of `kidsCount` across all docs
- **Pool** — sum of `poolNames` array lengths across all docs where `joiningPool === true`

Below the counts, a **"Copy pool names"** button that:
- Builds a string from all docs where `joiningPool === true`, ordered by `submittedAt` ascending
- Each doc's names are joined with a newline (`poolNames.join('\n')`)
- Docs are separated from each other by a blank line (`\n\n`)
- Copies the result to clipboard via `navigator.clipboard.writeText(...)`
- Button text briefly changes to "Copied!" then reverts after 2s

#### 2b. RSVP Responses

Fetch **all documents** from `vee-first-birthday-rsvps` ordered by `submittedAt` ascending.

Render as **cards** (not a table) — one card per RSVP. Cards work well on mobile and avoid horizontal scroll. Each card shows:

- **Name** — `rsvpName` (bold, prominent)
- **Pool names** — `poolNames` joined with `, ` (only shown if `joiningPool === true`)
- **Counts** — e.g. `2 adults · 1 kid`
- **Pool** — `🏊 Joining pool` or `Not joining pool`
- **Contact** — phone/email if present, otherwise omitted
- **Submitted** — `submittedAt` formatted as local date+time (e.g. `Jun 3, 2026, 2:41 PM`)
- **Delete button** — at the bottom of the card

**Delete flow:**
- Clicking Delete reveals an inline confirmation area within the card (no browser dialog)
- Shows a text input: `Type "${rsvpName}" to confirm`
- Admin must type the exact `rsvpName` value (case-insensitive match is fine)
- A red **Confirm delete** button, enabled only when the name matches, and a **Cancel** link
- On confirm: calls `db.collection('vee-first-birthday-rsvps').doc(docId).delete()`
- Remove the card from the UI immediately on success
- On error: show a small inline error within the card

---

## Firebase Auth SDK

Add to `<head>` in `index.html` alongside existing compat script tags:

```html
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
```

Sign-in code sketch (goes in `script.js`):

```js
var provider = new firebase.auth.GoogleAuthProvider();
firebase.auth().signInWithPopup(provider).then(function(result) {
  // result.user.email
  loadAdminData();
});
```

---

## Firestore Security Rules

Update the rules to allow `read` and `delete` only for the two admin emails. Replace the current rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /vee-first-birthday-rsvps/{doc} {
      allow create, update: if true;
      allow read, delete: if request.auth != null
                          && request.auth.token.email in ['tsomda@gmail.com', 'priangulo@gmail.com'];
    }
  }
}
```

Deploy via **Firebase Console → Firestore → Rules → Publish** (paste & save).  
Do NOT commit the rules file to the repo — this project has no `firebase.json` setup.

> **Important:** `request.auth.token.email` is the verified email from the Google ID token. This is server-enforced — no frontend check can bypass it.

---

## Styling Notes

- All new CSS goes in `styles.css` (no inline `<style>` blocks)
- **Mobile-first** — this will be used primarily on phones. Max width `640px`, comfortable tap targets, no horizontal scroll
- Admin section background: `#f9f9f9`, subtle border-top, no heavy styling — it's functional
- Match fonts (Roboto for body, Fredoka for headings) and existing border-radius/shadow conventions
- Summary stat chips: display as a row of 3 compact cards (Adults / Kids / Pool), wrap gracefully on narrow screens
- RSVP cards: full-width, clear visual separation between cards, comfortable padding
- Delete confirm area: revealed inline within the card, visually distinct (light red tint background)
- Keep the trigger button truly unobtrusive — guests should not notice it

---

## Out of Scope (for this task)

- Editing RSVP entries (delete + re-submit is sufficient)
- Export to CSV / Sheets
- Real-time updates (a manual Refresh button is fine)
- Any notification or email system

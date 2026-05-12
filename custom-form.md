# Custom RSVP Form — Firestore Integration

## Goal

Replace the embedded Google Form iframe with a native HTML form that writes to Firestore under the `tiago-dev-site` Firebase project. Responses are keyed so that re-submitting updates the existing record rather than creating a duplicate.

---

## Firestore Collection

- **Project:** `tiago-dev-site`
- **Collection name:** `vee-first-birthday-rsvps`
- **Console URL:** https://console.firebase.google.com/project/tiago-dev-site/firestore/databases/-default-/data

Each document is written with `.set()` (not `.add()`) using a deterministic ID so re-submissions overwrite the previous entry.

### Document schema

| Field | Type | Notes |
|---|---|---|
| `adultsCount` | number | Min 1 |
| `kidsCount` | number | Min 0 |
| `joiningPool` | boolean | |
| `poolNames` | array of strings | Only present when `joiningPool` is true; one name per person (swimming or not) |
| `rsvpName` | string | Only present when `joiningPool` is false; name of the person submitting the RSVP |
| `contact` | string or null | Normalized phone or email; null when not provided |
| `deviceId` | string or null | UUID from localStorage; only present when `contact` is null |
| `submittedAt` | Firestore server timestamp | Auto-set on write |

### Document ID strategy

1. If the user provides a phone or email, normalize it (lowercase + trim) and use it directly as the document ID — e.g., `alice@example.com` or `9195550123`.
2. If no contact info is given, look for a UUID in `localStorage` under the key `rsvp_device_id`. If it doesn't exist, generate one (`crypto.randomUUID()`), persist it, and use it as the document ID.

This means the same person can fill the form again (e.g., to update their pool answer) and their previous response will be replaced.

---

## Form Fields & Logic

### Always shown

1. **Number of adults** — number input, min 1, default 1
2. **Number of kids** — number input, min 0, default 0
3. **Will you be joining the pool?** — Yes / No toggle or radio buttons
4. **Phone or email** — text input, optional. Small helper text: "So you can update your RSVP later if plans change."

### Conditional — "Joining pool: Yes"

- Show one name input field per person (total = adults + kids)
- Label each field: "Adult 1", "Adult 2", …, "Kid 1", "Kid 2", …
- All name fields are required
- Name fields regenerate dynamically when adult/kid counts change

### Conditional — "Joining pool: No"

- Show a single **Your name** text input (required)
- This is just to know who sent the RSVP

---

## Firebase Config

```js
const firebaseConfig = {
  apiKey: "AIzaSyAOJCxd1PY7JcsIc2z1KtCVZcDst4CtnFM",
  authDomain: "tiago-dev-site.firebaseapp.com",
  projectId: "tiago-dev-site",
  storageBucket: "tiago-dev-site.firebasestorage.app",
  messagingSenderId: "706177559293",
  appId: "1:706177559293:web:824030a6e826596ed7ac94"
};
```

The `apiKey` is safe to commit in client-side code — it identifies the project but doesn't grant access. Access is gated by Firestore Security Rules.

---

## Implementation Steps

### 1. Firebase SDK

Load via CDN (compat bundle) in `index.html` `<head>`:

```html
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
```

### 2. Replace Google Form iframe

Remove the `<iframe>` block and replace it with a `<form id="rsvpForm">` inside `#rsvpYesContent`.

### 3. Dynamic name fields

When adult/kid counts change, re-render the name input fields. Each field is `<input type="text" required>` labelled "Adult N" or "Kid N".

### 4. Document ID resolution

```js
function getDocId(contact) {
  if (contact) return contact.trim().toLowerCase();
  let id = localStorage.getItem('rsvp_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('rsvp_device_id', id);
  }
  return id;
}
```

### 5. Form Submission Handler

On submit:
1. Validate all required fields client-side
2. Resolve the document ID via `getDocId(contact)`
3. Build the document object
4. Write with `db.collection('vee-first-birthday-rsvps').doc(docId).set(data)` — this creates or overwrites
5. On success: hide form, show thank-you message
6. On error: show inline error, keep form visible

### 6. Thank-You State

After successful submission, replace the form with a confirmation message and keep the calendar buttons visible below.

---

## Firestore Security Rules

Rules need to allow both **create and update** (since `.set()` is used for both new and returning submissions). Reads and deletes remain blocked.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /vee-first-birthday-rsvps/{doc} {
      allow create, update: if true;
      allow read, delete: if false;
    }
  }
}
```

**Deployment options** (either works):
- **Web UI (simplest):** paste the rules above into Firebase Console → Firestore → Rules tab → Publish
- **CLI:** `firebase deploy --only firestore:rules` using a `firestore.rules` file (requires `firebase-tools` and a `firebase.json` project config)

For a one-page invite site, the web UI paste is fine.

---

## Styling

- Match the existing page palette: `#FFE8D0` background, Fredoka headings, Roboto body
- Pool question styled prominently (it drives the conditional logic)
- Name input fields generated dynamically — keep them compact
- Submit button styled like the existing `.rsvp-btn.yes` button (orange, Fredoka font)
- Inline validation errors in red below each field

---

## Out of Scope

- No authentication required
- No admin view / reading back submissions in-browser
- No email confirmation to the guest

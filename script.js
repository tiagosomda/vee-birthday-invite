// ── Firebase ──────────────────────────────────────────────────────────────
firebase.initializeApp({
  apiKey: "AIzaSyAOJCxd1PY7JcsIc2z1KtCVZcDst4CtnFM",
  authDomain: "tiago-dev-site.firebaseapp.com",
  projectId: "tiago-dev-site",
  storageBucket: "tiago-dev-site.firebasestorage.app",
  messagingSenderId: "706177559293",
  appId: "1:706177559293:web:824030a6e826596ed7ac94"
});
var db = firebase.firestore();

// ── Prefill from localStorage ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var savedName    = localStorage.getItem('rsvp_name');
  var savedContact = localStorage.getItem('rsvp_contact');
  if (savedName)    document.getElementById('yourName').value    = savedName;
  if (savedContact) document.getElementById('contactInput').value = savedContact;
  updateSubmitState();
});

document.getElementById('rsvpForm').addEventListener('input', updateSubmitState);

// ── RSVP gate ─────────────────────────────────────────────────────────────
function rsvp(coming) {
  document.getElementById('rsvpPrompt').style.display = 'none';
  if (coming) {
    var el = document.getElementById('rsvpYesContent');
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.width = '100%';
  } else {
    document.getElementById('rsvpDecline').style.display = 'block';
  }
}

function rsvpReset() {
  document.getElementById('rsvpPrompt').style.display = 'block';
  document.getElementById('rsvpDecline').style.display = 'none';
  document.getElementById('rsvpYesContent').style.display = 'none';
}

function updateRsvp() {
  document.getElementById('rsvpThankYou').style.display = 'none';
  var form = document.getElementById('rsvpForm');
  form.style.display = 'block';
  var submitBtn = form.querySelector('.rsvp-form-submit');
  submitBtn.disabled = false;
  submitBtn.textContent = 'Send RSVP';
}

// ── Pool toggle ───────────────────────────────────────────────────────────
var poolChoice = null;

function setPool(val) {
  poolChoice = val;
  document.querySelectorAll('.pool-toggle').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.val === val);
  });
  var poolSection = document.getElementById('poolSection');
  if (val === 'yes') {
    poolSection.style.display = 'block';
    if (document.querySelectorAll('.pool-name').length === 0) {
      addPoolPerson(document.getElementById('yourName').value.trim());
    }
  } else {
    poolSection.style.display = 'none';
  }
  updateSubmitState();
}

function adjustCount(id, delta) {
  var el = document.getElementById(id);
  var min = (id === 'adultsCount') ? 1 : 0;
  var current = parseInt(el.textContent) || min;
  el.textContent = Math.min(20, Math.max(min, current + delta));
}

function addPoolPerson(name) {
  var list = document.getElementById('poolNameList');
  var row = document.createElement('div');
  row.className = 'pool-name-row';
  row.innerHTML = '<input type="text" class="form-input pool-name" placeholder="Full name" maxlength="100" value="' + (name ? name.replace(/"/g, '&quot;') : '') + '">'
    + '<button type="button" class="pool-name-remove" onclick="this.closest(\'.pool-name-row\').remove(); updateSubmitState()">×</button>';
  list.appendChild(row);
  updateSubmitState();
}

// ── Submit button state ───────────────────────────────────────────────────
function isFormComplete() {
  if (!document.getElementById('yourName').value.trim()) return false;
  if (!poolChoice) return false;
  if (poolChoice === 'yes') {
    var nameInputs = document.querySelectorAll('.pool-name');
    if (nameInputs.length === 0) return false;
    for (var i = 0; i < nameInputs.length; i++) {
      if (!nameInputs[i].value.trim()) return false;
    }
  }
  return true;
}

function updateSubmitState() {
  document.querySelector('.rsvp-form-submit').classList.toggle('incomplete', !isFormComplete());
}

// ── Document ID resolution ────────────────────────────────────────────────
function resolveDocId(contact) {
  if (contact) return contact.trim().toLowerCase();
  var id = localStorage.getItem('rsvp_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('rsvp_device_id', id);
  }
  return id;
}

// ── Form submission ───────────────────────────────────────────────────────
function showFormError(msg) {
  var el = document.getElementById('formError');
  el.textContent = msg;
  el.style.display = 'block';
}

document.getElementById('rsvpForm').addEventListener('submit', function(e) {
  e.preventDefault();
  document.getElementById('formError').style.display = 'none';

  var yourName = document.getElementById('yourName').value.trim();
  if (!yourName) {
    showFormError('Please enter your name.');
    return;
  }

  if (!poolChoice) {
    showFormError('Please let us know if you\'ll be joining the pool.');
    return;
  }

  var adults  = Math.max(1, parseInt(document.getElementById('adultsCount').textContent) || 1);
  var kids    = Math.max(0, parseInt(document.getElementById('kidsCount').textContent)   || 0);
  var contactRaw = document.getElementById('contactInput').value.trim();
  var contact = contactRaw ? contactRaw.toLowerCase() : null;
  var joiningPool = (poolChoice === 'yes');

  var data = {
    rsvpName: yourName,
    adultsCount: adults,
    kidsCount: kids,
    joiningPool: joiningPool,
    submittedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (contact) {
    data.contact = contact;
  } else {
    var uuid = localStorage.getItem('rsvp_device_id') || crypto.randomUUID();
    localStorage.setItem('rsvp_device_id', uuid);
    data.contact = null;
    data.deviceId = uuid;
  }

  if (joiningPool) {
    var nameInputs = document.querySelectorAll('.pool-name');
    if (nameInputs.length === 0) {
      showFormError('Please add at least one name for the pool area.');
      return;
    }
    var poolNames = [];
    var allFilled = true;
    nameInputs.forEach(function(inp) {
      if (!inp.value.trim()) allFilled = false;
      poolNames.push(inp.value.trim());
    });
    if (!allFilled) {
      showFormError('Please fill in all names for the pool area.');
      return;
    }
    data.poolNames = poolNames;
  }

  var docId = resolveDocId(contact);
  var submitBtn = document.querySelector('.rsvp-form-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  db.collection('vee-first-birthday-rsvps').doc(docId).set(data)
    .then(function() {
      localStorage.setItem('rsvp_name', yourName);
      if (contactRaw) localStorage.setItem('rsvp_contact', contactRaw);
      document.getElementById('rsvpForm').style.display = 'none';
      document.getElementById('rsvpThankYou').style.display = 'block';
    })
    .catch(function(err) {
      console.error(err);
      showFormError('Something went wrong — please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send RSVP';
    });
});

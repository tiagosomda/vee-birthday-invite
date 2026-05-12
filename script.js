// ── Feature flags ─────────────────────────────────────────────────────────
var SHOW_PHOTO_SHADOW = false;

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
  document.querySelectorAll('.anim-frame').forEach(function(el) {
    el.classList.toggle('photo-shadow', SHOW_PHOTO_SHADOW);
  });

  var savedName    = localStorage.getItem('rsvp_name');
  var savedContact = localStorage.getItem('rsvp_contact');
  if (savedName)    document.getElementById('yourName').value    = savedName;
  if (savedContact) document.getElementById('contactInput').value = savedContact;
  updateSubmitState();
});

document.getElementById('rsvpForm').addEventListener('input', updateSubmitState);

// ── Scroll helper ─────────────────────────────────────────────────────────
function smoothScrollTo(targetY, duration) {
  var startY = window.scrollY;
  var diff = targetY - startY;
  var startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    var p = Math.min((ts - startTime) / duration, 1);
    // ease-in-out cubic
    var ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    window.scrollTo(0, startY + diff * ease);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Transition helpers ────────────────────────────────────────────────────
function fadeOut(el, cb) {
  el.style.transition = 'opacity 0.3s';
  el.style.opacity = '0';
  setTimeout(function() {
    el.style.display = 'none';
    el.style.transition = '';
    el.style.opacity = '';
    if (cb) cb();
  }, 300);
}

function fadeIn(el, displayVal) {
  el.style.opacity = '0';
  el.style.display = displayVal || 'block';
  el.style.transition = 'opacity 0.3s';
  el.offsetHeight; // force reflow so transition fires
  el.style.opacity = '1';
  setTimeout(function() {
    el.style.transition = '';
    el.style.opacity = '';
  }, 300);
}

// ── RSVP gate ─────────────────────────────────────────────────────────────
function rsvp(coming) {
  var prompt = document.getElementById('rsvpPrompt');
  fadeOut(prompt, function() {
    if (coming) {
      var el = document.getElementById('rsvpYesContent');
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.width = '100%';
      fadeIn(el, 'flex');
      setTimeout(function() {
        var heading = document.querySelector('.form-heading');
        var targetY = window.scrollY + heading.getBoundingClientRect().top - 52;
        smoothScrollTo(targetY, 1500);
      }, 50);
    } else {
      var declineForm = document.getElementById('declineForm');
      declineForm.style.display = '';
      declineForm.style.opacity = '';
      document.getElementById('declineName').value = '';
      document.getElementById('declineSubmitBtn').disabled = true;
      fadeIn(document.getElementById('rsvpDecline'));
    }
  });
}

function rsvpReset() {
  var decline = document.getElementById('rsvpDecline');
  var yesContent = document.getElementById('rsvpYesContent');
  var prompt = document.getElementById('rsvpPrompt');
  var activeEl = (decline.style.display !== 'none' && decline.style.display !== '') ? decline : yesContent;
  fadeOut(activeEl, function() {
    fadeIn(prompt);
  });
}

function updateRsvp() {
  var form = document.getElementById('rsvpForm');
  var thankYou = document.getElementById('rsvpThankYou');
  var submitBtn = form.querySelector('.rsvp-form-submit');
  submitBtn.disabled = false;
  submitBtn.textContent = 'Send RSVP';
  fadeOut(thankYou, function() {
    fadeIn(form);
  });
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

// ── Decline submission ────────────────────────────────────────────────────────
function updateDeclineSubmitState() {
  var name = document.getElementById('declineName').value.trim();
  document.getElementById('declineSubmitBtn').disabled = !name;
}

function submitDecline() {
  var name = document.getElementById('declineName').value.trim();
  if (!name) return;

  var uuid = localStorage.getItem('rsvp_device_id');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('rsvp_device_id', uuid);
  }

  var data = {
    rsvpName: name,
    attending: false,
    adultsCount: 0,
    kidsCount: 0,
    joiningPool: false,
    deviceId: uuid,
    submittedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  var btn = document.getElementById('declineSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  db.collection('vee-first-birthday-rsvps').doc(uuid).set(data)
    .then(function() {
      fadeOut(document.getElementById('declineForm'));
    })
    .catch(function(err) {
      console.error(err);
      btn.disabled = false;
      btn.textContent = 'let us know';
    });
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
var adminAllDocs = [];
var adminCurrentUser = null;

function showAdmin() {
  var section = document.getElementById('adminSection');
  fadeIn(section);
  setTimeout(function() {
    var targetY = window.scrollY + section.getBoundingClientRect().top - 28;
    smoothScrollTo(targetY, 1500);
  }, 50);
}

document.getElementById('adminTrigger').addEventListener('click', showAdmin);

document.getElementById('adminClose').addEventListener('click', function() {
  fadeOut(document.getElementById('adminSection'));
});

document.getElementById('adminGoogleSignIn').addEventListener('click', function() {
  document.getElementById('adminAuthError').style.display = 'none';
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).catch(function(err) {
    var errEl = document.getElementById('adminAuthError');
    errEl.textContent = 'Sign-in failed: ' + err.message;
    errEl.style.display = 'block';
  });
});

document.getElementById('adminSignOut').addEventListener('click', function() {
  firebase.auth().signOut();
});

document.getElementById('adminRefresh').addEventListener('click', loadAdminData);

document.getElementById('copyPoolNamesBtn').addEventListener('click', function() {
  var btn = this;
  var lines = adminAllDocs
    .filter(function(d) { return d.joiningPool && d.poolNames && d.poolNames.length; })
    .map(function(d) { return d.poolNames.join('\n'); })
    .join('\n\n');
  navigator.clipboard.writeText(lines).then(function() {
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy pool names'; }, 2000);
  });
});

document.getElementById('copyContactBtn').addEventListener('click', function() {
  var btn = this;
  var phones = adminAllDocs
    .filter(function(d) { return d.contact && !d.contact.includes('@'); })
    .map(function(d) { return d.contact; });
  var emails = adminAllDocs
    .filter(function(d) { return d.contact && d.contact.includes('@'); })
    .map(function(d) { return d.contact; });
  var noContact = adminAllDocs
    .filter(function(d) { return !d.contact; })
    .map(function(d) { return d.rsvpName; });
  var all = phones.concat(emails).concat(noContact).join('\n');
  navigator.clipboard.writeText(all).then(function() {
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy contact info'; }, 2000);
  });
});

// Store user reference so loadAdminData can use it after Firestore confirms access.
firebase.auth().onAuthStateChanged(function(user) {
  adminCurrentUser = user;
  if (user) {
    loadAdminData();
  } else {
    document.getElementById('adminSignIn').style.display = 'block';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('adminRsvpList').innerHTML = '';
    adminAllDocs = [];
  }
});

function loadAdminData() {
  document.getElementById('adminRsvpList').innerHTML = '<p class="admin-card-field">Loading…</p>';
  db.collection('vee-first-birthday-rsvps').orderBy('submittedAt', 'asc').get()
    .then(function(snapshot) {
      // Only show dashboard once Firestore read confirms access.
      if (adminCurrentUser) {
        document.getElementById('adminEmail').textContent = adminCurrentUser.email;
        document.getElementById('adminSignIn').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
      }
      adminAllDocs = [];
      snapshot.forEach(function(doc) {
        adminAllDocs.push(Object.assign({ _id: doc.id }, doc.data()));
      });
      renderAdminSummary();
      renderAdminCards();
    })
    .catch(function(err) {
      if (err.code === 'permission-denied') {
        document.getElementById('adminDashboard').style.display = 'none';
        document.getElementById('adminSignIn').style.display = 'block';
        var errEl = document.getElementById('adminAuthError');
        errEl.textContent = 'Not authorized.';
        errEl.style.display = 'block';
      } else {
        document.getElementById('adminRsvpList').innerHTML =
          '<p class="admin-card-field admin-card-error" style="display:block">Error loading data: ' + adminEsc(err.message) + '</p>';
      }
    });
}

function renderAdminSummary() {
  var adults = 0, kids = 0, pool = 0, declined = 0;
  adminAllDocs.forEach(function(d) {
    if (d.attending === false) {
      declined++;
      return;
    }
    adults += (d.adultsCount || 0);
    kids   += (d.kidsCount   || 0);
    if (d.joiningPool && d.poolNames) pool += d.poolNames.length;
  });
  document.getElementById('statAdults').textContent   = adults;
  document.getElementById('statKids').textContent     = kids;
  document.getElementById('statPool').textContent     = pool;
}

function renderAdminCards() {
  var list = document.getElementById('adminRsvpList');
  list.innerHTML = '';

  var attending = adminAllDocs.filter(function(d) { return d.attending !== false; });
  var declined  = adminAllDocs.filter(function(d) { return d.attending === false; });

  if (attending.length === 0 && declined.length === 0) {
    list.innerHTML = '<p class="admin-empty">No RSVPs yet.</p>';
    return;
  }

  attending.forEach(function(doc) { list.appendChild(buildAdminCard(doc)); });

  if (declined.length > 0) {
    var divider = document.createElement('div');
    divider.className = 'admin-declined-divider';
    divider.innerHTML = '<span>Can\'t make it : <b>' + declined.length + '</b></span>';
    list.appendChild(divider);
    declined.forEach(function(doc) { list.appendChild(buildAdminCard(doc)); });
  }
}

function buildAdminCard(doc) {
  var card = document.createElement('div');
  card.className = 'admin-card' + (doc.attending === false ? ' admin-card-declined' : '');
  card.dataset.id = doc._id;

  var submittedStr = '';
  if (doc.submittedAt && doc.submittedAt.toDate) {
    submittedStr = doc.submittedAt.toDate().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  }

  var html = '<div class="admin-card-name">' + adminEsc(doc.rsvpName) + '</div>';
  
  if (submittedStr) {
    html += '<div class="admin-card-meta">Submitted: ' + adminEsc(submittedStr) + '</div></hr></br>';
  }

  if (doc.attending === false) {
    html += '<div class="admin-card-field admin-card-declined-label">can\'t make it</div>';
  } else {
    var adults = doc.adultsCount || 0;
    var kids   = doc.kidsCount   || 0;
    var counts = adults + ' adult' + (adults !== 1 ? 's' : '');
    if (kids > 0) counts += ' · ' + kids + ' kid' + (kids !== 1 ? 's' : '');
    if (doc.contact) {
      html += '<div class="admin-card-field">Contact: ' + adminEsc(doc.contact) + '</div>';
    }
    html += '<div class="admin-card-field">' + adminEsc(counts) + '</div>';
    html += '<div class="admin-card-field">' + (doc.joiningPool ? '</br></br>🏊 Joining pool <button class="admin-copy-btn">Copy names</button>'  : '</br></br>Not joining pool') + '</div>';
    if (doc.joiningPool && doc.poolNames && doc.poolNames.length) {
      html += '<div class="admin-card-field" style="margin-top:10px">' + adminEsc(doc.poolNames.join(', ')) + '</div>';
    }
  }
  
  html += '<button class="admin-delete-btn">Delete</button>';
  html += '<div class="admin-delete-confirm" style="display:none">'
    + '<div class="admin-delete-confirm-label">Type <strong>' + adminEsc(doc.rsvpName) + '</strong> to confirm</div>'
    + '<input type="text" class="admin-delete-confirm-input" placeholder="' + adminEsc(doc.rsvpName) + '">'
    + '<div class="admin-delete-confirm-actions">'
    + '<button class="admin-confirm-delete-btn" disabled>Confirm delete</button>'
    + '<button class="admin-cancel-link">Cancel</button>'
    + '</div>'
    + '<div class="admin-card-error" style="display:none"></div>'
    + '</div>';

  card.innerHTML = html;

  var copyPoolBtn = card.querySelector('.admin-copy-btn');
  if (copyPoolBtn) {
    copyPoolBtn.addEventListener('click', function() {
      var btn = this;
      navigator.clipboard.writeText(doc.poolNames.join('\n')).then(function() {
        btn.textContent = 'Copied!';
        setTimeout(function() { btn.textContent = 'Copy pool names'; }, 2000);
      });
    });
  }

  card.querySelector('.admin-delete-btn').addEventListener('click', function() {
    this.style.display = 'none';
    card.querySelector('.admin-delete-confirm').style.display = 'block';
    card.querySelector('.admin-delete-confirm-input').focus();
  });

  card.querySelector('.admin-delete-confirm-input').addEventListener('input', function() {
    var matches = this.value.trim().toLowerCase() === doc.rsvpName.toLowerCase();
    card.querySelector('.admin-confirm-delete-btn').disabled = !matches;
  });

  card.querySelector('.admin-cancel-link').addEventListener('click', function() {
    card.querySelector('.admin-delete-confirm').style.display = 'none';
    card.querySelector('.admin-delete-confirm-input').value = '';
    card.querySelector('.admin-confirm-delete-btn').disabled = true;
    card.querySelector('.admin-delete-btn').style.display = '';
  });

  card.querySelector('.admin-confirm-delete-btn').addEventListener('click', function() {
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Deleting…';
    var errorEl = card.querySelector('.admin-card-error');
    errorEl.style.display = 'none';
    db.collection('vee-first-birthday-rsvps').doc(doc._id).delete()
      .then(function() {
        adminAllDocs = adminAllDocs.filter(function(d) { return d._id !== doc._id; });
        renderAdminSummary();
        renderAdminCards();
      })
      .catch(function(err) {
        btn.disabled = false;
        btn.textContent = 'Confirm delete';
        errorEl.textContent = 'Error: ' + err.message;
        errorEl.style.display = 'block';
      });
  });

  return card;
}

function adminEsc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Photo wiggle animation ────────────────────────────────────────────────────
(function() {
  var frames = [
    document.getElementById('frame000'),
    document.getElementById('frame001'),
    document.getElementById('frame002'),
  ];
  // sequence: center, left, center, right
  var sequence  = [0, 1, 0, 2];
  var durations = [230, 230, 230, 230]; // ms per step
  var step = 0;

  function tick() {
    var idx = sequence[step];
    var dur = durations[step];
    frames.forEach(function(f, i) { f.classList.toggle('active', i === idx); });
    step = (step + 1) % sequence.length;
    setTimeout(tick, dur);
  }

  window.addEventListener('load', function() { setTimeout(tick, 800); });
})();

// ── Form submission ───────────────────────────────────────────────────────────
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
      fadeOut(document.getElementById('rsvpForm'), function() {
        fadeIn(document.getElementById('rsvpThankYou'));
      });
    })
    .catch(function(err) {
      console.error(err);
      showFormError('Something went wrong — please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send RSVP';
    });
});

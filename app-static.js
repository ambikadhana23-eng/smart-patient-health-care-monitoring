// Smart Healthcare System - Frontend Application Logic (Static deployment)
// Handles routing, auth, API calls (via in-browser MockAPI), and all UI interactions

// ===== State =====
let state = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  role: localStorage.getItem('role') || null,
  selectedDoctor: null,
  queuePollTimer: null,
  reminderPollTimer: null,
};

// ===== API helper (uses in-browser MockAPI for static deployment) =====
async function api(path, method = 'GET', body = null) {
  // Handle query strings: extract date param for queue/doctor/today/stats endpoints
  let cleanPath = path;
  let dateParam = null;
  const qIdx = path.indexOf('?');
  if (qIdx >= 0) {
    cleanPath = path.slice(0, qIdx);
    const qs = new URLSearchParams(path.slice(qIdx + 1));
    dateParam = qs.get('date');
  }
  // Pass date via body for GET endpoints that need it (MockAPI convention)
  const effectiveBody = (method === 'GET' && dateParam) ? { __date: dateParam } : body;
  try {
    return await MockAPI.call(cleanPath, method, effectiveBody, state.token);
  } catch (err) {
    throw err;
  }
}

// ===== Toast notifications =====
function toast(title, msg = '', type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<div class="toast-title">${title}</div>${msg ? `<div class="toast-msg">${msg}</div>` : ''}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; setTimeout(() => t.remove(), 300); }, 4000);
}

// ===== Theme =====
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}
function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ===== Simple router =====
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
  // Page-specific loaders
  if (page === 'patient-dashboard') loadPatientDashboard();
  if (page === 'doctor-dashboard') loadDoctorDashboard();
  if (page === 'book') loadBookingPage();
  if (page === 'queue') loadQueuePage();
  if (page === 'reminders') loadRemindersPage();
  if (page === 'history') loadHistoryPage();
  if (page === 'doctor-queue') loadDoctorQueue();
  if (page === 'doctor-stats') loadDoctorStats();
  if (page === 'notifications') loadNotifications();
  updateHeader();
}

function updateHeader() {
  const navActions = document.getElementById('nav-actions');
  if (!navActions) return;
  if (state.token && state.role) {
    const name = state.user?.name || 'User';
    const dashLink = state.role === 'patient' ? 'patient-dashboard' : 'doctor-dashboard';
    navActions.innerHTML = `
      <span class="text-muted" style="font-size:14px">👋 ${escapeHtml(name)}</span>
      <button class="btn btn-secondary btn-sm" onclick="navigate('${dashLink}')">Dashboard</button>
      <button class="btn btn-danger btn-sm" onclick="logout()">Logout</button>
    `;
  } else {
    navActions.innerHTML = `
      <button class="btn btn-outline btn-sm" onclick="navigate('patient-login')">Patient Login</button>
      <button class="btn btn-outline btn-sm" onclick="navigate('doctor-login')">Doctor Login</button>
      <button class="btn btn-primary btn-sm" onclick="navigate('patient-register')">Register</button>
    `;
  }
}

function logout() {
  if (state.queuePollTimer) clearInterval(state.queuePollTimer);
  if (state.reminderPollTimer) clearInterval(state.reminderPollTimer);
  state.token = null; state.user = null; state.role = null;
  localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('role');
  toast('Logged out', 'You have been signed out.', 'success');
  navigate('home');
}

function requireAuth(role) {
  if (!state.token || state.role !== role) {
    toast('Access denied', `Please login as ${role}.`, 'error');
    navigate(role === 'patient' ? 'patient-login' : 'doctor-login');
    return false;
  }
  return true;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function statusBadge(status) {
  const map = {
    waiting: ['badge-waiting', 'Waiting'],
    in_consultation: ['badge-consultation', 'In Consult'],
    completed: ['badge-completed', 'Completed'],
    skipped: ['badge-skipped', 'Skipped'],
  };
  const [cls, label] = map[status] || ['badge-primary', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

// ===== Auth forms =====
async function handlePatientRegister(e) {
  e.preventDefault();
  const f = e.target;
  const payload = {
    name: f.name.value, email: f.email.value, password: f.password.value,
    phone: f.phone.value, age: f.age.value || null, gender: f.gender.value,
  };
  try {
    const data = await api('/auth/patient/register', 'POST', payload);
    saveSession(data.token, data.patient, 'patient');
    toast('Welcome!', `Account created for ${data.patient.name}`, 'success');
    navigate('patient-dashboard');
  } catch (err) {
    toast('Registration failed', err.message, 'error');
  }
}

async function handlePatientLogin(e) {
  e.preventDefault();
  const f = e.target;
  try {
    const data = await api('/auth/patient/login', 'POST', { email: f.email.value, password: f.password.value });
    saveSession(data.token, data.patient, 'patient');
    toast('Welcome back!', `Logged in as ${data.patient.name}`, 'success');
    navigate('patient-dashboard');
  } catch (err) {
    toast('Login failed', err.message, 'error');
  }
}

async function handleDoctorLogin(e) {
  e.preventDefault();
  const f = e.target;
  try {
    const data = await api('/auth/doctor/login', 'POST', { email: f.email.value, password: f.password.value });
    saveSession(data.token, data.doctor, 'doctor');
    toast('Welcome Doctor!', `Logged in as ${data.doctor.name}`, 'success');
    navigate('doctor-dashboard');
  } catch (err) {
    toast('Login failed', err.message, 'error');
  }
}

function saveSession(token, user, role) {
  state.token = token; state.user = user; state.role = role;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('role', role);
  updateHeader();
}

// ===== Booking page =====
async function loadBookingPage() {
  if (!requireAuth('patient')) return;
  const container = document.getElementById('book-doctors');
  const dateInput = document.getElementById('book-date');
  if (dateInput && !dateInput.value) dateInput.value = todayStr();
  container.innerHTML = '<div class="loader"></div>';
  try {
    const data = await api('/auth/doctors');
    state.selectedDoctor = null;
    container.innerHTML = data.doctors.map(d => `
      <div class="doctor-card" onclick="selectDoctor(${d.id}, this)" data-id="${d.id}">
        <div class="flex gap-1" style="align-items:center">
          <div class="doctor-avatar">${escapeHtml(d.name.split(' ').slice(-2, -1)[0]?.[0] || 'D')}</div>
          <div>
            <div style="font-weight:700;font-size:16px">${escapeHtml(d.name)}</div>
            <div class="text-muted" style="font-size:13px">${escapeHtml(d.specialization)}</div>
          </div>
        </div>
      </div>
    `).join('') || '<div class="empty-state"><div class="icon">⚕️</div>No doctors available</div>';
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>${escapeHtml(err.message)}</div>`;
  }
}

function selectDoctor(id, el) {
  state.selectedDoctor = id;
  document.querySelectorAll('.doctor-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

async function submitBooking(e) {
  e.preventDefault();
  if (!requireAuth('patient')) return;
  const date = document.getElementById('book-date').value;
  const reason = document.getElementById('book-reason').value;
  if (!state.selectedDoctor) { toast('Select a doctor', 'Please choose a doctor first.', 'warning'); return; }
  if (!date) { toast('Select date', 'Please choose a date.', 'warning'); return; }
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Booking...';
  try {
    const data = await api('/appointments', 'POST', { doctor_id: state.selectedDoctor, appointment_date: date, reason });
    toast('Appointment booked!', `Your token number is #${data.appointment.token_number}`, 'success');
    showQRModal(data.appointment);
    setTimeout(() => navigate('queue'), 500);
  } catch (err) {
    toast('Booking failed', err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Book Appointment';
  }
}

function showQRModal(appt) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>🎫 Your Digital Token</h3>
      <p class="text-muted">Show this QR at check-in</p>
      <img src="${appt.qr_code}" alt="QR Code" style="width:200px"/>
      <div style="font-size:32px;font-weight:800;color:var(--primary)">Token #${appt.token_number}</div>
      <p class="text-muted mt-1">Date: ${escapeHtml(appt.appointment_date)}</p>
      <button class="btn btn-primary mt-2" onclick="this.closest('.modal-overlay').remove()">Got it!</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ===== Queue page (patient) =====
async function loadQueuePage() {
  if (!requireAuth('patient')) return;
  const container = document.getElementById('queue-content');
  container.innerHTML = '<div class="loader"></div>';
  if (state.queuePollTimer) { clearInterval(state.queuePollTimer); state.queuePollTimer = null; }
  try {
    const data = await api('/appointments/mine');
    const active = data.appointments.filter(a => a.status === 'waiting' || a.status === 'in_consultation');
    if (active.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="empty-state"><div class="icon">📭</div><h3>No active appointments</h3><p class="mt-1">Book an appointment to get a queue token.</p>
          <button class="btn btn-primary mt-2" onclick="navigate('book')">Book Appointment</button></div>
        </div>`;
      return;
    }
    container.innerHTML = active.map(a => `
      <div class="card mb-2" id="appt-card-${a.id}">
        <div class="flex-between wrap gap-1 mb-2">
          <div>
            <h3 style="font-size:18px">${escapeHtml(a.doctor_name)}</h3>
            <p class="text-muted" style="font-size:13px">${escapeHtml(a.specialization)} • ${escapeHtml(a.appointment_date)}</p>
            ${a.reason ? `<p class="text-muted mt-1" style="font-size:13px">Reason: ${escapeHtml(a.reason)}</p>` : ''}
          </div>
          <div id="status-${a.id}">${statusBadge(a.status)}</div>
        </div>
        <div class="grid grid-2 mt-2" id="queue-detail-${a.id}"></div>
      </div>
    `).join('');

    // load each appt's live queue
    active.forEach(a => updateSingleQueue(a.id, a.doctor_id, a.appointment_date));

    // poll every 8 seconds
    state.queuePollTimer = setInterval(() => {
      active.forEach(a => updateSingleQueue(a.id, a.doctor_id, a.appointment_date));
    }, 8000);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>${escapeHtml(err.message)}</div>`;
  }
}

async function updateSingleQueue(apptId, doctorId, date) {
  try {
    const qData = await api(`/appointments/queue/${doctorId}?date=${encodeURIComponent(date)}`);
    const myAppt = qData.queue.find(q => q.id === apptId);
    const detail = document.getElementById(`queue-detail-${apptId}`);
    const statusEl = document.getElementById(`status-${apptId}`);
    if (!detail) return;
    const position = myAppt ? (myAppt.queue_position || '-') : '-';
    const ahead = myAppt && myAppt.status === 'waiting' ? (myAppt.queue_position - 1) : 0;
    const estMin = ahead > 0 ? ahead * 12 : 0;
    detail.innerHTML = `
      <div class="token-card">
        <div class="token-label">Your Token</div>
        <div class="token-number">#${myAppt ? myAppt.token_number : '-'}</div>
        <div class="token-label">${myAppt ? myAppt.status.replace('_', ' ') : 'unknown'}</div>
      </div>
      <div class="flex" style="flex-direction:column;gap:14px;justify-content:center">
        <div class="position-ring">
          <div>
            <div class="num">${position}</div>
            <div class="lbl">Queue Pos</div>
          </div>
        </div>
        <div class="text-center">
          <div style="font-size:15px"><strong>${ahead}</strong> patient(s) ahead</div>
          ${estMin > 0 ? `<div class="text-muted" style="font-size:13px">~${estMin} min estimated wait</div>` : '<div class="text-success" style="font-size:13px;font-weight:700">You are next!</div>'}
        </div>
        <button class="btn btn-outline btn-sm" onclick="showQRForAppt(${apptId})">Show QR Token</button>
        ${myAppt && myAppt.status === 'completed' ? `<button class="btn btn-secondary btn-sm" onclick="viewPrescription(${apptId})">📄 View Prescription</button>` : ''}
      </div>
    `;
    if (statusEl && myAppt) statusEl.innerHTML = statusBadge(myAppt.status);
  } catch (err) { /* silent poll error */ }
}

async function showQRForAppt(apptId) {
  try {
    const data = await api(`/appointments/${apptId}`);
    if (data.appointment.qr_code) showQRModal(data.appointment);
    else toast('No QR', 'QR code not available for this appointment.', 'warning');
  } catch (err) { toast('Error', err.message, 'error'); }
}

async function viewPrescription(apptId) {
  try {
    const data = await api(`/appointments/${apptId}/prescription`);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    if (!data.prescription) {
      overlay.innerHTML = `<div class="modal"><h3>📄 Prescription</h3><p class="text-muted">No prescription added yet.</p><button class="btn btn-primary mt-2" onclick="this.closest('.modal-overlay').remove()">Close</button></div>`;
    } else {
      overlay.innerHTML = `<div class="modal" style="max-width:500px;text-align:left">
        <h3 style="text-align:center">📄 Prescription</h3>
        <p><strong>Doctor:</strong> ${escapeHtml(data.prescription.doctor_name)} (${escapeHtml(data.prescription.specialization)})</p>
        <p><strong>Date:</strong> ${escapeHtml(data.prescription.created_at)}</p>
        <div class="card mt-2" style="background:var(--surface-alt)"><p>${escapeHtml(data.prescription.notes).replace(/\n/g, '<br>')}</p></div>
        <button class="btn btn-primary mt-2 btn-block" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>`;
    }
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  } catch (err) { toast('Error', err.message, 'error'); }
}

// ===== Reminders page =====
async function loadRemindersPage() {
  if (!requireAuth('patient')) return;
  const container = document.getElementById('reminders-list');
  container.innerHTML = '<div class="loader"></div>';
  try {
    const data = await api('/reminders');
    if (data.reminders.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">💊</div><h3>No reminders yet</h3><p class="mt-1">Add your first medicine reminder using the form.</p></div>`;
    } else {
      container.innerHTML = data.reminders.map(r => `
        <div class="reminder-item">
          <div style="flex:1;min-width:200px">
            <div style="font-weight:700;font-size:16px">💊 ${escapeHtml(r.medicine_name)}</div>
            ${r.dosage ? `<div class="text-muted" style="font-size:13px">Dosage: ${escapeHtml(r.dosage)}</div>` : ''}
            <div class="mt-1">${r.times.split(',').map(t => `<span class="pill-time">${escapeHtml(t.trim())}</span>`).join('')}</div>
            <div class="text-muted mt-1" style="font-size:12px">From ${escapeHtml(r.start_date)} ${r.end_date ? 'to ' + escapeHtml(r.end_date) : '(ongoing)'}</div>
            ${r.notes ? `<div class="text-muted mt-1" style="font-size:12px">📝 ${escapeHtml(r.notes)}</div>` : ''}
            <span class="badge ${r.active ? 'badge-completed' : 'badge-waiting'} mt-1">${r.active ? 'Active' : 'Paused'}</span>
          </div>
          <div class="flex gap-1" style="flex-direction:column">
            <button class="btn btn-secondary btn-sm" onclick="toggleReminder(${r.id}, ${r.active ? 0 : 1})">${r.active ? 'Pause' : 'Resume'}</button>
            <button class="btn btn-danger btn-sm" onclick="deleteReminder(${r.id})">Delete</button>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>${escapeHtml(err.message)}</div>`;
  }
}

async function submitReminder(e) {
  e.preventDefault();
  if (!requireAuth('patient')) return;
  const f = e.target;
  const times = [f.t1.value, f.t2.value, f.t3.value].filter(Boolean).join(',');
  if (!times) { toast('Add a time', 'Please set at least one reminder time.', 'warning'); return; }
  const btn = f.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    await api('/reminders', 'POST', {
      medicine_name: f.medicine_name.value, dosage: f.dosage.value,
      times, start_date: f.start_date.value, end_date: f.end_date.value || null,
      notes: f.notes.value || null,
    });
    toast('Reminder added!', `${f.medicine_name.value} reminder is active.`, 'success');
    await requestReminderNotificationPermission();
    f.reset(); f.start_date.value = todayStr();
    loadRemindersPage();
  } catch (err) { toast('Failed', err.message, 'error'); }
  finally { btn.disabled = false; }
}

async function toggleReminder(id, active) {
  try {
    await api(`/reminders/${id}`, 'PUT', { active });
    toast('Updated', active ? 'Reminder resumed.' : 'Reminder paused.', 'success');
    loadRemindersPage();
  } catch (err) { toast('Error', err.message, 'error'); }
}

async function deleteReminder(id) {
  if (!confirm('Delete this reminder?')) return;
  try {
    await api(`/reminders/${id}`, 'DELETE');
    toast('Deleted', 'Reminder removed.', 'success');
    loadRemindersPage();
  } catch (err) { toast('Error', err.message, 'error'); }
}

// Browser medicine reminder notifications
async function requestReminderNotificationPermission() {
  if (!('Notification' in window)) {
    toast('Notifications unavailable', 'Your browser does not support notifications. Keep the MediQueue page open to see reminder alerts.', 'warning');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') {
    toast('Notifications blocked', 'Allow notifications for this site in Chrome site settings.', 'warning');
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast('Notifications not enabled', 'Reminder alerts will appear inside MediQueue while the page is open.', 'warning');
    }
    return permission === 'granted';
  } catch (err) {
    return false;
  }
}

function showMedicineNotification(r) {
  const today = new Date().toISOString().slice(0, 10);
  const minute = new Date().toTimeString().slice(0, 5);
  const key = `mediqueue-reminder-${r.id}-${today}-${minute}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');

  const message = `Time to take ${r.medicine_name}${r.dosage ? ' ' + r.dosage : ''}`;
  toast('⏰ Medicine Reminder', message, 'warning');

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('⏰ MediQueue Medicine Reminder', {
        body: message,
        icon: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
        tag: key
      });
    } catch (err) {}
  }
}

async function checkDueReminders() {
  if (state.role !== 'patient' || !state.token) return;
  try {
    const data = await api('/reminders/due');
    if (data.due && data.due.length > 0) {
      data.due.forEach(r => showMedicineNotification(r));
    }
  } catch (err) {}
}

// ===== History page =====
async function loadHistoryPage() {
  if (!requireAuth('patient')) return;
  const container = document.getElementById('history-list');
  container.innerHTML = '<div class="loader"></div>';
  try {
    const data = await api('/appointments/mine');
    if (data.appointments.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📋</div><h3>No appointments yet</h3><p class="mt-1">Your appointment history will appear here.</p></div>`;
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Token</th><th>Doctor</th><th>Date</th><th>Reason</th><th>Status</th><th>Prescription</th></tr></thead>
          <tbody>
            ${data.appointments.map(a => `
              <tr>
                <td><strong>#${a.token_number}</strong></td>
                <td>${escapeHtml(a.doctor_name)}<br><span class="text-muted" style="font-size:12px">${escapeHtml(a.specialization)}</span></td>
                <td>${escapeHtml(a.appointment_date)}</td>
                <td>${escapeHtml(a.reason || '-')}</td>
                <td>${statusBadge(a.status)}</td>
                <td>${a.status === 'completed' ? `<button class="btn btn-secondary btn-sm" onclick="viewPrescription(${a.id})">View</button>` : '-'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>${escapeHtml(err.message)}</div>`;
  }
}

// ===== Notifications page =====
async function loadNotifications() {
  if (!requireAuth('patient') && !requireAuth('doctor')) return;
  const container = document.getElementById('notif-list');
  container.innerHTML = '<div class="loader"></div>';
  try {
    const data = await api('/notifications');
    if (data.notifications.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🔔</div><h3>No notifications</h3><p class="mt-1">You are all caught up!</p></div>`;
      return;
    }
    container.innerHTML = `
      <button class="btn btn-secondary btn-sm mb-2" onclick="markAllRead()">Mark all as read</button>
      ${data.notifications.map(n => `
        <div class="reminder-item" style="border-left-color:${n.read ? 'var(--border)' : 'var(--info)'};opacity:${n.read ? 0.6 : 1}">
          <div style="flex:1">
            <div style="font-weight:${n.read ? 500 : 700}">${escapeHtml(n.message)}</div>
            <div class="text-muted" style="font-size:12px">${escapeHtml(n.created_at)}</div>
          </div>
        </div>`).join('')}`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>${escapeHtml(err.message)}</div>`;
  }
}

async function markAllRead() {
  try { await api('/notifications/read-all', 'PATCH'); toast('Done', 'All notifications marked read.', 'success'); loadNotifications(); }
  catch (err) { toast('Error', err.message, 'error'); }
}

// Doctor notifications (separate container id)
async function loadDoctorNotifications() {
  if (!requireAuth('doctor')) return;
  const container = document.getElementById('d-notif-list');
  if (!container) return;
  container.innerHTML = '<div class="loader"></div>';
  try {
    const data = await api('/notifications');
    if (data.notifications.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🔔</div><h3>No notifications</h3><p class="mt-1">New appointment bookings will appear here.</p></div>`;
      return;
    }
    container.innerHTML = `
      <button class="btn btn-secondary btn-sm mb-2" onclick="markAllReadDoctor()">Mark all as read</button>
      ${data.notifications.map(n => `
        <div class="reminder-item" style="border-left-color:${n.read ? 'var(--border)' : 'var(--info)'};opacity:${n.read ? 0.6 : 1}">
          <div style="flex:1">
            <div style="font-weight:${n.read ? 500 : 700}">${escapeHtml(n.message)}</div>
            <div class="text-muted" style="font-size:12px">${escapeHtml(n.created_at)}</div>
          </div>
        </div>`).join('')}`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>${escapeHtml(err.message)}</div>`;
  }
}
async function markAllReadDoctor() {
  try { await api('/notifications/read-all', 'PATCH'); toast('Done', 'All notifications marked read.', 'success'); loadDoctorNotifications(); }
  catch (err) { toast('Error', err.message, 'error'); }
}

// ===== Patient Dashboard =====
async function loadPatientDashboard() {
  if (!requireAuth('patient')) return;
  const container = document.getElementById('patient-stats');
  container.innerHTML = '<div class="loader"></div>';
  try {
    const data = await api('/notifications/patient/stats');
    container.innerHTML = `
      <div class="stat-card"><div class="stat-icon" style="background:var(--primary-light);color:var(--primary)">📋</div><div><div class="stat-value">${data.totalAppointments}</div><div class="stat-label">Total Appointments</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--success-light);color:var(--success)">✅</div><div><div class="stat-value">${data.completed}</div><div class="stat-label">Completed</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--warning-light);color:var(--warning)">⏳</div><div><div class="stat-value">${data.upcoming}</div><div class="stat-label">Upcoming / Active</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--info-light);color:var(--info)">💊</div><div><div class="stat-value">${data.activeReminders}</div><div class="stat-label">Active Reminders</div></div></div>
    `;
    const next = document.getElementById('patient-next');
    if (data.nextAppointment) {
      const a = data.nextAppointment;
      next.innerHTML = `
        <div class="token-card">
          <div class="token-label">Next Appointment</div>
          <div class="token-number">#${a.token_number}</div>
          <div class="token-label">${escapeHtml(a.doctor_name)} • ${escapeHtml(a.appointment_date)}</div>
        </div>
        <button class="btn btn-primary mt-2 btn-block" onclick="navigate('queue')">Track Live Queue</button>`;
    } else {
      next.innerHTML = `<div class="empty-state"><div class="icon">📅</div><h3>No upcoming appointment</h3><button class="btn btn-primary mt-2" onclick="navigate('book')">Book Now</button></div>`;
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>${escapeHtml(err.message)}</div>`;
  }
  // start reminder poll
  if (!state.reminderPollTimer) {
    checkDueReminders();
    state.reminderPollTimer = setInterval(checkDueReminders, 15000);
  }
}

// ===== Doctor Dashboard =====
async function loadDoctorDashboard() {
  if (!requireAuth('doctor')) return;
  loadDoctorStats();
}

async function loadDoctorStats() {
  if (!requireAuth('doctor')) return;
  const container = document.getElementById('doctor-stats');
  if (!container) return;
  container.innerHTML = '<div class="loader"></div>';
  try {
    const data = await api('/notifications/doctor/stats');
    container.innerHTML = `
      <div class="stat-card"><div class="stat-icon" style="background:var(--primary-light);color:var(--primary)">👥</div><div><div class="stat-value">${data.total}</div><div class="stat-label">Today's Patients</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--info-light);color:var(--info)">🩺</div><div><div class="stat-value">${data.inConsult}</div><div class="stat-label">In Consultation</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--warning-light);color:var(--warning)">⏳</div><div><div class="stat-value">${data.waiting}</div><div class="stat-label">Waiting</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--success-light);color:var(--success)">✅</div><div><div class="stat-value">${data.completed}</div><div class="stat-label">Completed</div></div></div>
    `;
    // Simple bar chart for weekly
    const chart = document.getElementById('doctor-chart');
    if (chart) {
      const max = Math.max(...data.weekly.map(w => w.count), 1);
      chart.innerHTML = data.weekly.length ? `
        <div style="display:flex;align-items:flex-end;gap:10px;height:160px;padding:10px 0">
          ${data.weekly.map(w => `
            <div style="flex:1;text-align:center">
              <div style="background:linear-gradient(var(--primary),var(--accent));height:${(w.count/max)*120}px;border-radius:6px 6px 0 0;min-height:4px"></div>
              <div class="text-muted" style="font-size:11px;margin-top:6px">${escapeHtml(w.appointment_date.slice(5))}</div>
              <div style="font-weight:700;font-size:13px">${w.count}</div>
            </div>`).join('')}
        </div>` : '<div class="empty-state"><div class="text-muted">No data for the past week yet.</div></div>';
    }
    // status distribution donut (text-based)
    const dist = document.getElementById('doctor-dist');
    if (dist) {
      const total = data.statusDistribution.reduce((s, x) => s + x.count, 0) || 1;
      dist.innerHTML = data.statusDistribution.map(s => {
        const pct = Math.round((s.count / total) * 100);
        const color = s.status === 'completed' ? 'var(--success)' : s.status === 'in_consultation' ? 'var(--info)' : s.status === 'waiting' ? 'var(--warning)' : 'var(--danger)';
        return `<div class="mb-1"><div class="flex-between" style="font-size:13px"><span>${s.status.replace('_', ' ')}</span><span><strong>${s.count}</strong> (${pct}%)</span></div><div style="height:8px;background:var(--surface-alt);border-radius:4px;margin-top:4px"><div style="height:100%;width:${pct}%;background:${color};border-radius:4px"></div></div></div>`;
      }).join('') || '<div class="text-muted">No appointments today.</div>';
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>${escapeHtml(err.message)}</div>`;
  }
}

// ===== Doctor Queue management =====
async function loadDoctorQueue() {
  if (!requireAuth('doctor')) return;
  const container = document.getElementById('doctor-queue-list');
  const dateInput = document.getElementById('doctor-queue-date');
  if (dateInput && !dateInput.value) dateInput.value = todayStr();
  container.innerHTML = '<div class="loader"></div>';
  if (state.queuePollTimer) { clearInterval(state.queuePollTimer); state.queuePollTimer = null; }
  const date = dateInput ? dateInput.value : todayStr();
  try {
    const data = await api(`/appointments/doctor/today?date=${encodeURIComponent(date)}`);
    if (data.appointments.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><h3>No appointments for ${escapeHtml(date)}</h3><p class="mt-1">Patients will appear here once they book.</p></div>`;
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Token</th><th>Patient</th><th>Details</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="doctor-queue-body">
            ${data.appointments.map(a => renderDoctorRow(a)).join('')}
          </tbody>
        </table>
      </div>`;
    // poll
    state.queuePollTimer = setInterval(() => refreshDoctorQueue(date), 8000);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>${escapeHtml(err.message)}</div>`;
  }
}

async function refreshDoctorQueue(date) {
  try {
    const data = await api(`/appointments/doctor/today?date=${encodeURIComponent(date)}`);
    const body = document.getElementById('doctor-queue-body');
    if (body) body.innerHTML = data.appointments.map(a => renderDoctorRow(a)).join('');
  } catch (err) {}
}

function renderDoctorRow(a) {
  const isWaiting = a.status === 'waiting';
  const isInConsult = a.status === 'in_consultation';
  return `
    <tr id="doc-row-${a.id}">
      <td><div style="font-size:22px;font-weight:800;color:var(--primary)">#${a.token_number}</div><div class="text-muted" style="font-size:11px">Pos ${a.queue_position || '-'}</div></td>
      <td><strong>${escapeHtml(a.patient_name)}</strong><br><span class="text-muted" style="font-size:12px">${a.age || '?'} yrs, ${escapeHtml(a.gender || '-')}<br>${escapeHtml(a.phone || 'No phone')}</span></td>
      <td><span class="text-muted" style="font-size:12px">${escapeHtml(a.appointment_date)}</span></td>
      <td style="max-width:160px;font-size:13px">${escapeHtml(a.reason || '-')}</td>
      <td>${statusBadge(a.status)}</td>
      <td>
        <div class="flex gap-1" style="flex-direction:column">
          ${isWaiting ? `<button class="btn btn-info btn-sm" style="background:var(--info);color:#fff" onclick="setApptStatus(${a.id},'in_consultation')">Start Consult</button>` : ''}
          ${isInConsult ? `<button class="btn btn-success btn-sm" onclick="setApptStatus(${a.id},'completed')">Mark Complete</button>` : ''}
          ${isInConsult ? `<button class="btn btn-warning btn-sm" onclick="setApptStatus(${a.id},'skipped')">Skip</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="openPrescription(${a.id},'${escapeHtml(a.patient_name).replace(/'/g, "\\'")}')">${a.status === 'completed' ? 'Edit' : 'Add'} Notes</button>
        </div>
      </td>
    </tr>`;
}

async function setApptStatus(id, status) {
  try {
    await api(`/appointments/${id}/status`, 'PATCH', { status });
    toast('Updated', `Appointment marked as ${status.replace('_', ' ')}.`, 'success');
    const date = document.getElementById('doctor-queue-date').value;
    refreshDoctorQueue(date);
    loadDoctorStats();
  } catch (err) { toast('Error', err.message, 'error'); }
}

function openPrescription(apptId, patientName) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px;text-align:left">
      <h3 style="text-align:center">📝 Prescription Notes</h3>
      <p class="text-muted text-center" style="font-size:14px">Patient: ${escapeHtml(patientName)}</p>
      <div class="form-group mt-2">
        <label>Notes / Medicines</label>
        <textarea id="presc-notes" placeholder="e.g. Paracetamol 500mg twice daily for 5 days. Rest and fluids. Follow-up in 1 week." style="min-height:120px"></textarea>
      </div>
      <div class="flex gap-1">
        <button class="btn btn-secondary btn-block" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary btn-block" onclick="savePrescription(${apptId}, this)">Save Prescription</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  // load existing
  api(`/appointments/${apptId}/prescription`).then(d => {
    if (d.prescription) document.getElementById('presc-notes').value = d.prescription.notes;
  }).catch(() => {});
}

async function savePrescription(apptId, btn) {
  const notes = document.getElementById('presc-notes').value.trim();
  if (!notes) { toast('Empty', 'Please write prescription notes.', 'warning'); return; }
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    await api(`/appointments/${apptId}/prescription`, 'POST', { notes });
    toast('Saved', 'Prescription saved successfully.', 'success');
    btn.closest('.modal-overlay').remove();
  } catch (err) { toast('Error', err.message, 'error'); btn.disabled = false; btn.textContent = 'Save Prescription'; }
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  // bind auth forms
  const pr = document.getElementById('form-patient-register'); if (pr) pr.addEventListener('submit', handlePatientRegister);
  const pl = document.getElementById('form-patient-login'); if (pl) pl.addEventListener('submit', handlePatientLogin);
  const dl = document.getElementById('form-doctor-login'); if (dl) dl.addEventListener('submit', handleDoctorLogin);
  const bf = document.getElementById('form-book'); if (bf) bf.addEventListener('submit', submitBooking);
  const rf = document.getElementById('form-reminder'); if (rf) { rf.addEventListener('submit', submitReminder); rf.querySelector('[name=start_date]').value = todayStr(); }

  // set reminder default date
  const sd = document.getElementById('reminder-start'); if (sd && !sd.value) sd.value = todayStr();

  updateHeader();
  navigate('home');
});

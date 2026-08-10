// In-browser data layer that mimics the backend API using localStorage.
// This lets the app run as a 100% static site with no server needed.

const DB_KEY = 'mediqueue_db_v1';

function loadDB() {
  let db = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
  if (!db) {
    db = seedDB();
    saveDB(db);
  }
  return db;
}
function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function uid() { return Date.now() + Math.floor(Math.random() * 10000); }
function nowISO() { return new Date().toISOString(); }
function today() { return new Date().toISOString().slice(0, 10); }
// Simple hash (not secure, fine for demo). Mimics bcrypt signature.
function hash(p) { return 'h$' + btoa(unescape(encodeURIComponent(p + 'salt'))); }
function verify(p, h) { return hash(p) === h; }

function seedDB() {
  const docPass = hash('doctor123');
  return {
    doctors: [
      { id: 1, name: 'Dr. Sarah Smith', email: 'sarah@hospital.com', password: docPass, specialization: 'General Physician', created_at: nowISO() },
      { id: 2, name: 'Dr. James Wilson', email: 'james@hospital.com', password: docPass, specialization: 'Cardiologist', created_at: nowISO() },
      { id: 3, name: 'Dr. Emily Davis', email: 'emily@hospital.com', password: docPass, specialization: 'Pediatrician', created_at: nowISO() },
    ],
    patients: [],
    appointments: [],
    prescriptions: [],
    reminders: [],
    notifications: [],
    nextId: 1000,
  };
}

function newId(db) { return ++db.nextId; }

function recomputeQueue(db, doctorId, date) {
  const waiting = db.appointments
    .filter(a => a.doctor_id === doctorId && a.appointment_date === date && a.status === 'waiting')
    .sort((a, b) => a.token_number - b.token_number);
  waiting.forEach((a, i) => { a.queue_position = i + 1; });
}

// ===== Mock QR code (SVG data URL) =====
function makeQR(text) {
  // Simple deterministic pseudo-QR visual (a grid) as an SVG data URL.
  // Not a real scannable QR, but a visual placeholder for the demo.
  const size = 21;
  let cells = '';
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
  function rng() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // finder patterns (corners)
      const corner = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
      let on;
      if (corner) {
        const cx = x < 7 ? 3 : size - 4, cy = y < 7 ? 3 : size - 4;
        const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
        on = (dx <= 3 && dy <= 3) && !((dx === 2 && dy <= 2) || (dy === 2 && dx <= 2)) || (dx <= 3 && dy <= 3 && dx === 3) || (dx <= 3 && dy <= 3 && dy === 3);
        on = ((dx === 0 || dx === 3 || (dx === 1 && dy !== 1 && dy !== 2) ) && dy <= 3) || ((dy === 0 || dy === 3) && dx <= 3) || (dx === 1 && dy === 1) || (dx === 1 && dy === 2 && false);
        // simpler: draw the 3 finder squares
        on = (dx <= 3 && dy <= 3) && (dx === 0 || dx === 3 || dy === 0 || dy === 3 || (dx <= 1 && dy <= 1));
      } else {
        on = rng() > 0.5;
      }
      if (on) cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="#000"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#fff"/>${cells}</svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// ===== JWT-like token (base64 payload, demo only) =====
function makeToken(user) {
  return 'demo.' + btoa(JSON.stringify({ id: user.id, role: user.role, name: user.name })) + '.sig';
}
function parseToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

// ===== API mock =====
const MockAPI = {
  async call(path, method = 'GET', body = null, token = null) {
    const db = loadDB();
    await new Promise(r => setTimeout(r, 120)); // simulate latency
    const [_, resource, ...rest] = path.split('/');

    // AUTH
    if (resource === 'auth') {
      if (rest[0] === 'patient' && rest[1] === 'register') {
        const { name, email, password, phone, age, gender } = body;
        if (db.patients.find(p => p.email === email)) throw new Error('Email already registered. Please login.');
        const patient = { id: newId(db), name, email, password: hash(password), phone, age, gender, created_at: nowISO() };
        db.patients.push(patient);
        saveDB(db);
        return { message: 'Registration successful', token: makeToken({ id: patient.id, role: 'patient', name }), patient: strip(patient) };
      }
      if (rest[0] === 'patient' && rest[1] === 'login') {
        const p = db.patients.find(x => x.email === body.email);
        if (!p || !verify(body.password, p.password)) throw new Error('Invalid email or password.');
        return { message: 'Login successful', token: makeToken({ id: p.id, role: 'patient', name: p.name }), patient: strip(p) };
      }
      if (rest[0] === 'doctor' && rest[1] === 'login') {
        const d = db.doctors.find(x => x.email === body.email);
        if (!d || !verify(body.password, d.password)) throw new Error('Invalid email or password.');
        return { message: 'Login successful', token: makeToken({ id: d.id, role: 'doctor', name: d.name }), doctor: strip(d, ['specialization']) };
      }
      if (rest[0] === 'doctors') {
        return { doctors: db.doctors.map(d => ({ id: d.id, name: d.name, email: d.email, specialization: d.specialization })) };
      }
      if (rest[0] === 'me') {
        const u = parseToken(token);
        if (!u) throw new Error('Invalid token.');
        if (u.role === 'patient') return { role: 'patient', user: strip(db.patients.find(p => p.id === u.id)) };
        if (u.role === 'doctor') return { role: 'doctor', user: strip(db.doctors.find(d => d.id === u.id), ['specialization']) };
      }
    }

    // Determine current user
    const user = token ? parseToken(token) : null;

    // APPOINTMENTS
    if (resource === 'appointments') {
      if (method === 'POST' && rest.length === 0) {
        // book
        if (user?.role !== 'patient') throw new Error('Patient access required.');
        const { doctor_id, appointment_date, reason } = body;
        const doctor = db.doctors.find(d => d.id === doctor_id);
        if (!doctor) throw new Error('Doctor not found.');
        const maxToken = db.appointments
          .filter(a => a.doctor_id === doctor_id && a.appointment_date === appointment_date)
          .reduce((m, a) => Math.max(m, a.token_number), 0);
        const token_number = maxToken + 1;
        const qr_code = makeQR(JSON.stringify({ patient_id: user.id, doctor_id, date: appointment_date, token: token_number }));
        const appt = {
          id: newId(db), patient_id: user.id, doctor_id, token_number, appointment_date,
          reason, status: 'waiting', queue_position: 1, qr_code, created_at: nowISO(), updated_at: nowISO(),
        };
        db.appointments.push(appt);
        recomputeQueue(db, doctor_id, appointment_date);
        db.notifications.push({ id: newId(db), doctor_id, message: `New appointment booked - Token #${token_number}`, type: 'new_appointment', read: 0, created_at: nowISO() });
        saveDB(db);
        return { message: 'Appointment booked successfully', appointment: appt };
      }
      if (rest[0] === 'mine') {
        if (user?.role !== 'patient') throw new Error('Patient access required.');
        const list = db.appointments.filter(a => a.patient_id === user.id).map(a => ({
          ...a, doctor_name: db.doctors.find(d => d.id === a.doctor_id)?.name, specialization: db.doctors.find(d => d.id === a.doctor_id)?.specialization,
        })).sort((a, b) => (b.appointment_date + b.token_number).localeCompare(a.appointment_date + a.token_number));
        return { appointments: list };
      }
      if (rest[0] === 'queue') {
        const doctorId = parseInt(rest[1]);
        const date = body?.__date || today();
        recomputeQueue(db, doctorId, date);
        const doctor = db.doctors.find(d => d.id === doctorId);
        const queue = db.appointments.filter(a => a.doctor_id === doctorId && a.appointment_date === date).sort((a, b) => a.token_number - b.token_number)
          .map(a => ({ ...a, patient_name: db.patients.find(p => p.id === a.patient_id)?.name, age: db.patients.find(p => p.id === a.patient_id)?.age, gender: db.patients.find(p => p.id === a.patient_id)?.gender }));
        const inConsult = queue.find(q => q.status === 'in_consultation');
        return { doctor, date, total: queue.length, waiting: queue.filter(q => q.status === 'waiting').length, completed: queue.filter(q => q.status === 'completed').length, current_token: inConsult?.token_number || null, queue };
      }
      if (rest[0] === 'doctor' && rest[1] === 'today') {
        if (user?.role !== 'doctor') throw new Error('Doctor access required.');
        const date = body?.__date || today();
        recomputeQueue(db, user.id, date);
        const list = db.appointments.filter(a => a.doctor_id === user.id && a.appointment_date === date).sort((a, b) => a.token_number - b.token_number)
          .map(a => ({ ...a, patient_name: db.patients.find(p => p.id === a.patient_id)?.name, age: db.patients.find(p => p.id === a.patient_id)?.age, gender: db.patients.find(p => p.id === a.patient_id)?.gender, phone: db.patients.find(p => p.id === a.patient_id)?.phone }));
        return { date, appointments: list };
      }
      // /appointments/:id
      if (rest.length === 1 && method === 'GET') {
        const appt = db.appointments.find(a => a.id === parseInt(rest[0]));
        if (!appt) throw new Error('Appointment not found');
        return { appointment: { ...appt, doctor_name: db.doctors.find(d => d.id === appt.doctor_id)?.name, specialization: db.doctors.find(d => d.id === appt.doctor_id)?.specialization } };
      }
      // /appointments/:id/status
      if (rest[1] === 'status' && method === 'PATCH') {
        if (user?.role !== 'doctor') throw new Error('Doctor access required.');
        const appt = db.appointments.find(a => a.id === parseInt(rest[0]) && a.doctor_id === user.id);
        if (!appt) throw new Error('Appointment not found for this doctor');
        appt.status = body.status; appt.updated_at = nowISO();
        recomputeQueue(db, appt.doctor_id, appt.appointment_date);
        const msgs = { in_consultation: `Your consultation has started (Token #${appt.token_number}).`, completed: `Your consultation is complete (Token #${appt.token_number}). Please check your prescription.`, skipped: `Your appointment was skipped (Token #${appt.token_number}). Please contact the desk.` };
        if (msgs[body.status]) db.notifications.push({ id: newId(db), patient_id: appt.patient_id, message: msgs[body.status], type: 'status_update', read: 0, created_at: nowISO() });
        saveDB(db);
        return { message: 'Status updated', appointment: appt };
      }
      // /appointments/:id/prescription
      if (rest[1] === 'prescription') {
        const appt = db.appointments.find(a => a.id === parseInt(rest[0]));
        if (!appt) throw new Error('Appointment not found');
        if (method === 'POST') {
          if (user?.role !== 'doctor') throw new Error('Doctor access required.');
          const existing = db.prescriptions.find(p => p.appointment_id === appt.id);
          if (existing) { existing.notes = body.notes; saveDB(db); return { message: 'Prescription updated', prescription: { id: existing.id, notes: body.notes } }; }
          const presc = { id: newId(db), appointment_id: appt.id, doctor_id: user.id, patient_id: appt.patient_id, notes: body.notes, created_at: nowISO() };
          db.prescriptions.push(presc);
          db.notifications.push({ id: newId(db), patient_id: appt.patient_id, message: 'A new prescription has been added to your record.', type: 'prescription', read: 0, created_at: nowISO() });
          saveDB(db);
          return { message: 'Prescription added', prescription: { id: presc.id, notes: body.notes } };
        }
        if (method === 'GET') {
          const presc = db.prescriptions.find(p => p.appointment_id === appt.id);
          if (presc) presc.doctor_name = db.doctors.find(d => d.id === presc.doctor_id)?.name, presc.specialization = db.doctors.find(d => d.id === presc.doctor_id)?.specialization;
          return { prescription: presc || null };
        }
      }
    }

    // REMINDERS
    if (resource === 'reminders') {
      if (user?.role !== 'patient') throw new Error('Patient access required.');
      if (method === 'GET' && rest[0] === 'due') {
        const now = new Date(); const ct = now.toTimeString().slice(0, 5); const t = today();
        const due = db.reminders.filter(r => r.patient_id === user.id && r.active === 1 && r.start_date <= t && (!r.end_date || r.end_date >= t))
          .filter(r => r.times.split(',').map(x => x.trim().slice(0, 5)).includes(ct));
        return { currentTime: ct, due };
      }
      if (method === 'GET') return { reminders: db.reminders.filter(r => r.patient_id === user.id) };
      if (method === 'POST') {
        const r = { id: newId(db), patient_id: user.id, ...body, active: 1, created_at: nowISO() };
        db.reminders.push(r); saveDB(db); return { message: 'Reminder created', reminder: r };
      }
      if (method === 'PUT') {
        const r = db.reminders.find(x => x.id === parseInt(rest[0]) && x.patient_id === user.id);
        if (!r) throw new Error('Reminder not found');
        Object.assign(r, ['medicine_name','dosage','times','start_date','end_date','notes','active'].reduce((acc, k) => (body[k] !== undefined ? (acc[k] = body[k], acc) : acc), {}));
        saveDB(db); return { message: 'Reminder updated', reminder: r };
      }
      if (method === 'DELETE') {
        const idx = db.reminders.findIndex(x => x.id === parseInt(rest[0]) && x.patient_id === user.id);
        if (idx < 0) throw new Error('Reminder not found');
        db.reminders.splice(idx, 1); saveDB(db); return { message: 'Reminder deleted' };
      }
    }

    // NOTIFICATIONS + STATS
    if (resource === 'notifications') {
      if (rest[0] === 'doctor' && rest[1] === 'stats') {
        if (user?.role !== 'doctor') throw new Error('Doctor access required.');
        const date = body?.__date || today();
        const appts = db.appointments.filter(a => a.doctor_id === user.id && a.appointment_date === date);
        const total = appts.length, waiting = appts.filter(a => a.status === 'waiting').length, completed = appts.filter(a => a.status === 'completed').length, inConsult = appts.filter(a => a.status === 'in_consultation').length;
        const weekly = [];
        for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const ds = d.toISOString().slice(0, 10); weekly.push({ appointment_date: ds, count: db.appointments.filter(a => a.doctor_id === user.id && a.appointment_date === ds).length }); }
        const statusDist = ['waiting', 'in_consultation', 'completed', 'skipped'].map(s => ({ status: s, count: appts.filter(a => a.status === s).length })).filter(x => x.count > 0);
        return { date, total, waiting, completed, inConsult, estimatedWaitMinutes: waiting * 12, weekly, statusDistribution: statusDist };
      }
      if (rest[0] === 'patient' && rest[1] === 'stats') {
        if (user?.role !== 'patient') throw new Error('Patient access required.');
        const appts = db.appointments.filter(a => a.patient_id === user.id);
        const nextAppt = db.appointments.filter(a => a.patient_id === user.id && (a.status === 'waiting' || a.status === 'in_consultation')).sort((a, b) => (a.appointment_date + a.token_number).localeCompare(b.appointment_date + b.token_number))[0];
        if (nextAppt) nextAppt.doctor_name = db.doctors.find(d => d.id === nextAppt.doctor_id)?.name, nextAppt.specialization = db.doctors.find(d => d.id === nextAppt.doctor_id)?.specialization;
        return {
          totalAppointments: appts.length,
          completed: appts.filter(a => a.status === 'completed').length,
          upcoming: appts.filter(a => a.status === 'waiting' || a.status === 'in_consultation').length,
          activeReminders: db.reminders.filter(r => r.patient_id === user.id && r.active === 1).length,
          unreadNotifications: db.notifications.filter(n => n.patient_id === user.id && !n.read).length,
          nextAppointment: nextAppt || null,
        };
      }
      if (rest[0] === 'read-all' && method === 'PATCH') {
        db.notifications.forEach(n => { if (user.role === 'patient' && n.patient_id === user.id) n.read = 1; if (user.role === 'doctor' && n.doctor_id === user.id) n.read = 1; });
        saveDB(db); return { message: 'All marked as read' };
      }
      if (rest.length === 2 && rest[1] === 'read' && method === 'PATCH') {
        const n = db.notifications.find(x => x.id === parseInt(rest[0]));
        if (n) n.read = 1; saveDB(db); return { message: 'Marked as read' };
      }
      // GET notifications
      if (method === 'GET') {
        const rows = user.role === 'patient' ? db.notifications.filter(n => n.patient_id === user.id) : db.notifications.filter(n => n.doctor_id === user.id);
        return { notifications: rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50) };
      }
    }

    throw new Error('Endpoint not found: ' + path);
  },
};

function strip(obj, extra = []) {
  if (!obj) return obj;
  const { password, ...rest } = obj;
  return rest;
}

// Expose globally
window.MockAPI = MockAPI;

// Appointment & Queue routes
const express = require('express');
const QRCode = require('qrcode');
const { db } = require('../db');
const { verifyToken, requirePatient, requireDoctor } = require('../middleware/auth');

const router = express.Router();

// Helper: get next token number for a doctor on a given date
function getNextToken(doctorId, date) {
  const row = db.prepare(
    'SELECT MAX(token_number) as maxToken FROM appointments WHERE doctor_id = ? AND appointment_date = ?'
  ).get(doctorId, date);
  return (row.maxToken || 0) + 1;
}

// Helper: recompute queue positions for waiting patients for a doctor/date
function recomputeQueue(doctorId, date) {
  const waiting = db.prepare(
    `SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'waiting' ORDER BY token_number ASC`
  ).all(doctorId, date);
  const update = db.prepare('UPDATE appointments SET queue_position = ? WHERE id = ?');
  waiting.forEach((row, idx) => {
    update.run(idx + 1, row.id);
  });
}

// ----- PATIENT: Book appointment -----
router.post('/', verifyToken, requirePatient, async (req, res) => {
  try {
    const { doctor_id, appointment_date, reason } = req.body;
    if (!doctor_id || !appointment_date) {
      return res.status(400).json({ error: 'doctor_id and appointment_date are required.' });
    }
    const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(doctor_id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }
    const token_number = getNextToken(doctor_id, appointment_date);
    const qrData = JSON.stringify({ patient_id: req.user.id, doctor_id, date: appointment_date, token: token_number });
    const qr_code = await QRCode.toDataURL(qrData, { width: 200 });

    const stmt = db.prepare(
      `INSERT INTO appointments (patient_id, doctor_id, token_number, appointment_date, reason, qr_code, status)
       VALUES (?, ?, ?, ?, ?, ?, 'waiting')`
    );
    const info = stmt.run(req.user.id, doctor_id, token_number, appointment_date, reason || null, qr_code);
    recomputeQueue(doctor_id, appointment_date);

    // Create a notification for the doctor
    db.prepare('INSERT INTO notifications (doctor_id, message, type) VALUES (?, ?, ?)').run(
      doctor_id,
      `New appointment booked - Token #${token_number}`,
      'new_appointment'
    );

    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ message: 'Appointment booked successfully', appointment });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ----- PATIENT: Get my appointments (history) -----
router.get('/mine', verifyToken, requirePatient, (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, d.name as doctor_name, d.specialization
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.patient_id = ?
    ORDER BY a.appointment_date DESC, a.token_number ASC
  `).all(req.user.id);
  res.json({ appointments: rows });
});

// ----- PATIENT: Get single appointment with queue info -----
router.get('/:id', verifyToken, (req, res) => {
  const appt = db.prepare(`
    SELECT a.*, d.name as doctor_name, d.specialization
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = ?
  `).get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ appointment: appt });
});

// ----- PATIENT/DOCTOR: Live queue status for a doctor on a date -----
router.get('/queue/:doctorId', verifyToken, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const doctor = db.prepare('SELECT id, name, specialization FROM doctors WHERE id = ?').get(req.params.doctorId);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  const queue = db.prepare(`
    SELECT a.id, a.token_number, a.queue_position, a.status, a.reason, a.appointment_date,
           p.name as patient_name, p.age, p.gender
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.doctor_id = ? AND a.appointment_date = ?
    ORDER BY a.token_number ASC
  `).all(req.params.doctorId, date);

  recomputeQueue(req.params.doctorId, date);

  const waiting = queue.filter(q => q.status === 'waiting');
  const inConsult = queue.find(q => q.status === 'in_consultation');
  const completed = queue.filter(q => q.status === 'completed').length;

  res.json({
    doctor,
    date,
    total: queue.length,
    waiting: waiting.length,
    completed,
    current_token: inConsult ? inConsult.token_number : null,
    queue
  });
});

// ----- PATIENT: Get my current queue position -----
router.get('/my-queue/:id', verifyToken, requirePatient, (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  recomputeQueue(appt.doctor_id, appt.appointment_date);
  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  res.json({ appointment: updated });
});

// ----- DOCTOR: Get all today's appointments -----
router.get('/doctor/today', verifyToken, requireDoctor, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  recomputeQueue(req.user.id, date);
  const queue = db.prepare(`
    SELECT a.*, p.name as patient_name, p.age, p.gender, p.phone
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.doctor_id = ? AND a.appointment_date = ?
    ORDER BY a.token_number ASC
  `).all(req.user.id, date);
  res.json({ date, appointments: queue });
});

// ----- DOCTOR: Mark consultation status (in_consultation / completed / skipped) -----
router.patch('/:id/status', verifyToken, requireDoctor, (req, res) => {
  const { status } = req.body;
  const valid = ['waiting', 'in_consultation', 'completed', 'skipped'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use: ' + valid.join(', ') });
  }
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND doctor_id = ?').get(req.params.id, req.user.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found for this doctor' });

  db.prepare("UPDATE appointments SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, req.params.id);
  recomputeQueue(appt.doctor_id, appt.appointment_date);

  // Notify patient
  const messages = {
    in_consultation: `Your consultation has started (Token #${appt.token_number}).`,
    completed: `Your consultation is complete (Token #${appt.token_number}). Please check your prescription.`,
    skipped: `Your appointment was skipped (Token #${appt.token_number}). Please contact the desk.`
  };
  if (messages[status]) {
    db.prepare('INSERT INTO notifications (patient_id, message, type) VALUES (?, ?, ?)').run(
      appt.patient_id, messages[status], 'status_update'
    );
  }

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  res.json({ message: 'Status updated', appointment: updated });
});

// ----- DOCTOR: Add prescription notes -----
router.post('/:id/prescription', verifyToken, requireDoctor, (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: 'Prescription notes are required.' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND doctor_id = ?').get(req.params.id, req.user.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found for this doctor' });

  const existing = db.prepare('SELECT id FROM prescriptions WHERE appointment_id = ?').get(req.params.id);
  if (existing) {
    db.prepare('UPDATE prescriptions SET notes = ? WHERE id = ?').run(notes, existing.id);
    res.json({ message: 'Prescription updated', prescription: { id: existing.id, notes } });
  } else {
    const info = db.prepare(
      'INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, notes) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, req.user.id, appt.patient_id, notes);
    db.prepare('INSERT INTO notifications (patient_id, message, type) VALUES (?, ?, ?)').run(
      appt.patient_id, 'A new prescription has been added to your record.', 'prescription'
    );
    res.status(201).json({ message: 'Prescription added', prescription: { id: info.lastInsertRowid, notes } });
  }
});

// ----- PATIENT: Get prescriptions for my appointments -----
router.get('/:id/prescription', verifyToken, (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  // patient can view own; doctor can view own appointments
  if (req.user.role === 'patient' && appt.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (req.user.role === 'doctor' && appt.doctor_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const presc = db.prepare(`
    SELECT pr.*, d.name as doctor_name, d.specialization
    FROM prescriptions pr
    JOIN doctors d ON pr.doctor_id = d.id
    WHERE pr.appointment_id = ?
  `).get(req.params.id);
  res.json({ prescription: presc || null });
});

module.exports = router;

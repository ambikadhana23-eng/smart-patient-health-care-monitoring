// Notification & dashboard stats routes
const express = require('express');
const { db } = require('../db');
const { verifyToken, requirePatient, requireDoctor } = require('../middleware/auth');

const router = express.Router();

// Get notifications for logged-in user
router.get('/', verifyToken, (req, res) => {
  let rows = [];
  if (req.user.role === 'patient') {
    rows = db.prepare(
      'SELECT * FROM notifications WHERE patient_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.user.id);
  } else if (req.user.role === 'doctor') {
    rows = db.prepare(
      'SELECT * FROM notifications WHERE doctor_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.user.id);
  }
  res.json({ notifications: rows });
});

// Mark notification as read
router.patch('/:id/read', verifyToken, (req, res) => {
  if (req.user.role === 'patient') {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND patient_id = ?').run(req.params.id, req.user.id);
  } else {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND doctor_id = ?').run(req.params.id, req.user.id);
  }
  res.json({ message: 'Marked as read' });
});

// Mark all as read
router.patch('/read-all', verifyToken, (req, res) => {
  if (req.user.role === 'patient') {
    db.prepare('UPDATE notifications SET read = 1 WHERE patient_id = ?').run(req.user.id);
  } else {
    db.prepare('UPDATE notifications SET read = 1 WHERE doctor_id = ?').run(req.user.id);
  }
  res.json({ message: 'All marked as read' });
});

// ----- DOCTOR: Dashboard statistics -----
router.get('/doctor/stats', verifyToken, requireDoctor, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const total = db.prepare('SELECT COUNT(*) as c FROM appointments WHERE doctor_id = ? AND appointment_date = ?').get(req.user.id, date).c;
  const waiting = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'waiting'").get(req.user.id, date).c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'completed'").get(req.user.id, date).c;
  const inConsult = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'in_consultation'").get(req.user.id, date).c;
  const avgWait = waiting > 0 ? Math.round((waiting * 12)) : 0; // estimate 12 min per patient

  // weekly breakdown
  const weekly = db.prepare(`
    SELECT appointment_date, COUNT(*) as count
    FROM appointments
    WHERE doctor_id = ?
      AND appointment_date >= date(?, '-6 days')
    GROUP BY appointment_date
    ORDER BY appointment_date ASC
  `).all(req.user.id, date);

  // status distribution
  const statusDist = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM appointments
    WHERE doctor_id = ? AND appointment_date = ?
    GROUP BY status
  `).all(req.user.id, date);

  res.json({
    date,
    total, waiting, completed, inConsult,
    estimatedWaitMinutes: avgWait,
    weekly,
    statusDistribution: statusDist
  });
});

// ----- PATIENT: Dashboard statistics -----
router.get('/patient/stats', verifyToken, requirePatient, (req, res) => {
  const totalAppts = db.prepare('SELECT COUNT(*) as c FROM appointments WHERE patient_id = ?').get(req.user.id).c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE patient_id = ? AND status = 'completed'").get(req.user.id).c;
  const upcoming = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE patient_id = ? AND status IN ('waiting','in_consultation')").get(req.user.id).c;
  const activeReminders = db.prepare('SELECT COUNT(*) as c FROM reminders WHERE patient_id = ? AND active = 1').get(req.user.id).c;
  const unreadNotifs = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE patient_id = ? AND read = 0').get(req.user.id).c;

  // upcoming appointment with queue info
  const nextAppt = db.prepare(`
    SELECT a.*, d.name as doctor_name, d.specialization
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.patient_id = ? AND a.status IN ('waiting','in_consultation')
    ORDER BY a.appointment_date ASC, a.token_number ASC
    LIMIT 1
  `).get(req.user.id);

  res.json({
    totalAppointments: totalAppts,
    completed,
    upcoming,
    activeReminders,
    unreadNotifications: unreadNotifs,
    nextAppointment: nextAppt || null
  });
});

module.exports = router;

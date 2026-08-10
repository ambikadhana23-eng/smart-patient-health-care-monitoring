// Medicine reminder routes
const express = require('express');
const { db } = require('../db');
const { verifyToken, requirePatient } = require('../middleware/auth');

const router = express.Router();

// List reminders for the logged-in patient
router.get('/', verifyToken, requirePatient, (req, res) => {
  const reminders = db.prepare(
    'SELECT * FROM reminders WHERE patient_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json({ reminders });
});

// Create a reminder
router.post('/', verifyToken, requirePatient, (req, res) => {
  const { medicine_name, dosage, times, start_date, end_date, notes } = req.body;
  if (!medicine_name || !times || !start_date) {
    return res.status(400).json({ error: 'medicine_name, times and start_date are required.' });
  }
  const info = db.prepare(
    `INSERT INTO reminders (patient_id, medicine_name, dosage, times, start_date, end_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, medicine_name, dosage || null, times, start_date, end_date || null, notes || null);
  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ message: 'Reminder created', reminder });
});

// Update a reminder
router.put('/:id', verifyToken, requirePatient, (req, res) => {
  const { medicine_name, dosage, times, start_date, end_date, notes, active } = req.body;
  const existing = db.prepare('SELECT * FROM reminders WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Reminder not found' });

  db.prepare(`
    UPDATE reminders SET
      medicine_name = COALESCE(?, medicine_name),
      dosage = COALESCE(?, dosage),
      times = COALESCE(?, times),
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      notes = COALESCE(?, notes),
      active = COALESCE(?, active)
    WHERE id = ?
  `).run(
    medicine_name || null, dosage || null, times || null, start_date || null,
    end_date !== undefined ? end_date : null, notes || null,
    active !== undefined ? active : null, req.params.id
  );
  const updated = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);
  res.json({ message: 'Reminder updated', reminder: updated });
});

// Delete a reminder
router.delete('/:id', verifyToken, requirePatient, (req, res) => {
  const existing = db.prepare('SELECT id FROM reminders WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Reminder not found' });
  db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);
  res.json({ message: 'Reminder deleted' });
});

// Get reminders due now (based on current time) - for notification checks
router.get('/due', verifyToken, requirePatient, (req, res) => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  const today = now.toISOString().slice(0, 10);
  const reminders = db.prepare(`
    SELECT * FROM reminders
    WHERE patient_id = ? AND active = 1
      AND start_date <= ?
      AND (end_date IS NULL OR end_date >= ?)
  `).all(req.user.id, today, today);
  const due = reminders.filter(r => {
    const times = r.times.split(',').map(t => t.trim().slice(0, 5));
    return times.includes(currentTime);
  });
  res.json({ currentTime, due });
});

module.exports = router;

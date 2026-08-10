// Authentication routes (register/login for patients and doctors)
const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { generateToken, verifyToken, requirePatient, requireDoctor } = require('../middleware/auth');

const router = express.Router();

// ----- PATIENT AUTH -----

// Patient Register
router.post('/patient/register', (req, res) => {
  try {
    const { name, email, password, phone, age, gender } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    const existing = db.prepare('SELECT id FROM patients WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered. Please login.' });
    }
    const hashed = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(
      'INSERT INTO patients (name, email, password, phone, age, gender) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const info = stmt.run(name, email, hashed, phone || null, age || null, gender || null);
    const token = generateToken({ id: info.lastInsertRowid, role: 'patient', name });
    res.status(201).json({
      message: 'Registration successful',
      token,
      patient: { id: info.lastInsertRowid, name, email, phone, age, gender }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Patient Login
router.post('/patient/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const patient = db.prepare('SELECT * FROM patients WHERE email = ?').get(email);
    if (!patient) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!bcrypt.compareSync(password, patient.password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = generateToken({ id: patient.id, role: 'patient', name: patient.name });
    res.json({
      message: 'Login successful',
      token,
      patient: { id: patient.id, name: patient.name, email: patient.email, phone: patient.phone, age: patient.age, gender: patient.gender }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ----- DOCTOR AUTH -----

// Doctor Login
router.post('/doctor/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const doctor = db.prepare('SELECT * FROM doctors WHERE email = ?').get(email);
    if (!doctor) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!bcrypt.compareSync(password, doctor.password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = generateToken({ id: doctor.id, role: 'doctor', name: doctor.name });
    res.json({
      message: 'Login successful',
      token,
      doctor: { id: doctor.id, name: doctor.name, email: doctor.email, specialization: doctor.specialization }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get current user profile
router.get('/me', verifyToken, (req, res) => {
  if (req.user.role === 'patient') {
    const p = db.prepare('SELECT id, name, email, phone, age, gender FROM patients WHERE id = ?').get(req.user.id);
    if (!p) return res.status(404).json({ error: 'Patient not found' });
    return res.json({ role: 'patient', user: p });
  } else if (req.user.role === 'doctor') {
    const d = db.prepare('SELECT id, name, email, specialization FROM doctors WHERE id = ?').get(req.user.id);
    if (!d) return res.status(404).json({ error: 'Doctor not found' });
    return res.json({ role: 'doctor', user: d });
  }
  res.status(400).json({ error: 'Unknown role' });
});

// List doctors (for patient booking page)
router.get('/doctors', (req, res) => {
  const doctors = db.prepare('SELECT id, name, email, specialization FROM doctors ORDER BY name').all();
  res.json({ doctors });
});

module.exports = router;

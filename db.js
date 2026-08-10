// Database setup and initialization using better-sqlite3
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'healthcare.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDatabase() {
  // Doctors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      specialization TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Patients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      age INTEGER,
      gender TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Appointments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      token_number INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'waiting',
      queue_position INTEGER,
      qr_code TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );
  `);

  // Prescriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `);

  // Medicine reminders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      medicine_name TEXT NOT NULL,
      dosage TEXT,
      times TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `);

  // Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      doctor_id INTEGER,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );
  `);

  // Seed default doctors if none exist
  const countDoctors = db.prepare('SELECT COUNT(*) as cnt FROM doctors').get();
  if (countDoctors.cnt === 0) {
    const hashedPassword = bcrypt.hashSync('doctor123', 10);
    const insertDoctor = db.prepare(
      'INSERT INTO doctors (name, email, password, specialization) VALUES (?, ?, ?, ?)'
    );
    insertDoctor.run('Dr. Sarah Smith', 'sarah@hospital.com', hashedPassword, 'General Physician');
    insertDoctor.run('Dr. James Wilson', 'james@hospital.com', hashedPassword, 'Cardiologist');
    insertDoctor.run('Dr. Emily Davis', 'emily@hospital.com', hashedPassword, 'Pediatrician');
    console.log('Seeded 3 default doctors (password: doctor123)');
  }

  console.log('Database initialized successfully at:', DB_PATH);
}

module.exports = { db, initDatabase };

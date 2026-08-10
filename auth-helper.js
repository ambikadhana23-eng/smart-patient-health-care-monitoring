// Authentication middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart-healthcare-secret-key-2024';
const JWT_EXPIRES = '7d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requirePatient(req, res, next) {
  if (!req.user || req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Patient access required.' });
  }
  next();
}

function requireDoctor(req, res, next) {
  if (!req.user || req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Doctor access required.' });
  }
  next();
}

module.exports = { JWT_SECRET, generateToken, verifyToken, requirePatient, requireDoctor };

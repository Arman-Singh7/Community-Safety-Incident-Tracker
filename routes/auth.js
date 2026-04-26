const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secure_jwt_secret';

const logAudit = (action, details, userId) => {
  try {
    const stmt = db.prepare('INSERT INTO audit_logs (action, details, user_id, timestamp) VALUES (?, ?, ?, ?)');
    stmt.run(action, details, userId, new Date().toISOString());
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
};

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logAudit('login_failed', `Failed login attempt for username: ${username}`, null);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  logAudit('login', 'User logged in', user.id);

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role }
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', requireAuth, (req, res) => {
  logAudit('logout', 'User logged out', req.user.id);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;

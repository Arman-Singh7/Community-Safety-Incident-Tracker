const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const logAudit = (action, details, userId) => {
  try {
    const stmt = db.prepare('INSERT INTO audit_logs (action, details, user_id, timestamp) VALUES (?, ?, ?, ?)');
    stmt.run(action, details, userId, new Date().toISOString());
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
};

// GET /api/alerts (Fetch recent alerts from DB)
router.get('/', requireAuth, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 50');
    const alerts = stmt.all();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/alerts/simulate (Manual "Simulate Alert" button)
router.post('/simulate', requireAuth, requireAdmin, (req, res) => {
  try {
    const { message, severity } = req.body;
    
    if (!message || !severity) {
      return res.status(400).json({ error: 'Message and severity are required' });
    }

    const now = new Date().toISOString();
    
    const stmt = db.prepare('INSERT INTO alerts (message, severity, timestamp) VALUES (?, ?, ?)');
    const info = stmt.run(message, severity, now);
    
    const alertData = {
      id: info.lastInsertRowid,
      message,
      severity,
      timestamp: now
    };

    // Emit event to server.js for SSE
    req.app.emit('new_alert', alertData);
    
    logAudit('simulate_alert', `Simulated alert: ${message}`, req.user.id);
    res.status(201).json({ message: 'Alert simulated successfully', alert: alertData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to simulate alert' });
  }
});

module.exports = router;

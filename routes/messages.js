const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const logAudit = (action, details, userId) => {
  try {
    const stmt = db.prepare('INSERT INTO audit_logs (action, details, user_id, timestamp) VALUES (?, ?, ?, ?)');
    stmt.run(action, details, userId, new Date().toISOString());
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
};

// GET /api/messages/inbox
router.get('/inbox', requireAuth, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT messages.*, users.username as sender_name 
      FROM messages 
      JOIN users ON messages.sender_id = users.id 
      WHERE recipient_id = ? OR recipient_id IS NULL 
      ORDER BY timestamp DESC
    `);
    const messages = stmt.all(req.user.id);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/messages/users (For selecting recipient)
router.get('/users', requireAuth, (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, username FROM users WHERE id != ?');
    const users = stmt.all(req.user.id);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/messages
router.post('/', requireAuth, (req, res) => {
  try {
    const { subject, content, recipient_id } = req.body;
    
    if (!subject || !content) {
      return res.status(400).json({ error: 'Subject and content are required' });
    }

    const now = new Date().toISOString();
    const finalRecipient = recipient_id === 'broadcast' ? null : recipient_id;

    const stmt = db.prepare(`
      INSERT INTO messages (subject, content, sender_id, recipient_id, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(subject, content, req.user.id, finalRecipient, now);
    
    logAudit('send_message', `Sent message: ${subject}`, req.user.id);
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;

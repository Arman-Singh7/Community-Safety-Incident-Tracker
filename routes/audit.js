const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/audit
router.get('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT audit_logs.*, users.username 
      FROM audit_logs 
      LEFT JOIN users ON audit_logs.user_id = users.id 
      ORDER BY timestamp DESC
    `);
    const logs = stmt.all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// DELETE /api/audit (Admin can clear logs)
router.delete('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM audit_logs');
    stmt.run();
    res.json({ message: 'Audit logs cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear audit logs' });
  }
});

module.exports = router;

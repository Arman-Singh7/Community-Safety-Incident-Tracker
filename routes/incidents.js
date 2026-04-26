const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../database');
const { requireAuth, requireAdmin, requireAnalystOrAdmin } = require('../middleware/auth');

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024, files: 5 } // 500KB per file, max 5 files
});

const logAudit = (action, details, userId) => {
  try {
    const stmt = db.prepare('INSERT INTO audit_logs (action, details, user_id, timestamp) VALUES (?, ?, ?, ?)');
    stmt.run(action, details, userId, new Date().toISOString());
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
};

// GET /api/incidents
router.get('/', requireAuth, (req, res) => {
  try {
    let query = 'SELECT incidents.*, users.username as creator_name FROM incidents JOIN users ON incidents.created_by = users.id WHERE 1=1';
    const params = [];

    // Role-based visibility
    if (req.user.role === 'viewer') {
      query += ' AND visibility = ?';
      params.push('public');
    }

    // Filtering
    if (req.query.severity) {
      query += ' AND severity = ?';
      params.push(req.query.severity);
    }
    if (req.query.status) {
      query += ' AND status = ?';
      params.push(req.query.status);
    }
    if (req.query.search) {
      query += ' AND (name LIKE ? OR notes LIKE ?)';
      params.push(`%${req.query.search}%`, `%${req.query.search}%`);
    }

    query += ' ORDER BY date_reported DESC';

    const incidents = db.prepare(query).all(...params);
    
    // Parse attachments JSON
    const parsedIncidents = incidents.map(inc => ({
      ...inc,
      attachments: inc.attachments ? JSON.parse(inc.attachments) : []
    }));

    res.json(parsedIncidents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// POST /api/incidents
router.post('/', requireAuth, requireAnalystOrAdmin, upload.array('attachments', 5), (req, res) => {
  try {
    const { name, type, severity, status, visibility, date_reported, notes } = req.body;
    
    const files = req.files ? req.files.map(f => ({
      originalname: f.originalname,
      filename: f.filename,
      path: `/uploads/${f.filename}`,
      mimetype: f.mimetype
    })) : [];

    const attachmentsJson = JSON.stringify(files);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO incidents (name, type, severity, status, visibility, date_reported, updated_at, notes, created_by, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(name, type, severity, status, visibility, date_reported, now, notes, req.user.id, attachmentsJson);
    
    logAudit('create_incident', `Created incident: ${name} (ID: ${info.lastInsertRowid})`, req.user.id);
    
    res.status(201).json({ message: 'Incident created successfully', id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

// PUT /api/incidents/:id
router.put('/:id', requireAuth, requireAnalystOrAdmin, upload.array('attachments', 5), (req, res) => {
  try {
    const { name, type, severity, status, visibility, date_reported, notes, existing_attachments } = req.body;
    
    // Handle existing attachments sent as JSON string
    let parsedExisting = [];
    if (existing_attachments) {
      try {
        parsedExisting = JSON.parse(existing_attachments);
      } catch (e) {
        parsedExisting = [];
      }
    }

    const newFiles = req.files ? req.files.map(f => ({
      originalname: f.originalname,
      filename: f.filename,
      path: `/uploads/${f.filename}`,
      mimetype: f.mimetype
    })) : [];

    const allAttachments = [...parsedExisting, ...newFiles].slice(0, 5); // Enforce max 5
    const attachmentsJson = JSON.stringify(allAttachments);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE incidents 
      SET name = ?, type = ?, severity = ?, status = ?, visibility = ?, date_reported = ?, updated_at = ?, notes = ?, attachments = ?
      WHERE id = ?
    `);

    const result = stmt.run(name, type, severity, status, visibility, date_reported, now, notes, attachmentsJson, req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    logAudit('update_incident', `Updated incident ID: ${req.params.id}`, req.user.id);
    res.json({ message: 'Incident updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

// DELETE /api/incidents/:id (Admin only)
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM incidents WHERE id = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    logAudit('delete_incident', `Deleted incident ID: ${req.params.id}`, req.user.id);
    res.json({ message: 'Incident deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete incident' });
  }
});

// DELETE /api/incidents/batch (Admin only)
router.delete('/batch', requireAuth, requireAdmin, (req, res) => {
  try {
    const { ids } = req.body; // Array of IDs
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Array of IDs required' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`DELETE FROM incidents WHERE id IN (${placeholders})`);
    const result = stmt.run(...ids);

    logAudit('batch_delete_incidents', `Deleted ${result.changes} incidents`, req.user.id);
    res.json({ message: `Successfully deleted ${result.changes} incidents` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to batch delete incidents' });
  }
});

module.exports = router;

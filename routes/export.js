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

// GET /api/export/json
router.get('/json', requireAuth, requireAdmin, (req, res) => {
  try {
    const incidents = db.prepare('SELECT * FROM incidents').all();
    
    logAudit('export_json', `Exported ${incidents.length} incidents to JSON`, req.user.id);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="incidents_export.json"');
    res.send(JSON.stringify(incidents, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Failed to export to JSON' });
  }
});

// GET /api/export/csv
router.get('/csv', requireAuth, requireAdmin, (req, res) => {
  try {
    const incidents = db.prepare('SELECT * FROM incidents').all();
    
    if (incidents.length === 0) {
      return res.status(404).json({ error: 'No incidents to export' });
    }

    const headers = Object.keys(incidents[0]).join(',');
    const rows = incidents.map(inc => {
      return Object.values(inc).map(val => {
        if (val === null) return '';
        // Escape quotes and wrap in quotes for CSV
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',');
    });

    const csvData = [headers, ...rows].join('\n');
    
    logAudit('export_csv', `Exported ${incidents.length} incidents to CSV`, req.user.id);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="incidents_export.csv"');
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export to CSV' });
  }
});

// POST /json is currently mapped to /api/export/json. 
// We will change server.js to use this router for /api/import as well.
router.post('/json', requireAuth, requireAdmin, express.json({limit: '10mb'}), (req, res) => {
  try {
    const incidents = req.body;
    
    if (!Array.isArray(incidents)) {
      return res.status(400).json({ error: 'Invalid format. Expected JSON array of incidents.' });
    }

    // Replace all existing incidents
    db.transaction(() => {
      db.prepare('DELETE FROM incidents').run();
      
      const insertStmt = db.prepare(`
        INSERT INTO incidents (id, name, type, severity, status, visibility, date_reported, updated_at, notes, created_by, attachments)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const inc of incidents) {
        insertStmt.run(
          inc.id, inc.name, inc.type, inc.severity, inc.status, 
          inc.visibility, inc.date_reported, inc.updated_at, 
          inc.notes, inc.created_by, inc.attachments
        );
      }
    })();

    logAudit('import_json', `Imported ${incidents.length} incidents (replaced all)`, req.user.id);
    res.json({ message: 'Incidents imported successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import incidents' });
  }
});

module.exports = router;

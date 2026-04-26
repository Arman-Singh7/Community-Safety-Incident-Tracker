const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data', 'app.db');
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath, { verbose: console.log });
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'viewer'
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL,
    visibility TEXT NOT NULL,
    date_reported TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL,
    attachments TEXT,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    severity TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(recipient_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    details TEXT,
    user_id INTEGER,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed default users if the table is empty
const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
const { count } = stmt.get();

if (count === 0) {
  console.log('Seeding default users...');
  const insertUser = db.prepare('INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)');
  
  const defaultUsers = [
    { username: 'admin', password: 'admin123', email: 'admin@example.com', role: 'admin' },
    { username: 'analyst', password: 'analyst123', email: 'analyst@example.com', role: 'analyst' },
    { username: 'viewer', password: 'viewer123', email: 'viewer@example.com', role: 'viewer' }
  ];

  const saltRounds = 10;
  db.transaction(() => {
    for (const user of defaultUsers) {
      const hash = bcrypt.hashSync(user.password, saltRounds);
      insertUser.run(user.username, hash, user.email, user.role);
    }
  })();
  console.log('Default users seeded successfully.');
}

module.exports = db;

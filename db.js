const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function initDb() {
  const dbPath = path.join(__dirname, 'data', 'school.db');

  // ensure data directory exists
  const fs = require('fs');
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // facilities and events tables for dynamic content
    db.run(`
      CREATE TABLE IF NOT EXISTS facilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        icon TEXT,
        name TEXT,
        description TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT
      )
    `);

    // gallery table for images
    db.run(`
      CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        caption TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized; call initDb first');
  }
  return db;
}

module.exports = { initDb, getDb };

import sqlite3 from 'sqlite3';

const dbFile = process.env.DB_FILE || './data/botdata.sqlite';
const db = new sqlite3.Database(dbFile);

function migrate() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            userId TEXT,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    db.run(`CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            location TEXT,
            date_text TEXT,
            added_by TEXT,
            discord_event_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    db.run(`CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);
  });
}

export { db, migrate };

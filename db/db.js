import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbFile = process.env.DB_FILE || './data/botdata.sqlite';
mkdirSync(dirname(dbFile), { recursive: true });
const db = new DatabaseSync(dbFile);

function migrate() {
  db.exec(`CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    userId TEXT,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    date_text TEXT,
    added_by TEXT,
    discord_event_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT  )`);

  // Prüfe ob streamers Tabelle existiert
  const streamersExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='streamers'")
    .get();

  if (streamersExists) {
    // Tabelle existiert - prüfe ob altes Schema (mit UNIQUE message_id)
    try {
      db.prepare("SELECT message_id FROM streamers LIMIT 1").get();
      // Versuche Datenbankschema zu migrieren
      db.exec(`ALTER TABLE streamers RENAME TO streamers_backup`);
      db.exec(`CREATE TABLE streamers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        stream_location TEXT NOT NULL,
        resolution_fps TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id)
      )`);
      db.exec(`INSERT INTO streamers SELECT * FROM streamers_backup`);
      db.exec(`DROP TABLE streamers_backup`);
    } catch (err) {
      // Schema ist bereits neu oder Fehler - ignore
    }
  } else {
    // Neue Installation - erstelle mit korrektem Schema
    db.exec(`CREATE TABLE streamers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      stream_location TEXT NOT NULL,
      resolution_fps TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id)
    )`);
  }

  db.exec(`CREATE TABLE IF NOT EXISTS stream_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT UNIQUE NOT NULL,
    channel_id TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP  )`);
}

export { db, migrate };

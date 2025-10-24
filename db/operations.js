// db/operations.js
import { db } from './db.js';

function deleteTopicById(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM topics WHERE id = ?', [id], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function deleteEventById(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM events WHERE id = ?', [id], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function insertTopic(user, userId, text) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO topics (user, userId, text) VALUES (?, ?, ?)',
      [user, userId, text],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getAllTopics() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM topics ORDER BY created_at ASC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function clearTopics() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM topics', [], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function insertEvent(title, description, location, dateText, addedBy, discordEventId = null) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO events (title, description, location, date_text, added_by, discord_event_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, location, dateText, addedBy, discordEventId],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getAllEvents() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM events ORDER BY created_at ASC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function clearEvents() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM events', [], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getConfig(key) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM config WHERE key = ?', [key], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.value : null);
    });
  });
}

function setConfig(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
      [key, value],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export default {
  deleteTopicById,
  deleteEventById,
  insertTopic,
  getAllTopics,
  clearTopics,
  insertEvent,
  getAllEvents,
  clearEvents,
  getConfig,
  setConfig,
};

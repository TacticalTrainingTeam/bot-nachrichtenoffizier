import { db } from './db.js';

const deleteTopicById = (id) => db.prepare('DELETE FROM topics WHERE id = ?').run(id);

const deleteEventById = (id) => db.prepare('DELETE FROM events WHERE id = ?').run(id);

const insertTopic = (user, userId, text) => {
  const result = db
    .prepare('INSERT INTO topics (user, userId, text) VALUES (?, ?, ?)')
    .run(user, userId, text);
  return Number(result.lastInsertRowid);
};

const getAllTopics = () => db.prepare('SELECT * FROM topics ORDER BY created_at ASC').all();

const clearTopics = () => db.prepare('DELETE FROM topics').run();

function insertEvent(
  title,
  dateText = null,
  addedBy = null,
  description = null,
  location = null,
  discordEventId = null
) {
  const result = db
    .prepare(
      'INSERT INTO events (title, description, location, date_text, added_by, discord_event_id) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(title, description, location, dateText, addedBy, discordEventId);
  return Number(result.lastInsertRowid);
}

const getAllEvents = () => db.prepare('SELECT * FROM events ORDER BY date_text ASC').all();

const clearEvents = () => db.prepare('DELETE FROM events').run();

const getConfig = (key) => {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  return row ? row.value : null;
};

const setConfig = (key, value) =>
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);

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

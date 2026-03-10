import { db } from './db.js';

const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(new Error(err));
      else resolve(this);
    })
  );

const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => {
      if (err) reject(new Error(err));
      else resolve(row);
    })
  );

const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => {
      if (err) reject(new Error(err));
      else resolve(rows);
    })
  );

const deleteTopicById = (id) => run('DELETE FROM topics WHERE id = ?', [id]);

const deleteEventById = (id) => run('DELETE FROM events WHERE id = ?', [id]);

const insertTopic = (user, userId, text) =>
  run('INSERT INTO topics (user, userId, text) VALUES (?, ?, ?)', [user, userId, text]).then(
    (ctx) => ctx.lastID
  );

const getAllTopics = () => all('SELECT * FROM topics ORDER BY created_at ASC');

const clearTopics = () => run('DELETE FROM topics');

function insertEvent(
  title,
  dateText = null,
  addedBy = null,
  description = null,
  location = null,
  discordEventId = null
) {
  return run(
    'INSERT INTO events (title, description, location, date_text, added_by, discord_event_id) VALUES (?, ?, ?, ?, ?, ?)',
    [title, description, location, dateText, addedBy, discordEventId]
  ).then((ctx) => ctx.lastID);
}

const getAllEvents = () => all('SELECT * FROM events ORDER BY date_text ASC');

const clearEvents = () => run('DELETE FROM events');

const getConfig = (key) =>
  get('SELECT value FROM config WHERE key = ?', [key]).then((row) => (row ? row.value : null));

const setConfig = (key, value) =>
  run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value]);

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

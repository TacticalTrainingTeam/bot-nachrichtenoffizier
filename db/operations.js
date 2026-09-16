import { db } from './db.js';

const lastId = (result) => Number(result.lastInsertRowid);

const insertTopic = (user, userId, text) =>
  lastId(
    db.prepare('INSERT INTO topics (user, userId, text) VALUES (?, ?, ?)').run(user, userId, text)
  );
const deleteTopicById = (id) => db.prepare('DELETE FROM topics WHERE id = ?').run(id);
const getAllTopics = () => db.prepare('SELECT * FROM topics ORDER BY created_at ASC').all();
const clearTopics = () => db.prepare('DELETE FROM topics').run();

const insertEvent = (
  title,
  dateText = null,
  addedBy = null,
  description = null,
  location = null,
  discordEventId = null
) =>
  lastId(
    db
      .prepare(
        'INSERT INTO events (title, description, location, date_text, added_by, discord_event_id) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(title, description, location, dateText, addedBy, discordEventId)
  );
const deleteEventById = (id) => db.prepare('DELETE FROM events WHERE id = ?').run(id);
const getAllEvents = () => db.prepare('SELECT * FROM events ORDER BY date_text ASC').all();
const clearEvents = () => db.prepare('DELETE FROM events').run();
const clearSyncedEvents = () =>
  db.prepare('DELETE FROM events WHERE discord_event_id IS NOT NULL').run();

const getConfig = (key) =>
  db.prepare('SELECT value FROM config WHERE key = ?').get(key)?.value ?? null;
const setConfig = (key, value) =>
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);

const insertStreamer = (messageId, channelId, userId, userName, streamLocation, streamUrl = null) =>
  db
    .prepare(
      'INSERT INTO streamers (message_id, channel_id, user_id, user_name, stream_location, stream_url) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(messageId, channelId, userId, userName, streamLocation, streamUrl);
const getStreamersByMessageId = (messageId) =>
  db.prepare('SELECT * FROM streamers WHERE message_id = ? ORDER BY created_at ASC').all(messageId);
const deleteStreamerByUserAndMessage = (messageId, userId) =>
  db.prepare('DELETE FROM streamers WHERE message_id = ? AND user_id = ?').run(messageId, userId);

const insertStreamMessage = (messageId, channelId) =>
  db
    .prepare('INSERT INTO stream_messages (message_id, channel_id) VALUES (?, ?)')
    .run(messageId, channelId);
const getStreamMessageByChannelId = (channelId) =>
  db.prepare('SELECT * FROM stream_messages WHERE channel_id = ?').get(channelId);
const getAllStreamMessages = () => db.prepare('SELECT * FROM stream_messages').all();
const deleteStreamMessage = (messageId) => {
  db.prepare('DELETE FROM streamers WHERE message_id = ?').run(messageId);
  db.prepare('DELETE FROM stream_messages WHERE message_id = ?').run(messageId);
};

export default {
  insertTopic,
  deleteTopicById,
  getAllTopics,
  clearTopics,
  insertEvent,
  deleteEventById,
  getAllEvents,
  clearEvents,
  clearSyncedEvents,
  getConfig,
  setConfig,
  insertStreamer,
  getStreamersByMessageId,
  deleteStreamerByUserAndMessage,
  insertStreamMessage,
  getStreamMessageByChannelId,
  getAllStreamMessages,
  deleteStreamMessage,
};

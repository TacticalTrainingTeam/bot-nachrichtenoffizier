function deleteTopicById(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM topics WHERE id = ?', [id], function(err) {
      if (err) reject(err); else resolve();
    });
  });
}

function deleteEventById(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM events WHERE id = ?', [id], function(err) {
      if (err) reject(err); else resolve();
    });
  });
}
// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const dbFile = process.env.DB_FILE || './botdata.sqlite';
const timezone = process.env.TIMEZONE || 'Europe/Berlin';
const defaultPostCron = '37 13 * * SUN'; // Sonntags 13:37

if (!token || !clientId) {
  console.error('Bitte DISCORD_TOKEN und CLIENT_ID in .env setzen.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const db = new sqlite3.Database(dbFile);
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
    date_text TEXT,
    added_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  // Migration: Spalte discord_event_id ergänzen, falls sie fehlt
  db.get("PRAGMA table_info(events)", (err, row) => {
    if (err) return;
    db.all("PRAGMA table_info(events)", (err, columns) => {
      if (err) return;
      const hasDiscordEventId = columns.some(col => col.name === 'discord_event_id');
      if (!hasDiscordEventId) {
        db.run("ALTER TABLE events ADD COLUMN discord_event_id TEXT", [], (err) => {
          if (!err) console.log("Spalte discord_event_id zur Tabelle events hinzugefügt.");
        });
      }
    });
  });
});

// Datenbankoperationen als Funktionen
// Hilfsfunktion: Discord-Events der kommenden Woche auslesen und eintragen
async function syncDiscordEventsToDb(guild) {
  if (!guild || !guild.scheduledEvents) return;
  // Entferne alle alten Discord-Events aus der Datenbank
  await new Promise((resolve, reject) => {
    db.run("DELETE FROM events WHERE added_by = 'Discord-Event'", [], function(err) {
      if (err) reject(err); else resolve();
    });
  });
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const events = await guild.scheduledEvents.fetch();
  for (const event of events.values()) {
    const start = event.scheduledStartAt || event.scheduledStartTimestamp;
    if (!start) continue;
    const startDate = new Date(start);
    // Korrekte Umwandlung nach deutscher Zeit
    const berlinTime = startDate.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
    // Vergleiche mit now/nextWeek in Berlin-Zeit
    const nowBerlin = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    const nextWeekBerlin = new Date(nextWeek.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    const startBerlin = new Date(startDate.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    if (startBerlin > nowBerlin && startBerlin < nextWeekBerlin) {
      await insertEvent(event.name, berlinTime, 'Discord-Event', event.id);
    }
  }
}
function insertTopic(user, userId, text) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO topics (user, userId, text) VALUES (?, ?, ?)', [user, userId, text], function(err) {
      if (err) reject(err); else resolve(this.lastID);
    });
  });
}

function getAllTopics() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM topics ORDER BY created_at ASC', [], (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

function clearTopics() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM topics', [], function(err) {
      if (err) reject(err); else resolve();
    });
  });
}

function insertEvent(title, dateText, addedBy, discordEventId = null) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO events (title, date_text, added_by, discord_event_id) VALUES (?, ?, ?, ?)', [title, dateText, addedBy, discordEventId], function(err) {
      if (err) reject(err); else resolve(this.lastID);
    });
  });
}

function getAllEvents() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM events ORDER BY created_at ASC', [], (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

function clearEvents() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM events', [], function(err) {
      if (err) reject(err); else resolve();
    });
  });
}

function getConfig(key) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM config WHERE key = ?', [key], (err, row) => {
      if (err) reject(err); else resolve(row ? row.value : null);
    });
  });
}

function setConfig(key, value) {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value], function(err) {
      if (err) reject(err); else resolve();
    });
  });
}

async function postWeeklySummary() {
  try {
    const channelId = await getConfig('postChannel');
    if (!channelId) {
      console.log('Kein Zielkanal konfiguriert (config.postChannel). Überspringe wöchentlichen Post.');
  // ...existing code...
    }
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      console.log('Zielkanal nicht erreichbar. Überspringe Post.');
  // ...existing code...
    }
    const topics = await getAllTopics();
    const events = await getAllEvents();
    let message = '**🗓 Themen & Events für die nächste Woche**\n\n';
    if (events.length) {
      message += '**📌 Events:**\n';
      for (const e of events) {
        message += '• **' + e.title + '**' + (e.date_text ? ' — ' + e.date_text : '') + '\n';
      }
      message += '\n';
    } else {
      message += '_Keine Events eingetragen._\n\n';
    }
    if (topics.length) {
      message += '**💡 Eingereichte Themen:**\n';
      for (const t of topics) {
        message += '• ' + t.text + ' — _von ' + t.user + '_\n';
      }
    } else {
      message += '_Keine Themen eingereicht._\n';
    }
    message += '\n---\nWenn ihr noch Themen habt: `/thema`';
    await channel.send({ content: message });
    // Nach dem Post löschen (Reset für nächste Woche)
    await clearTopics();
    await clearEvents();
    console.log('Wöchentliche Zusammenfassung gepostet und Daten gelöscht.');
  } catch (err) {
    console.error('Fehler beim Posten der Wochenübersicht:', err);
  }
}

// Command Handler Functions
// Technik-Rollen-ID
const technikRoleId = '406217855860867072';
async function handleThema(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'hinzufügen') {
    const text = interaction.options.getString('text', true);
    await insertTopic(interaction.user.tag, interaction.user.id, text);
    await interaction.reply({ content: '✅ Dein Thema wurde gespeichert. Danke!', ephemeral: true });
    return;
  }
  if (sub === 'löschen') {
    const id = interaction.options.getInteger('id', true);
    await deleteTopicById(id);
    await interaction.reply({ content: `✅ Thema mit ID ${id} gelöscht.`, ephemeral: true });
    return;
  }
  await interaction.reply({ content: 'Unbekannter Subcommand für /thema.', ephemeral: true });
}

async function handleThemen(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'löschen') {
    await clearTopics();
    await interaction.reply({ content: '✅ Alle Themen wurden gelöscht.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: 'Unbekannter Subcommand für /themen.', ephemeral: true });
}

async function handleEvent(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'hinzufügen') {
    const title = interaction.options.getString('titel', true);
    const dateText = interaction.options.getString('datum', false) || null;
    await insertEvent(title, dateText, interaction.user.tag);
    await interaction.reply({ content: '✅ Event **' + title + '** wurde gespeichert.', ephemeral: true });
    return;
  }
  if (sub === 'löschen') {
    const id = interaction.options.getInteger('id', true);
    await deleteEventById(id);
    await interaction.reply({ content: `✅ Event mit ID ${id} gelöscht.`, ephemeral: true });
    return;
  }
  await interaction.reply({ content: 'Unbekannter Subcommand für /event.', ephemeral: true });
}

async function handleConfig(interaction) {
  const hasTechnikRole = interaction.member?.roles?.cache?.has(technikRoleId);
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild) && !hasTechnikRole) {
    await interaction.reply({ content: 'Nur Admins mit Manage Server oder Technik-Rolle dürfen die Konfiguration ändern.', ephemeral: true });
    return;
  }
  const channel = interaction.options.getChannel('channel', true);
  if (!channel.isTextBased()) {
    await interaction.reply({ content: 'Bitte wähle einen Textkanal.', ephemeral: true });
    return;
  }
  await setConfig('postChannel', channel.id);
  await interaction.reply({ content: `✅ Zielkanal gesetzt: ${channel}`, ephemeral: true });
  const sub = interaction.options.getSubcommand();
  if (sub === 'löschen') {
    await clearEvents();
    await interaction.reply({ content: '✅ Alle Events wurden gelöscht.', ephemeral: true });
    return;
  }
  if (sub === 'aufräumen') {
    await syncDiscordEventsToDb(interaction.guild);
    await interaction.reply({ content: '✅ Die Discord-Eventliste wurde synchronisiert.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: 'Unbekannter Subcommand für /events.', ephemeral: true });
}

// Komplexität reduzieren: Hilfsfunktionen für Teilbereiche
async function handleWochenuebersicht(interaction) {
  // ...existing code...
  let channel = interaction.options.getChannel('channel', false);
  if (!channel) {
    const channelId = await getConfig('postChannel');
    if (!channelId) {
      await interaction.reply({ content: 'Kein Zielkanal konfiguriert. Bitte zuerst mit /config setzen.', ephemeral: true });
      return;
    }
    channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.reply({ content: 'Konfigurierter Kanal nicht erreichbar.', ephemeral: true });
      return;
    }
  }
  // Discord-Events synchronisieren
  await syncDiscordEventsToDb(interaction.guild);
  const topics = await getAllTopics();
  const events = await getAllEvents();
  // Wochenanfang (Montag) und Ende (Sonntag) berechnen
  const now = new Date();
  // Finde Montag dieser Woche
  const dayOfWeek = now.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek); // Sonntag=0, Montag=1
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0,0,0,0);
  // Finde Sonntag dieser Woche
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23,59,59,999);
  // Kompaktes Datumsformat: 20.-26.10.2025
  const mondayDay = monday.getDate().toString().padStart(2, '0');
  const sundayDay = sunday.getDate().toString().padStart(2, '0');
  const month = (monday.getMonth() + 1).toString().padStart(2, '0');
  const year = monday.getFullYear();
  let message = `# 🗓 Wochenübersicht (${mondayDay}.${month}.–${sundayDay}.${month}.${year})\n\n`;
  // Events trennen
  const discordEvents = events.filter(e => e.added_by === 'Discord-Event');
  const spontaneEvents = events.filter(e => e.added_by !== 'Discord-Event');

  if (discordEvents.length) {
    message += '## 📅 Events\n';
    for (const e of discordEvents) {
      message += '• **' + e.title + '**' + (e.date_text ? ' — ' + e.date_text : '') + '\n';
    }
    message += '\n';
  } else {
    message += '## 📅 _Keine geplanten Events._\n\n';
  }

  if (spontaneEvents.length) {
    message += '## ⚡ Spontane Events\n';
    for (const e of spontaneEvents) {
      message += '• **' + e.title + '**' + (e.date_text ? ' — ' + e.date_text : '') + (e.added_by ? ' _(von ' + e.added_by + ')_' : '') + '\n';
    }
    message += '\n';
  } else {
    message += '## ⚡ _Keine spontanen Events eingetragen._\n\n';
  }

  if (topics.length) {
    message += '## 💡 Themen\n';
    for (const t of topics) {
      message += '• ' + t.text + ' — _von ' + t.user + '_\n';
    }
  } else {
    message += '## 💡 _Keine Themen eingereicht._\n';
  }
  message += '\n---\nNeue Themen oder spontane Events für die nächste Woche? Nutzt `/thema hinzufügen` oder `/event hinzufügen`!';
  // Für alle sichtbar posten
  await channel.send({ content: message });
  await interaction.reply({ content: '✅ Übersicht wurde gesendet.', ephemeral: false });
}



// Haupt-Dispatcher
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const name = interaction.commandName;
  try {
    switch (name) {
      case 'thema':
        await handleThema(interaction);
        break;
      case 'themen':
        await handleThemen(interaction);
        break;
      case 'event':
        await handleEvent(interaction);
        break;
      case 'events':
        await handleEvents(interaction);
        break;
      // 'themen-events' entfernt
      case 'wochenüberblick':
        await handleWochenuebersicht(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unbekannter Command.', ephemeral: true });
    }
  } catch (err) {
    console.error('Fehler im Command-Handler:', err);
    await interaction.reply({ content: 'Fehler bei der Verarbeitung des Commands.', ephemeral: true });
  }
});
// Handler für /events
async function handleEvents(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'löschen') {
    await clearEvents();
    await interaction.reply({ content: '✅ Alle Events wurden gelöscht.', ephemeral: true });
    return;
  }
  if (sub === 'aufräumen') {
    await syncDiscordEventsToDb(interaction.guild);
    await interaction.reply({ content: '✅ Die Discord-Eventliste wurde synchronisiert.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: 'Unbekannter Subcommand für /events.', ephemeral: true });
}

client.login(token);
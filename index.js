
require('dotenv').config();
const cron = require('node-cron');
const { migrate } = require('./db/db');
const dbOps = require('./db/operations');
const { handleError } = require('./utils/errorHandler');
const commandRouter = require('./commandRouter');
const { isAdmin, isEventManager, canManageEvents } = require('./utils/permissions');
const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const timezone = process.env.TIMEZONE || 'Europe/Berlin';
const defaultPostCron = process.env.POST_CRON;

if (!token || !clientId) {
    console.error('Bitte DISCORD_TOKEN und CLIENT_ID in .env setzen.');
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel]
});

migrate();

// Synchronisiert Discord-Events der kommenden Woche mit der Datenbank
async function syncDiscordEventsToDb(guild) {
  if (!guild?.scheduledEvents) return;
  await dbOps.clearEvents();
  // Berechne nächste Woche (Montag bis Sonntag)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToNextMonday = (8 - dayOfWeek) % 7 || 7;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysToNextMonday);
  nextMonday.setHours(0,0,0,0);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  nextSunday.setHours(23,59,59,999);
  const events = await guild.scheduledEvents.fetch();
  for (const event of events.values()) {
    const start = event.scheduledStartAt || event.scheduledStartTimestamp;
    if (!start) continue;
    const startDate = new Date(start);
    const startBerlin = new Date(startDate.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    if (startBerlin >= nextMonday && startBerlin <= nextSunday) {
      const berlinTime = startDate.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
      await dbOps.insertEvent(event.name, berlinTime, 'Discord-Event', event.id);
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
    // Berechne nächste Woche (Montag bis Sonntag)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToNextMonday = (8 - dayOfWeek) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysToNextMonday);
    nextMonday.setHours(0,0,0,0);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23,59,59,999);
  const mondayDay = nextMonday.getDate().toString().padStart(2, '0');
  const sundayDay = nextSunday.getDate().toString().padStart(2, '0');
  const mondayMonth = (nextMonday.getMonth() + 1).toString().padStart(2, '0');
  const sundayMonth = (nextSunday.getMonth() + 1).toString().padStart(2, '0');
  const year = nextMonday.getFullYear();
  let message = `**🗓 Themen & Events für die nächste Woche (${mondayDay}.${mondayMonth}.–${sundayDay}.${sundayMonth}.${year})**\n\n`;
    if (events.length) {
      message += '**📌 Events:**\n';
      for (const e of events) {
        let eventText = `**${e.title}**`;
        let dateText = e.date_text;
        if (dateText) {
          // Entferne Sekunden aus Zeitangabe, z.B. "28.10.2025, 19:30:00" -> "28.10.2025, 19:30"
          dateText = dateText.replace(/(\d{2}:\d{2}):\d{2}/, '$1');
        }
        message += `• ${eventText}${dateText ? ' — ' + dateText : ''}\n`;
      }
      message += '\n';
    } else {
      message += '_Keine Events eingetragen._\n\n';
    }
    /*
    // Themen und spontane Events werden in der Testphase nicht angezeigt
    if (topics.length) {
      message += '**💡 Eingereichte Themen:**\n';
      for (const t of topics) {
        message += '• ' + t.text + ' — _von ' + t.user + '_\n';
      }
    } else {
      message += '_Keine Themen eingereicht._\n';
    }
    */
  // message += '\n---\nWenn ihr noch Themen habt: `/thema`';
  await channel.send({ content: message, flags: 4096 }); // SuppressEmbeds: verhindert Discord-Event-Anhänge
    // Nach dem Post löschen (Reset für nächste Woche)
    await clearTopics();
    await clearEvents();
    console.log('Wöchentliche Zusammenfassung gepostet und Daten gelöscht.');
  } catch (err) {
    console.error('Fehler beim Posten der Wochenübersicht:', err);
  }
}


// Wochenübersicht Handler
async function handleWochenuebersicht(interaction) {
    try {
        let channel = interaction.options.getChannel('channel', false);
        if (!channel) {
            const channelId = await dbOps.getConfig('postChannel');
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
        await syncDiscordEventsToDb(interaction.guild);
        const topics = await dbOps.getAllTopics();
        const events = await dbOps.getAllEvents();
  // Berechne nächste Woche (Montag bis Sonntag)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToNextMonday = (8 - dayOfWeek) % 7 || 7;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysToNextMonday);
  nextMonday.setHours(0,0,0,0);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  nextSunday.setHours(23,59,59,999);
  const mondayDay = nextMonday.getDate().toString().padStart(2, '0');
  const sundayDay = nextSunday.getDate().toString().padStart(2, '0');
  const month = (nextMonday.getMonth() + 1).toString().padStart(2, '0');
  const year = nextMonday.getFullYear();
  let message = `# 🗓 Wochenübersicht (${mondayDay}.${month}.–${sundayDay}.${month}.${year})\n\n`;
        const discordEvents = events.filter(e => e.added_by === 'Discord-Event');
    /*
    // Spontane Events und Themen werden in der Testphase nicht angezeigt
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
    */
    if (discordEvents.length) {
      message += '## 📅 Events\n';
      for (const e of discordEvents) {
        let eventText = `**${e.title}**`;
        let dateText = e.date_text;
        if (dateText) {
          dateText = dateText.replace(/(\d{2}:\d{2}):\d{2}/, '$1');
        }
        message += `• ${eventText}${dateText ? ' — ' + dateText : ''}\n`;
      }
      message += '\n';
    } else {
      message += '## 📅 _Keine geplanten Events._\n\n';
    }
  // message += '\n---\nNeue Themen oder spontane Events für die nächste Woche? Nutzt `/thema hinzufügen` oder `/event hinzufügen`!';
  await interaction.reply({ content: message });
    } catch (err) {
        const errorMsg = handleError(err, 'Wochenübersicht');
        await interaction.reply({ content: errorMsg.message, ephemeral: true });
    }
}



// Haupt-Dispatcher
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const name = interaction.commandName;
  try {
    const member = interaction.member;
    // Admin darf alles
    if (isAdmin(member)) {
      if (name === 'wochenüberblick') {
        await handleWochenuebersicht(interaction);
        return;
      }
      const handler = commandRouter[name];
      if (handler) {
        if (name === 'events') {
          await handler(interaction, dbOps, syncDiscordEventsToDb);
        } else {
          await handler(interaction, dbOps);
        }
      } else {
        await interaction.reply({ content: 'Unbekannter Command.', ephemeral: true });
      }
      return;
    }

    // Eventmanagement darf hinzufügen/löschen
    const eventCommands = ['thema', 'themen', 'event', 'events'];
    if (eventCommands.includes(name) && canManageEvents(member)) {
      const handler = commandRouter[name];
      if (handler) {
        if (name === 'events') {
          await handler(interaction, dbOps, syncDiscordEventsToDb);
        } else {
          await handler(interaction, dbOps);
        }
      } else {
        await interaction.reply({ content: 'Unbekannter Command.', ephemeral: true });
      }
      return;
    }

    // Normale User dürfen nichts
    await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Command.', ephemeral: true });
  } catch (err) {
    const errorMsg = handleError(err, 'Dispatcher');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
});

client.login(token);

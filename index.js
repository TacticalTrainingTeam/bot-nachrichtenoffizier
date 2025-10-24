import { getNextWeekRange } from './utils/dateUtils.js';
import { createEventText } from './utils/eventUtils.js';

import 'dotenv/config';
import cron from 'node-cron';
import { migrate } from './db/db.js';
import dbOps from './db/operations.js';
import { handleError } from './utils/errorHandler.js';
import commandRouter from './commandRouter.js';
import { isAdmin, canManageEvents } from './utils/permissions.js';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import logger from './utils/logger.js';
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const timezone = process.env.TIMEZONE || 'Europe/Berlin';
const defaultPostCron = process.env.POST_CRON;

if (!token || !clientId) {
  logger.error('Bitte DISCORD_TOKEN und CLIENT_ID in .env setzen.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
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
  nextMonday.setHours(0, 0, 0, 0);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);
  const events = await guild.scheduledEvents.fetch();
  for (const event of events.values()) {
    const start = event.scheduledStartAt || event.scheduledStartTimestamp;
    if (!start) continue;
    const startDate = new Date(start);
    const startBerlin = new Date(startDate.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    if (startBerlin >= nextMonday && startBerlin <= nextSunday) {
      const berlinTime = startDate.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
      await dbOps.insertEvent(
        event.name,
        event.description || '',
        event.location || '',
        berlinTime,
        'Discord-Event',
        event.id
      );
    }
  }
}

async function postWeeklySummary() {
  try {
    const channelId = await dbOps.getConfig('postChannel');
    if (!channelId) {
      logger.info(
        'Kein Zielkanal konfiguriert (config.postChannel). Überspringe wöchentlichen Post.'
      );
      // ...existing code...
    }
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      logger.warn('Zielkanal nicht erreichbar. Überspringe Post.');
      // ...existing code...
    }
    const events = await dbOps.getAllEvents();
    const { nextMonday, nextSunday } = getNextWeekRange();
    const mondayDay = nextMonday.getDate().toString().padStart(2, '0');
    const sundayDay = nextSunday.getDate().toString().padStart(2, '0');
    const mondayMonth = (nextMonday.getMonth() + 1).toString().padStart(2, '0');
    const sundayMonth = (nextSunday.getMonth() + 1).toString().padStart(2, '0');
    const year = nextMonday.getFullYear();
    let message = `**🗓 Themen & Events für die nächste Woche (${mondayDay}.${mondayMonth}.–${sundayDay}.${sundayMonth}.${year})**\n\n`;
    if (events.length) {
      message += '**📌 Events:**\n';
      for (const e of events) {
        message += createEventText(e) + '\n';
      }
      message += '\n';
    } else {
      message += '_Keine Events eingetragen._\n\n';
    }
    /*
    // Themen und spontane Events werden in der Testphase nicht angezeigt
    */
    // message += '\n---\nWenn ihr noch Themen habt: `/thema`';
    message += `\nAlle Events findest du hier: <#1184236432575955055>`;
    await channel.send({ content: message, flags: 4096 }); // SuppressEmbeds: verhindert Discord-Event-Anhänge
    // Nach dem Post löschen (Reset für nächste Woche)
    await dbOps.clearTopics();
    await dbOps.clearEvents();
    logger.info('Wöchentliche Zusammenfassung gepostet und Daten gelöscht.');
  } catch (err) {
    logger.error('Fehler beim Posten der Wochenübersicht:', err);
  }
}

// Wochenübersicht Handler
async function handleWochenuebersicht(interaction) {
  try {
    let channel = interaction.options.getChannel('channel', false);
    if (!channel) {
      const channelId = await dbOps.getConfig('postChannel');
      if (!channelId) {
        await interaction.reply({
          content: 'Kein Zielkanal konfiguriert. Bitte zuerst mit /config setzen.',
          ephemeral: true,
        });
        return;
      }
      channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        await interaction.reply({
          content: 'Konfigurierter Kanal nicht erreichbar.',
          ephemeral: true,
        });
        return;
      }
    }
    await syncDiscordEventsToDb(interaction.guild);
    const events = await dbOps.getAllEvents();
    const { nextMonday, nextSunday } = getNextWeekRange();
    const mondayDay = nextMonday.getDate().toString().padStart(2, '0');
    const sundayDay = nextSunday.getDate().toString().padStart(2, '0');
    const mondayMonth = (nextMonday.getMonth() + 1).toString().padStart(2, '0');
    const sundayMonth = (nextSunday.getMonth() + 1).toString().padStart(2, '0');
    const year = nextMonday.getFullYear();
    let message = `# 🗓 Wochenübersicht (${mondayDay}.${mondayMonth}.–${sundayDay}.${sundayMonth}.${year})\n\n`;
    const discordEvents = events.filter((e) => e.added_by === 'Discord-Event');
    /*
    // Spontane Events und Themen werden in der Testphase nicht angezeigt
    */
    if (discordEvents.length) {
      message += '## 📅 Events\n';
      for (const e of discordEvents) {
        message += createEventText(e) + '\n';
      }
      message += '\n';
    } else {
      message += '## 📅 _Keine geplanten Events._\n\n';
    }
    // message += '\n---\nNeue Themen oder spontane Events für die nächste Woche? Nutzt `/thema hinzufügen` oder `/event hinzufügen`!';
    message += `\nAlle Events findest du hier: <#1184236432575955055>`;
    await channel.send({ content: message });
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
    await interaction.reply({
      content: 'Du hast keine Berechtigung für diesen Command.',
      ephemeral: true,
    });
  } catch (err) {
    const errorMsg = handleError(err, 'Dispatcher');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
});

client.login(token);

// Starte wöchentlichen Cron-Job
if (defaultPostCron) {
  cron.schedule(defaultPostCron, postWeeklySummary, {
    timezone: timezone,
  });
  logger.info(`Wöchentlicher Post-Cron gestartet: ${defaultPostCron}`);
} else {
  logger.warn('Kein POST_CRON gesetzt. Wöchentlicher Post deaktiviert.');
}

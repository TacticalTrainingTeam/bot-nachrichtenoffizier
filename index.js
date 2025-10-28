import { getNextWeekRange } from './utils/dateUtils.js';
import { createEventText } from './utils/eventUtils.js';
import { syncDiscordEventsToDb } from './utils/discordSync.js';

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


async function postWeeklySummary() {
  try {
    const channelId = await dbOps.getConfig('postChannel');
    if (!channelId) {
      logger.info(
        'Kein Zielkanal konfiguriert (config.postChannel). Überspringe wöchentlichen Post.'
      );
      return;
    }
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      logger.warn('Zielkanal nicht erreichbar. Überspringe Post.');
      return;
    }
    const events = await dbOps.getAllEvents();
    const message = await createWeeklySummaryMessage(events);
    await channel.send({ content: message, flags: 4096 }); // SuppressEmbeds: verhindert Discord-Event-Anhänge
    // Nach dem Post löschen (Reset für nächste Woche)
    await dbOps.clearTopics();
    await dbOps.clearEvents();
    logger.info('Wöchentliche Zusammenfassung gepostet und Daten gelöscht.');
  } catch (err) {
    logger.error('Fehler beim Posten der Wochenübersicht:', err);
  }
}

// Erstellt die Wochenübersicht-Nachricht
async function createWeeklySummaryMessage(events) {
  // Sortiere Events nach Datum
  events.sort((a, b) => new Date(a.date_text) - new Date(b.date_text));
  const { nextMonday, nextSunday } = getNextWeekRange();
  const mondayDay = nextMonday.getDate().toString().padStart(2, '0');
  const sundayDay = nextSunday.getDate().toString().padStart(2, '0');
  const mondayMonth = (nextMonday.getMonth() + 1).toString().padStart(2, '0');
  const sundayMonth = (nextSunday.getMonth() + 1).toString().padStart(2, '0');
  const year = nextMonday.getFullYear();
  let message = `# 🗓 Wochenübersicht (${mondayDay}.${mondayMonth}.–${sundayDay}.${sundayMonth}.${year})\n\n`;
  if (events.length) {
    message += '## 📅 Events\n';
    for (const e of events) {
      message += createEventText(e) + '\n';
    }
    message += '\n';
  } else {
    message += '## 📅 _Keine geplanten Events._\n\n';
  }
  message += `\nAlle Events findest du hier: <#1184236432575955055>`;
  return message;
}

// Wochenübersicht Handler (für Testzwecke)
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
  await syncDiscordEventsToDb(interaction.guild, dbOps);
    const events = await dbOps.getAllEvents();
    const message = await createWeeklySummaryMessage(events);
    await channel.send({ content: message });
    await interaction.reply({ content: 'Test-Wochenübersicht gesendet.', ephemeral: true });
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
      await handleAdminInteraction(interaction, name);
      return;
    }

    // Eventmanagement darf hinzufügen/löschen
    const eventCommands = ['thema', 'themen', 'event', 'events'];
    if (eventCommands.includes(name) && canManageEvents(member)) {
      await handleEventManagerInteraction(interaction, name);
      return;
    }

    // Normale User dürfen nichts
    await handleUnauthorizedInteraction(interaction);
  } catch (err) {
    const errorMsg = handleError(err, 'Dispatcher');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
});

// Handler für Admin-Interaktionen
async function handleAdminInteraction(interaction, name) {
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
}

// Handler für Eventmanager-Interaktionen
async function handleEventManagerInteraction(interaction, name) {
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
}

// Handler für nicht autorisierte Interaktionen
async function handleUnauthorizedInteraction(interaction) {
  await interaction.reply({
    content: 'Du hast keine Berechtigung für diesen Command.',
    ephemeral: true,
  });
}

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

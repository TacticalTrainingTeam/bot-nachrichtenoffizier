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

/**
 * Posts weekly summary to configured channel
 * Fetches events from DB, generates message, posts it, then clears data
 * Runs automatically via cron schedule
 */
async function postWeeklySummary() {
  try {
    const channelId = await dbOps.getConfig('postChannel');
    if (!channelId) {
      logger.info('No target channel configured. Skipping weekly post.');
      return;
    }
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      logger.warn('Target channel unreachable. Skipping post.');
      return;
    }
    const events = await dbOps.getAllEvents();
    const message = await createWeeklySummaryMessage(events);
    await channel.send({ content: message, flags: 4096 }); // SuppressEmbeds flag
    await dbOps.clearTopics();
    await dbOps.clearEvents();
    logger.info('Weekly summary posted and data cleared.');
  } catch (err) {
    logger.error('Error posting weekly summary:', err);
  }
}

async function createWeeklySummaryMessage(events) {
  const { nextMonday, nextSunday } = getNextWeekRange();
  const mondayDay = nextMonday.getDate().toString().padStart(2, '0');
  const sundayDay = nextSunday.getDate().toString().padStart(2, '0');
  const mondayMonth = (nextMonday.getMonth() + 1).toString().padStart(2, '0');
  const sundayMonth = (nextSunday.getMonth() + 1).toString().padStart(2, '0');
  const year = nextMonday.getFullYear();
  let message = `# 🗓 Wochenübersicht (${mondayDay}.${mondayMonth}.–${sundayDay}.${sundayMonth}.${year})\n\n`;
  const eventsWithDate = events
    .filter((e) => e.date_text && !e.added_by)
    .sort((a, b) => new Date(a.date_text) - new Date(b.date_text));
  const eventsWithoutDate = events
    .filter((e) => e.added_by)
    .sort((a, b) => a.title.localeCompare(b.title));
  const topics = await dbOps.getAllTopics();
  if (eventsWithDate.length) {
    message += '## 📅 Events\n';
    for (const e of eventsWithDate) {
      message += createEventText(e) + '\n';
    }
    message += '\n';
  } else {
    message += '## 📅 _Keine geplanten Events._\n\n';
  }
  if (eventsWithoutDate.length || topics.length) {
    message += '## Weiteres\n';
    for (const e of eventsWithoutDate) {
      message += createEventText(e) + ' (' + e.added_by + ')\n';
    }
    for (const t of topics) {
      message += ` - ${t.text} (${t.user})\n`;
    }
    message += '\n';
  } else {
    message += '## Weiteres\n_Keine spontanen Events oder Themen eingereicht._\n\n';
  }
  message += `\nAlle Arma-Events findest du hier: <#1184236432575955055>\n||<@&1435610059865325619>||`;
  return message;
}

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

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const name = interaction.commandName;
  try {
    const member = interaction.member;
    if (isAdmin(member)) {
      await handleAuthorizedInteraction(interaction, name);
      return;
    }

    const eventCommands = ['thema', 'event', 'aufräumen'];
    if (eventCommands.includes(name) && canManageEvents(member)) {
      await handleAuthorizedInteraction(interaction, name);
      return;
    }

    await handleUnauthorizedInteraction(interaction);
  } catch (err) {
    const errorMsg = handleError(err, 'Dispatcher');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
});

async function handleAuthorizedInteraction(interaction, name) {
  if (name === 'wochenüberblick') {
    await handleWochenuebersicht(interaction);
    return;
  }
  const handler = commandRouter[name];
  if (handler) {
    if (name === 'aufräumen') {
      await handler(interaction, dbOps, syncDiscordEventsToDb);
    } else {
      await handler(interaction, dbOps);
    }
  } else {
    await interaction.reply({ content: 'Unbekannter Command.', ephemeral: true });
  }
}

async function handleUnauthorizedInteraction(interaction) {
  await interaction.reply({
    content: 'Du hast keine Berechtigung für diesen Command.',
    ephemeral: true,
  });
}

client.login(token);

if (defaultPostCron) {
  cron.schedule(defaultPostCron, postWeeklySummary, {
    timezone: timezone,
  });
  logger.info(`Wöchentlicher Post-Cron gestartet: ${defaultPostCron}`);
} else {
  logger.warn('Kein POST_CRON gesetzt. Wöchentlicher Post deaktiviert.');
}

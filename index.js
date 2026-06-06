import { getNextWeekRange, parseGermanDateTime } from './utils/dateUtils.js';
import { createEventText } from './utils/eventUtils.js';
import { syncDiscordEventsToDb } from './utils/discordSync.js';

import 'dotenv/config';
import cron from 'node-cron';
import { migrate } from './db/db.js';
import dbOps from './db/operations.js';
import commandRouter from './commandRouter.js';
import { isAdmin, canManageEvents } from './utils/permissions.js';
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
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

function buildStreamMessagePayload(streamers, messageId, channelId) {
  const components = [];

  if (streamers.length > 0) {
    for (let i = 0; i < streamers.length && components.length < 4; i += 5) {
      const row = new ActionRowBuilder();
      for (const s of streamers.slice(i, i + 5)) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`stream_remove_${messageId}_${s.user_id}`)
            .setLabel(`✕ ${s.user_name}`)
            .setStyle(ButtonStyle.Danger)
        );
      }
      components.push(row);
    }
  }

  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`stream_register_${channelId}`)
        .setLabel('Ich will streamen')
        .setStyle(ButtonStyle.Primary)
    )
  );

  const streamerList = streamers
    .map((s) =>
      s.stream_location === 'Stream Privat' && s.stream_url
        ? `**${s.user_name}** - [Stream Privat](${s.stream_url})`
        : `**${s.user_name}** - ${s.stream_location}`
    )
    .join('\n');

  return {
    content: `**Streamer für dieses Event**\n\n${streamerList || '_Noch keine Streamer registriert._'}`,
    components,
  };
}

async function restoreStreamerMessages() {
  try {
    for (const row of dbOps.getAllStreamMessages()) {
      try {
        const channel = await client.channels.fetch(row.channel_id).catch(() => null);
        if (!channel) continue;
        const message = await channel.messages.fetch(row.message_id).catch(() => null);
        if (!message) continue;
        const streamers = dbOps.getStreamersByMessageId(row.message_id);
        await message.edit(buildStreamMessagePayload(streamers, row.message_id, row.channel_id));
        logger.info(`Streamer message restored: ${row.message_id}`);
      } catch (err) {
        logger.warn(`Could not restore streamer message ${row.message_id}:`, err.message);
      }
    }
  } catch (err) {
    logger.error('Error restoring streamer messages:', err);
  }
}

async function updateStreamerMessage(messageId, channelId, interaction) {
  const message = await interaction.channel.messages.fetch(messageId);
  if (!message) return;
  const streamers = dbOps.getStreamersByMessageId(messageId);
  await message.edit(buildStreamMessagePayload(streamers, messageId, channelId));
}

async function postWeeklySummary() {
  try {
    const guild = client.guilds.cache.first();
    if (guild) {
      await syncDiscordEventsToDb(guild, dbOps);
    } else {
      logger.warn('No guild found for event sync.');
    }
    const channelId = dbOps.getConfig('postChannel');
    if (!channelId) {
      logger.info('No target channel configured. Skipping weekly post.');
      return;
    }
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      logger.warn('Target channel unreachable. Skipping post.');
      return;
    }
    const events = dbOps.getAllEvents();
    const topics = dbOps.getAllTopics();
    const message = createWeeklySummaryMessage(events, topics);
    await channel.send({ content: message, flags: 4096 });
    dbOps.clearTopics();
    dbOps.clearEvents();
    logger.info('Weekly summary posted and data cleared.');
  } catch (err) {
    logger.error('Error posting weekly summary:', err);
  }
}

function createWeeklySummaryMessage(events, topics) {
  const { nextMonday, nextSunday } = getNextWeekRange();
  const mondayDay = nextMonday.getDate().toString().padStart(2, '0');
  const sundayDay = nextSunday.getDate().toString().padStart(2, '0');
  const mondayMonth = (nextMonday.getMonth() + 1).toString().padStart(2, '0');
  const sundayMonth = (nextSunday.getMonth() + 1).toString().padStart(2, '0');
  const year = nextMonday.getFullYear();
  let message = `# Wochenübersicht (${mondayDay}.${mondayMonth}.–${sundayDay}.${sundayMonth}.${year})\n\n`;
  const eventsWithDate = events
    .filter((e) => e.date_text)
    .sort((a, b) => {
      const dateA = parseGermanDateTime(a.date_text);
      const dateB = parseGermanDateTime(b.date_text);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
  const eventsWithoutDate = events
    .filter((e) => !e.date_text && e.added_by)
    .sort((a, b) => a.title.localeCompare(b.title));
  if (eventsWithDate.length) {
    message += '## Events\n';
    for (const e of eventsWithDate) {
      message += createEventText(e) + '\n';
    }
    message += '\n';
  } else {
    message += '## _Keine geplanten Events._\n\n';
  }
  if (eventsWithoutDate.length || topics.length) {
    message += '## Sonstiges\n';
    for (const e of eventsWithoutDate) {
      message += createEventText(e) + ' (' + e.added_by + ')\n';
    }
    for (const t of topics) {
      message += ` - ${t.text} (${t.user})\n`;
    }
    message += '\n';
  }
  message += `\nAlle Arma-Events findest du hier: <#1184236432575955055>\n||<@&1435610059865325619>||`;
  return message;
}

client.on('ready', async () => {
  logger.info(`Bot logged in as ${client.user.tag}`);
  await restoreStreamerMessages();
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
  } catch (err) {
    logger.error('Error handling interaction:', err);
    await interaction
      .reply({ content: 'Ein Fehler ist aufgetreten.', ephemeral: true })
      .catch(() => {});
  }
});

async function handleCommand(interaction) {
  const { commandName: name, member } = interaction;

  const isPublic = ['stream'].includes(name);
  const isEventCmd = ['thema', 'event', 'aufräumen'].includes(name);

  if (!isPublic && !isAdmin(member) && !(isEventCmd && canManageEvents(member))) {
    await interaction.reply({
      content: 'Du hast keine Berechtigung für diesen Command.',
      ephemeral: true,
    });
    return;
  }

  const handler = commandRouter[name];
  if (handler) {
    await handler(interaction, {
      dbOps,
      client,
      syncDiscordEventsToDb,
      createWeeklySummaryMessage,
    });
  } else {
    await interaction.reply({ content: 'Unbekannter Command.', ephemeral: true });
  }
}

async function handleButton(interaction) {
  if (interaction.customId.startsWith('stream_remove_')) {
    const parts = interaction.customId.split('_');
    const messageId = parts[2];
    const userId = parts[3];
    dbOps.deleteStreamerByUserAndMessage(messageId, userId);
    await updateStreamerMessage(messageId, interaction.channelId, interaction);
    await interaction.reply({ content: 'Du wurdest abgemeldet!', ephemeral: true });
  } else if (interaction.customId.startsWith('stream_register_')) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`stream_location_${interaction.message.id}`)
      .setPlaceholder('Wähle Stream-Ort...')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Stream Privat-Kanäle').setValue('privat'),
        new StringSelectMenuOptionBuilder().setLabel('Stream TTT-Kanäle').setValue('ttt')
      );
    await interaction.reply({
      content: 'Wähle deinen Stream-Ort:',
      components: [new ActionRowBuilder().addComponents(selectMenu)],
      ephemeral: true,
    });
  }
}

async function handleSelectMenu(interaction) {
  if (!interaction.customId.startsWith('stream_location_')) return;

  const messageId = interaction.customId.replace('stream_location_', '');
  const streamers = dbOps.getStreamersByMessageId(messageId);
  const existingStreamer = streamers.find((s) => s.user_id === interaction.user.id);
  if (existingStreamer) {
    await interaction.reply({
      content: `Du bist bereits registriert als: **${existingStreamer.user_name}** - ${existingStreamer.stream_location}`,
      ephemeral: true,
    });
    return;
  }

  const streamLocation = interaction.values[0];

  if (streamLocation === 'ttt') {
    dbOps.insertStreamer(
      messageId,
      interaction.channelId,
      interaction.user.id,
      interaction.user.username,
      'Stream TTT',
      null
    );
    await updateStreamerMessage(messageId, interaction.channelId, interaction);
    await interaction.reply({
      content: `Du bist registriert als:\n**${interaction.user.username}** - Stream TTT`,
      ephemeral: true,
    });
  } else {
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(`stream_modal_${messageId}_${streamLocation}`)
        .setTitle('Stream-URL')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('stream_url')
              .setLabel('Stream-URL (z.B. https://twitch.tv/...)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(500)
          )
        )
    );
  }
}

async function handleModal(interaction) {
  if (!interaction.customId.startsWith('stream_modal_')) return;

  const messageId = interaction.customId.split('_')[2];
  const streamUrl = interaction.fields.getTextInputValue('stream_url');

  dbOps.insertStreamer(
    messageId,
    interaction.channelId,
    interaction.user.id,
    interaction.user.username,
    'Stream Privat',
    streamUrl
  );
  await updateStreamerMessage(messageId, interaction.channelId, interaction);
  await interaction.reply({
    content: `Danke für deine Anmeldung! Du bist registriert als:\n**${interaction.user.username}** - [Stream Privat](${streamUrl})`,
    ephemeral: true,
  });
}

client.login(token);

if (defaultPostCron) {
  cron.schedule(defaultPostCron, postWeeklySummary, { timezone });
  logger.info(`Wöchentlicher Post-Cron gestartet: ${defaultPostCron}`);
} else {
  logger.warn('Kein POST_CRON gesetzt. Wöchentlicher Post deaktiviert.');
}

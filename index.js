import 'dotenv/config';
import cron from 'node-cron';
import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { migrate } from './db/db.js';
import dbOps from './db/operations.js';
import commandRouter from './commandRouter.js';
import logger from './utils/logger.js';
import { isAdmin, canManageEvents } from './utils/permissions.js';
import { syncDiscordEventsToDb } from './utils/discordSync.js';
import { createWeeklySummaryMessage } from './utils/eventUtils.js';
import { CHANNELS } from './discordIds.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const timezone = process.env.TIMEZONE || 'Europe/Berlin';
const postCron = process.env.POST_CRON;

if (!token || !clientId) {
  logger.error('Bitte DISCORD_TOKEN und CLIENT_ID in .env setzen.');
  process.exit(1);
}

// All date handling (weekly range, event times, cron) uses this timezone
process.env.TZ = timezone;

const PUBLIC_COMMANDS = new Set(['stream']);
const EVENT_COMMANDS = new Set(['thema', 'event', 'aufräumen']);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

migrate();

function buildStreamMessagePayload(streamers, messageId, channelId) {
  const components = [];
  for (let i = 0; i < streamers.length && components.length < 4; i += 5) {
    const buttons = streamers
      .slice(i, i + 5)
      .map((s) =>
        new ButtonBuilder()
          .setCustomId(`stream_remove_${messageId}_${s.user_id}`)
          .setLabel(`✕ ${s.user_name}`)
          .setStyle(ButtonStyle.Danger)
      );
    components.push(new ActionRowBuilder().addComponents(buttons));
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
        ? `<@${s.user_id}> - [Stream Privat](<${s.stream_url}>)`
        : `<@${s.user_id}> - ${s.stream_location}`
    )
    .join('\n');

  return {
    content: `**Streamer für dieses Event**\n\n${streamerList || '_Noch keine Streamer registriert._'}`,
    components,
  };
}

async function updateStreamerMessage(message) {
  const streamers = dbOps.getStreamersByMessageId(message.id);
  await message.edit(buildStreamMessagePayload(streamers, message.id, message.channelId));
}

async function postWeeklySummary() {
  try {
    const guild = client.guilds.cache.first();
    if (guild) {
      await syncDiscordEventsToDb(guild);
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
    const message = createWeeklySummaryMessage(dbOps.getAllEvents(), dbOps.getAllTopics());
    await channel.send({ content: message, flags: MessageFlags.SuppressNotifications });
    dbOps.clearTopics();
    dbOps.clearEvents();
    logger.info('Weekly summary posted and data cleared.');
  } catch (err) {
    logger.error('Error posting weekly summary:', err);
  }
}

async function handleCommand(interaction) {
  const { commandName: name, member } = interaction;
  const allowed =
    PUBLIC_COMMANDS.has(name) ||
    isAdmin(member) ||
    (EVENT_COMMANDS.has(name) && canManageEvents(member));
  if (!allowed) {
    await interaction.reply({
      content: 'Du hast keine Berechtigung für diesen Command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const handler = commandRouter[name];
  if (!handler) {
    await interaction.reply({ content: 'Unbekannter Command.', flags: MessageFlags.Ephemeral });
    return;
  }
  await handler(interaction);
}

async function handleButton(interaction) {
  const { customId } = interaction;
  if (customId.startsWith('stream_remove_')) {
    const [, , messageId, userId] = customId.split('_');
    const streamer = dbOps.getStreamersByMessageId(messageId).find((s) => s.user_id === userId);
    dbOps.deleteStreamerByUserAndMessage(messageId, userId);
    await updateStreamerMessage(interaction.message);
    await interaction.reply({
      content: `<@${userId}> wurde abgemeldet.`,
      flags: MessageFlags.Ephemeral,
    });
    if (streamer?.stream_location === 'Stream TTT') {
      await notifyTttStream(interaction, userId, streamer.user_name, 'vom TTT-Stream abgemeldet');
    }
  } else if (customId.startsWith('stream_register_')) {
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
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function registerStreamer(interaction, messageId, location, url = null) {
  dbOps.insertStreamer(
    messageId,
    interaction.channelId,
    interaction.user.id,
    interaction.user.username,
    location,
    url
  );
  const message = await interaction.channel.messages.fetch(messageId);
  await updateStreamerMessage(message);
}

async function notifyTttStream(interaction, userId, fallbackName, action) {
  if (!CHANNELS.STREAM_NOTIFY) return;
  const channel = await client.channels.fetch(CHANNELS.STREAM_NOTIFY).catch(() => null);
  if (!channel) {
    logger.warn('Stream notify channel unreachable.');
    return;
  }
  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  const name = member?.displayName ?? fallbackName;
  await channel.send(`**${name}** hat sich ${action} (<#${interaction.channelId}>)`);
}

async function handleSelectMenu(interaction) {
  if (!interaction.customId.startsWith('stream_location_')) return;

  const messageId = interaction.customId.replace('stream_location_', '');
  const existing = dbOps
    .getStreamersByMessageId(messageId)
    .find((s) => s.user_id === interaction.user.id);
  if (existing) {
    await interaction.reply({
      content: `Du bist bereits registriert als: <@${existing.user_id}> - ${existing.stream_location}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.values[0] === 'ttt') {
    await registerStreamer(interaction, messageId, 'Stream TTT');
    await interaction.reply({
      content: `Du bist registriert als:\n**${interaction.user.username}** - Stream TTT`,
      flags: MessageFlags.Ephemeral,
    });
    await notifyTttStream(
      interaction,
      interaction.user.id,
      interaction.user.username,
      'für TTT-Stream angemeldet'
    );
    return;
  }

  await interaction.showModal(
    new ModalBuilder()
      .setCustomId(`stream_modal_${messageId}`)
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

async function handleModal(interaction) {
  if (!interaction.customId.startsWith('stream_modal_')) return;

  const messageId = interaction.customId.replace('stream_modal_', '');
  const streamUrl = interaction.fields.getTextInputValue('stream_url');
  await registerStreamer(interaction, messageId, 'Stream Privat', streamUrl);
  await interaction.reply({
    content: `Danke für deine Anmeldung! Du bist registriert als:\n<@${interaction.user.id}> - [Stream Privat](<${streamUrl}>)`,
    flags: MessageFlags.Ephemeral,
  });
}

client.once(Events.ClientReady, () => logger.info(`Bot logged in as ${client.user.tag}`));

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) await handleCommand(interaction);
    else if (interaction.isButton()) await handleButton(interaction);
    else if (interaction.isStringSelectMenu()) await handleSelectMenu(interaction);
    else if (interaction.isModalSubmit()) await handleModal(interaction);
  } catch (err) {
    logger.error('Error handling interaction:', err);
    await interaction
      .reply({ content: 'Ein Fehler ist aufgetreten.', flags: MessageFlags.Ephemeral })
      .catch(() => {});
  }
});

client.login(token);

if (postCron) {
  cron.schedule(postCron, postWeeklySummary, { timezone });
  logger.info(`Wöchentlicher Post-Cron gestartet: ${postCron}`);
} else {
  logger.warn('Kein POST_CRON gesetzt. Wöchentlicher Post deaktiviert.');
}

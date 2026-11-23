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
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { migrate, db } from './db/db.js';
import dbOps from './db/operations.js';
import commandRouter from './commandRouter.js';
import logger from './utils/logger.js';
import { isAdmin, canManageEvents } from './utils/permissions.js';
import { sendWeeklySummary } from './utils/weeklyPost.js';
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
    await sendWeeklySummary(client, channel, { clearAfter: true });
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
    await interaction.deferUpdate();
    const [, , messageId, userId] = customId.split('_');
    const streamer = dbOps.getStreamersByMessageId(messageId).find((s) => s.user_id === userId);
    dbOps.deleteStreamerByUserAndMessage(messageId, userId);
    await updateStreamerMessage(interaction.message);
    await interaction.followUp({
      content: `<@${userId}> wurde abgemeldet.`,
      flags: MessageFlags.Ephemeral,
    });
    if (streamer?.stream_location === 'Stream TTT') {
      await notifyTttStream(interaction, userId, streamer.user_name, 'vom TTT-Stream abgemeldet');
    }
  } else if (customId.startsWith('stream_register_')) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`stream_location_${interaction.message.id}`)
      .setPlaceholder('Wähle Stream-Ort...')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Stream Privat-Kanäle').setValue('privat'),
        new StringSelectMenuOptionBuilder().setLabel('Stream TTT-Kanäle').setValue('ttt')
      );
    await interaction.editReply({
      content: 'Wähle deinen Stream-Ort:',
      components: [new ActionRowBuilder().addComponents(selectMenu)],
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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await registerStreamer(interaction, messageId, 'Stream TTT');
    await interaction.editReply({
      content: `Du bist registriert als:\n**${interaction.user.username}** - Stream TTT`,
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
        new LabelBuilder()
          .setLabel('Stream-URL (z.B. https://twitch.tv/...)')
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId('stream_url')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(500)
          )
      )
  );
}

async function handleModal(interaction) {
  if (!interaction.customId.startsWith('stream_modal_')) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const messageId = interaction.customId.replace('stream_modal_', '');
  const streamUrl = interaction.fields.getTextInputValue('stream_url').trim();
  if (!/^https?:\/\/\S+$/i.test(streamUrl)) {
    await interaction.editReply({
      content:
        'Ungültige URL. Bitte eine gültige Stream-URL angeben (z. B. https://twitch.tv/...).',
    });
    return;
  }
  await registerStreamer(interaction, messageId, 'Stream Privat', streamUrl);
  await interaction.editReply({
    content: `Danke für deine Anmeldung! Du bist registriert als:\n<@${interaction.user.id}> - [Stream Privat](<${streamUrl}>)`,
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
    const payload = { content: 'Ein Fehler ist aufgetreten.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(token).catch((err) => {
  logger.error('Discord-Login fehlgeschlagen:', err);
  process.exit(1);
});

const postTask = postCron ? cron.schedule(postCron, postWeeklySummary, { timezone }) : null;
if (postTask) {
  logger.info(`Wöchentlicher Post-Cron gestartet: ${postCron}`);
} else {
  logger.warn('Kein POST_CRON gesetzt. Wöchentlicher Post deaktiviert.');
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully...`);
  try {
    await postTask?.stop();
    await client.destroy();
    db.close();
  } catch {
    // best effort during shutdown
  }
  process.exit(0);
}
process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch(() => process.exit(1));
});
process.on('SIGINT', () => {
  shutdown('SIGINT').catch(() => process.exit(1));
});

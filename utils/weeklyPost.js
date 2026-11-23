import { MessageFlags } from 'discord.js';
import dbOps from '../db/operations.js';
import { syncDiscordEventsToDb } from './discordSync.js';
import { createWeeklySummaryMessage } from './eventUtils.js';
import logger from './logger.js';

async function sendWeeklySummary(client, channel, { clearAfter = false } = {}) {
  const guild = client.guilds.cache.first();
  if (guild) {
    await syncDiscordEventsToDb(guild);
  } else {
    logger.warn('No guild found for event sync.');
  }
  const message = createWeeklySummaryMessage(dbOps.getAllEvents(), dbOps.getAllTopics());
  await channel.send({ content: message, flags: MessageFlags.SuppressNotifications });
  if (clearAfter) {
    dbOps.clearTopics();
    dbOps.clearEvents();
    logger.info('Weekly summary posted and data cleared.');
  }
}

export { sendWeeklySummary };

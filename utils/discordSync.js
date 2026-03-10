import { getNextWeekRange } from './dateUtils.js';

const timezone = process.env.TIMEZONE || 'Europe/Berlin';

/**
 * Syncs Discord scheduled events for the upcoming week to database
 * Clears existing events and fetches new ones from guild
 * Only includes events scheduled between next Monday 00:00 and Sunday 23:59
 * @param {Guild} guild - Discord guild object
 * @param {Object} dbOps - Database operations object
 */
async function syncDiscordEventsToDb(guild, dbOps) {
  if (!guild?.scheduledEvents) return;
  await dbOps.clearEvents();
  const { nextMonday, nextSunday } = getNextWeekRange();
  const events = await guild.scheduledEvents.fetch();
  for (const event of events.values()) {
    const start = event.scheduledStartAt || event.scheduledStartTimestamp;
    if (!start) continue;
    const startDate = new Date(start);
    const startLocal = new Date(startDate.toLocaleString('en-US', { timeZone: timezone }));
    if (startLocal >= nextMonday && startLocal <= nextSunday) {
      const localTime = startDate.toLocaleString('de-DE', { timeZone: timezone });
      await dbOps.insertEvent(
        event.name,
        localTime,
        null,
        event.description || '',
        event.location || '',
        event.id
      );
    }
  }
}

export { syncDiscordEventsToDb };

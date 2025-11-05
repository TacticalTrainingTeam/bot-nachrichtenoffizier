import { getNextWeekRange } from './dateUtils.js';

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
    // Convert to Berlin timezone for comparison
    const startBerlin = new Date(startDate.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    if (startBerlin >= nextMonday && startBerlin <= nextSunday) {
      const berlinTime = startDate.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
      await dbOps.insertEvent(
        event.name,
        berlinTime,
        'Discord-Event',
        event.description || '',
        event.location || '',
        event.id
      );
    }
  }
}

export { syncDiscordEventsToDb };

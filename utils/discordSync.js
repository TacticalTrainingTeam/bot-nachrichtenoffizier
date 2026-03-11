import { getNextWeekRange } from './dateUtils.js';

const timezone = process.env.TIMEZONE || 'Europe/Berlin';

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

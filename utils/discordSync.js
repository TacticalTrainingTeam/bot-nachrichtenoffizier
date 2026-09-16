import dbOps from '../db/operations.js';
import { getNextWeekRange } from './dateUtils.js';

async function syncDiscordEventsToDb(guild) {
  if (!guild?.scheduledEvents) return;
  dbOps.clearSyncedEvents();
  const { nextMonday, nextSunday } = getNextWeekRange();
  const events = await guild.scheduledEvents.fetch();
  for (const event of events.values()) {
    const start = event.scheduledStartAt;
    if (!start || start < nextMonday || start > nextSunday) continue;
    dbOps.insertEvent(
      event.name,
      start.toLocaleString('de-DE'),
      null,
      event.description,
      event.location,
      event.id
    );
  }
}

export { syncDiscordEventsToDb };

import { getNextWeekRange } from './dateUtils.js';

// Synchronisiert Discord-Events der kommenden Woche mit der Datenbank
async function syncDiscordEventsToDb(guild, dbOps) {
  if (!guild?.scheduledEvents) return;
  await dbOps.clearEvents();
  // Berechne nächste Woche (Montag bis Sonntag)
  const { nextMonday, nextSunday } = getNextWeekRange();
  const events = await guild.scheduledEvents.fetch();
  for (const event of events.values()) {
    const start = event.scheduledStartAt || event.scheduledStartTimestamp;
    if (!start) continue;
    const startDate = new Date(start);
    const startBerlin = new Date(startDate.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    if (startBerlin >= nextMonday && startBerlin <= nextSunday) {
      const berlinTime = startDate.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
      await dbOps.insertEvent(
        event.name,
        event.description || '',
        event.location || '',
        berlinTime,
        'Discord-Event',
        event.id
      );
    }
  }
}

export { syncDiscordEventsToDb };

import {
  getNextWeekRange,
  parseGermanDateTime,
  formatDayMonth,
  formatEventDate,
} from './dateUtils.js';

const EVENTS_CHANNEL_ID = '1184236432575955055';
const PING_ROLE_ID = '1435610059865325619';

// Order matters: tacticalteam links are preferred over slotbot links
const LINK_PATTERNS = [
  /https:\/\/events\.tacticalteam\.de\/events\/[\w-]+/,
  /https:\/\/slotbot\.de\/events\/[\w-]+/,
];

function findEventLink(e) {
  const fields = [e.title, e.description, e.location].filter(Boolean);
  for (const pattern of LINK_PATTERNS) {
    for (const field of fields) {
      const match = pattern.exec(field);
      if (match) return match[0];
    }
  }
  return null;
}

function createEventText(e) {
  const link = findEventLink(e);
  const title = link ? `[${e.title}](${link})` : e.title;
  if (!e.date_text) return ` - ${title}`;
  const date = parseGermanDateTime(e.date_text);
  return `${date ? formatEventDate(date) : e.date_text} - ${title}`;
}

const sortKey = (e) => parseGermanDateTime(e.date_text)?.getTime() ?? Number.MAX_SAFE_INTEGER;

function createWeeklySummaryMessage(events, topics) {
  const { nextMonday, nextSunday } = getNextWeekRange();
  const withDate = events.filter((e) => e.date_text).sort((a, b) => sortKey(a) - sortKey(b));
  const withoutDate = events
    .filter((e) => !e.date_text && e.added_by)
    .sort((a, b) => a.title.localeCompare(b.title));

  let message = `# Wochenübersicht (${formatDayMonth(nextMonday)}–${formatDayMonth(nextSunday)}${nextMonday.getFullYear()})\n\n`;

  if (withDate.length) {
    message += '## Events\n' + withDate.map((e) => createEventText(e) + '\n').join('') + '\n';
  } else {
    message += '## _Keine geplanten Events._\n\n';
  }

  if (withoutDate.length || topics.length) {
    message += '## Sonstiges\n';
    message += withoutDate.map((e) => `${createEventText(e)} (${e.added_by})\n`).join('');
    message += topics.map((t) => ` - ${t.text} (${t.user})\n`).join('');
    message += '\n';
  }

  message += `\nAlle Arma-Events findest du hier: <#${EVENTS_CHANNEL_ID}>\n||<@&${PING_ROLE_ID}>||`;
  return message;
}

export { createEventText, createWeeklySummaryMessage };

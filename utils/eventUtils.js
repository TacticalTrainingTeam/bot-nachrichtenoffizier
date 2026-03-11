import { getWeekdayAbbrev } from './dateUtils.js';

function createEventText(e) {
  const linkRegex = /(https:\/\/events\.tacticalteam\.de\/events\/[\w-]+)/;
  const eventLink = [e.title, e.description, e.location]
    .find((field) => field && linkRegex.test(field))
    ?.match(linkRegex)?.[1];

  const eventText = eventLink ? `[${e.title}](${eventLink})` : e.title;

  if (!e.date_text) return ` - ${eventText}`;

  const weekday = getWeekdayAbbrev(e.date_text);
  // Parse and format: D.M.YYYY, H:MM[:SS] -> DD.MM. HH:MM (no year/seconds)
  const match = /(\.\d{1,2})\.(\d{1,2})\.\d{4}, (\d{1,2}):(\d{2})(?::\d{2})?/.exec(e.date_text);
  if (!match) return `**${weekday}** ${e.date_text} - ${eventText}`;

  const [day, month, hour, minute] = [match[1], match[2], match[3], match[4]].map((s) =>
    s.padStart(2, '0')
  );
  const dateText = `${day}.${month}. ${hour}:${minute}`;
  return `**${weekday}** ${dateText} - ${eventText}`;
}

export { createEventText };

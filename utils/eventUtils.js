// utils/eventUtils.js
import { getWeekdayAbbrev } from './dateUtils.js';

function createEventText(e) {
  const linkRegex = /(https:\/\/events\.tacticalteam\.de\/events\/[\w-]+)/;
  let eventLink = '';
  if (e.title && linkRegex.test(e.title)) eventLink = e.title.match(linkRegex)[1];
  else if (e.description && linkRegex.test(e.description))
    eventLink = e.description.match(linkRegex)[1];
  else if (e.location && linkRegex.test(e.location)) eventLink = e.location.match(linkRegex)[1];

  let eventText = eventLink ? `[${e.title}](${eventLink})` : e.title;

  if (!e.date_text) {
    return ` - ${eventText}`; // Fallback für Events ohne Datum
  }

  const weekday = getWeekdayAbbrev(e.date_text);
  const dateText = e.date_text.replace(/, (\d{2}:\d{2}):\d{2}/, ' $1');
  return `${weekday} ${dateText} - ${eventText}`;
}

export { createEventText };

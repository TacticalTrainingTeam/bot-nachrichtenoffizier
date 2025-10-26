// utils/eventUtils.js

function getWeekdayAbbrev(dateText) {
  if (!dateText) return '';
  const date = new Date(dateText);
  const weekdays = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
  return weekdays[date.getDay()];
}

function createEventText(e) {
  const linkRegex = /(https:\/\/events\.tacticalteam\.de\/events\/[\w-]+)/;
  let eventLink = '';
  if (e.title && linkRegex.test(e.title)) eventLink = e.title.match(linkRegex)[1];
  else if (e.description && linkRegex.test(e.description))
    eventLink = e.description.match(linkRegex)[1];
  else if (e.location && linkRegex.test(e.location)) eventLink = e.location.match(linkRegex)[1];

  let eventText = eventLink ? `[${e.title}](${eventLink})` : `**${e.title}**`;

  let dateText = e.date_text;
  if (dateText) {
    dateText = dateText.replace(/(\d{2}:\d{2}):\d{2}/, '$1');
  }
  const weekday = getWeekdayAbbrev(e.date_text);
  return `• ${weekday} ${eventText}${dateText ? ' — ' + dateText : ''}`;
}

export { createEventText };

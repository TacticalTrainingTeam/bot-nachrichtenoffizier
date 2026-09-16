const WEEKDAYS = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
const pad = (n) => String(n).padStart(2, '0');

function getNextWeekRange() {
  const now = new Date();
  const daysToNextMonday = (8 - now.getDay()) % 7 || 7;
  const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToNextMonday);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);
  return { nextMonday, nextSunday };
}

// Parses "D.M.YYYY, H:MM[:SS]" as produced by toLocaleString('de-DE')
function parseGermanDateTime(dateText) {
  const match = /(\d{1,2})\.(\d{1,2})\.(\d{4}), (\d{1,2}):(\d{2})/.exec(dateText ?? '');
  if (!match) return null;
  const [, day, month, year, hour, minute] = match.map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

const formatDayMonth = (date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.`;

const formatEventDate = (date) =>
  `**${WEEKDAYS[date.getDay()]}** ${formatDayMonth(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

export { getNextWeekRange, parseGermanDateTime, formatDayMonth, formatEventDate };

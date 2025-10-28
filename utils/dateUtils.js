// utils/dateUtils.js

function getNextWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToNextMonday = (8 - dayOfWeek) % 7 || 7;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysToNextMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);
  return { nextMonday, nextSunday };
}


// Wandelt einen deutschen Datumsstring wie "28.10.2025, 19:30:00" in ein Date-Objekt um
function parseGermanDateTime(dateText) {
  if (!dateText) return null;
  // Format: DD.MM.YYYY, HH:MM[:SS]
  const match = dateText.match(/(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  // JS Date: YYYY-MM-DDTHH:mm:ss
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`;
  return new Date(iso);
}

function getWeekdayAbbrev(dateText) {
  if (!dateText) return '';
  const date = parseGermanDateTime(dateText);
  if (!date || Number.isNaN(date.getTime())) return '';
  const weekdays = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
  return weekdays[date.getDay()];
}

export { getNextWeekRange, getWeekdayAbbrev };

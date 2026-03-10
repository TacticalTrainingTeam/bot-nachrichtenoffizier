function getNextWeekRange(timezone = process.env.TIMEZONE || 'Europe/Berlin') {
  const now = new Date();
  // Get current day of week in the target timezone
  const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const dayOfWeek = nowLocal.getDay();
  const daysToNextMonday = (8 - dayOfWeek) % 7 || 7;
  const nextMonday = new Date(nowLocal);
  nextMonday.setDate(nowLocal.getDate() + daysToNextMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);
  return { nextMonday, nextSunday };
}

/**
 * Parses German date format "D.M.YYYY, H:MM[:SS]" to Date object
 * Supports both single and double-digit day/month/hour/minute values
 * @param {string} dateText - Date string in German format
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseGermanDateTime(dateText) {
  if (!dateText) return null;
  const match = /(\d{1,2})\.(\d{1,2})\.(\d{4}), (\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(dateText);
  if (!match) return null;
  const [day, month, year, hour, minute, second] = match
    .slice(1)
    .map((s, i) => (i < 5 ? s.padStart(2, '0') : s || '00'));
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
}

function getWeekdayAbbrev(dateText) {
  const date = parseGermanDateTime(dateText);
  if (!date || Number.isNaN(date.getTime())) return '';
  return ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'][date.getDay()];
}

export { getNextWeekRange, getWeekdayAbbrev, parseGermanDateTime };

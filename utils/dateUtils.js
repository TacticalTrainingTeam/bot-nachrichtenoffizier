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

// Parst deutschen Datumsstring "D.M.YYYY, H:MM[:SS]" zu Date (ein-/zweistellig)
function parseGermanDateTime(dateText) {
  if (!dateText) return null;
  const match = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4}), (\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [day, month, year, hour, minute, second] = match.slice(1).map((s, i) => i < 5 ? s.padStart(2, '0') : s || '00');
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
}

function getWeekdayAbbrev(dateText) {
  const date = parseGermanDateTime(dateText);
  if (!date || Number.isNaN(date.getTime())) return '';
  return ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'][date.getDay()];
}

export { getNextWeekRange, getWeekdayAbbrev };

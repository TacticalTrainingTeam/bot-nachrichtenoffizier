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

export { getNextWeekRange };

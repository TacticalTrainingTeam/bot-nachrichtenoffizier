// validate.js
function validateText(text, min = 3, max = 140) {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.length >= min && trimmed.length <= max;
}

function validateDate(dateStr) {
  // Optional: ISO, DD.MM.YYYY, etc. prüfen
  return typeof dateStr === 'string' && dateStr.length > 0;
}

export { validateText, validateDate };

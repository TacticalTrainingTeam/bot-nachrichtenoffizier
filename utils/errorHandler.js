// errorHandler.js
import logger from './logger.js';

function handleError(err, context = '') {
  logger.error(`Fehler${context ? ' (' + context + ')' : ''}:`, err);
  // Hier könnte Logging an ein externes System erfolgen
  return { error: true, message: 'Ein interner Fehler ist aufgetreten.' };
}

export { handleError };

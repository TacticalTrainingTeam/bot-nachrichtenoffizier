import logger from './logger.js';

function handleError(err, context = '') {
  logger.error(`Error${context ? ' (' + context + ')' : ''}:`, err);
  return { error: true, message: 'Ein interner Fehler ist aufgetreten.' };
}

export { handleError };

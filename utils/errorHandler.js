// errorHandler.js
function handleError(err, context = '') {
    console.error(`Fehler${context ? ' (' + context + ')' : ''}:`, err);
    // Hier könnte Logging an ein externes System erfolgen
    return { error: true, message: 'Ein interner Fehler ist aufgetreten.' };
}

module.exports = { handleError };
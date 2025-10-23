// commandRouter.js
const handleThema = require('./commands/thema');
const handleThemen = require('./commands/themen');
const handleEvent = require('./commands/event');
const handleEvents = require('./commands/events');
const handleConfig = require('./commands/config');

module.exports = {
    thema: handleThema,
    themen: handleThemen,
    event: handleEvent,
    events: handleEvents,
    config: handleConfig,
    // weitere Commands hier ergänzen
};

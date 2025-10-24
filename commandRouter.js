// commandRouter.js
import handleThema from './commands/thema.js';
import handleThemen from './commands/themen.js';
import handleEvent from './commands/event.js';
import handleEvents from './commands/events.js';
import handleConfig from './commands/config.js';

export default {
  thema: handleThema,
  themen: handleThemen,
  event: handleEvent,
  events: handleEvents,
  config: handleConfig,
  // weitere Commands hier ergänzen
};

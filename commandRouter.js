import handleThema from './commands/thema.js';
import handleEvent from './commands/event.js';
import handleConfig from './commands/config.js';
import handleAufraumen from './commands/aufraumen.js';

export default {
  thema: handleThema,
  event: handleEvent,
  config: handleConfig,
  aufräumen: handleAufraumen,
};

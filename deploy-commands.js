// deploy-commands.js

import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import logger from './utils/logger.js';

// Discord API Typen als Konstante
const TYPES = {
  SUB_COMMAND: 1,
  STRING: 3,
  CHANNEL: 7,
};

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  logger.error('Bitte DISCORD_TOKEN und CLIENT_ID in .env setzen.');
  process.exit(1);
}

const commands = [
  {
    name: 'config',
    description: 'Konfiguriere den Bot',
    options: [
      {
        name: 'channel',
        type: TYPES.SUB_COMMAND,
        description: 'Setze den Channel für den Wochenpost',
        options: [
          {
            name: 'channel',
            type: TYPES.CHANNEL,
            description: 'Zielkanal für den Wochenpost',
            required: true,
          },
        ],
      },
    ],
  },
  {
    name: 'thema',
    description: 'Verwalte ein einzelnes Thema',
    options: [
      {
        name: 'hinzufügen',
        type: TYPES.SUB_COMMAND,
        description: 'Füge ein Thema hinzu',
        options: [
          {
            name: 'text',
            type: TYPES.STRING,
            description: 'Thema oder kurze Beschreibung',
            required: true,
          },
        ],
      },
      {
        name: 'löschen',
        type: TYPES.SUB_COMMAND,
        description: 'Lösche ein Thema nach ID',
        options: [
          {
            name: 'id',
            type: 4,
            description: 'ID des zu löschenden Themas',
            required: true,
          },
        ],
      },
    ],
  },
  {
    name: 'themen',
    description: 'Verwalte alle Themen',
    options: [
      {
        name: 'löschen',
        type: TYPES.SUB_COMMAND,
        description: 'Lösche alle Themen',
      },
    ],
  },
  {
    name: 'event',
    description: 'Verwalte ein einzelnes Event',
    options: [
      {
        name: 'hinzufügen',
        type: TYPES.SUB_COMMAND,
        description: 'Füge ein Event hinzu',
        options: [
          { name: 'titel', type: TYPES.STRING, description: 'Event Titel', required: true },
          {
            name: 'datum',
            type: TYPES.STRING,
            description: 'Datum/Zeit (optional)',
            required: false,
          },
        ],
      },
      {
        name: 'löschen',
        type: TYPES.SUB_COMMAND,
        description: 'Lösche ein Event nach ID',
        options: [
          {
            name: 'id',
            type: 4,
            description: 'ID des zu löschenden Events',
            required: true,
          },
        ],
      },
    ],
  },
  {
    name: 'events',
    description: 'Verwalte alle Events',
    options: [
      {
        name: 'löschen',
        type: TYPES.SUB_COMMAND,
        description: 'Lösche alle Events',
      },
      {
        name: 'aufräumen',
        type: TYPES.SUB_COMMAND,
        description: 'Synchronisiere die Discord-Eventliste',
      },
    ],
  },
  {
    name: 'wochenüberblick',
    description: 'Poste die Wochenübersicht',
    options: [
      {
        name: 'channel',
        type: TYPES.CHANNEL,
        description: 'Optional: Kanal für die Übersicht',
        required: false,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(token);

try {
  logger.info('Registriere globale Commands...');
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  logger.info('Slash-Commands global registriert.');
} catch (err) {
  logger.error('Fehler beim Registrieren der Commands:', err);
}

import 'dotenv/config';
import { REST, Routes, ApplicationCommandOptionType as Type } from 'discord.js';
import logger from './utils/logger.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  logger.error('Bitte DISCORD_TOKEN und CLIENT_ID in .env setzen.');
  process.exit(1);
}

const idOption = (what) => ({
  name: 'id',
  type: Type.Integer,
  description: `ID des zu löschenden ${what}`,
  required: true,
});

const commands = [
  {
    name: 'config',
    description: 'Konfiguriere den Bot',
    options: [
      {
        name: 'channel',
        type: Type.Subcommand,
        description: 'Setze den Channel für den Wochenpost',
        options: [
          {
            name: 'channel',
            type: Type.Channel,
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
        type: Type.Subcommand,
        description: 'Füge ein Thema hinzu',
        options: [
          {
            name: 'text',
            type: Type.String,
            description: 'Thema oder kurze Beschreibung',
            required: true,
            min_length: 3,
            max_length: 140,
          },
        ],
      },
      {
        name: 'löschen',
        type: Type.Subcommand,
        description: 'Lösche ein Thema nach ID',
        options: [idOption('Themas')],
      },
    ],
  },
  {
    name: 'event',
    description: 'Verwalte ein einzelnes Event',
    options: [
      {
        name: 'hinzufügen',
        type: Type.Subcommand,
        description: 'Füge ein Event hinzu',
        options: [
          {
            name: 'titel',
            type: Type.String,
            description: 'Event Titel',
            required: true,
            min_length: 3,
            max_length: 140,
          },
          { name: 'datum', type: Type.String, description: 'Datum/Zeit (optional)' },
        ],
      },
      {
        name: 'löschen',
        type: Type.Subcommand,
        description: 'Lösche ein Event nach ID',
        options: [idOption('Events')],
      },
    ],
  },
  {
    name: 'aufräumen',
    description: 'Verwalte und synchronisiere Themen & Events',
    options: [
      {
        name: 'datenbank',
        type: Type.Subcommand,
        description: 'Lösche alle Themen und Events aus der Datenbank',
      },
      {
        name: 'discord-sync',
        type: Type.Subcommand,
        description: 'Synchronisiere Discord-Events in die Datenbank',
      },
    ],
  },
  {
    name: 'wochenüberblick',
    description: 'Poste die Wochenübersicht',
    options: [
      { name: 'channel', type: Type.Channel, description: 'Optional: Kanal für die Übersicht' },
    ],
  },
  {
    name: 'stream',
    description: 'Erstelle eine Stream-Registrierungsmeldung',
  },
];

const rest = new REST({ version: '10' }).setToken(token);

try {
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  logger.info(`${commands.length} Slash-Commands registriert.`);
} catch (err) {
  logger.error('Fehler beim Registrieren der Commands:', err);
  process.exit(1);
}

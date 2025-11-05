import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import logger from './utils/logger.js';

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
    name: 'aufräumen',
    description: 'Verwalte und synchronisiere Themen & Events',
    options: [
      {
        name: 'datenbank',
        type: TYPES.SUB_COMMAND,
        description: 'Lösche alle Themen und Events aus der Datenbank',
      },
      {
        name: 'discord-sync',
        type: TYPES.SUB_COMMAND,
        description: 'Synchronisiere Discord-Events in die Datenbank',
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
  logger.info('Deleting old commands...');

  // Delete all global commands
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
  logger.info('Old global commands deleted.');

  // Fetch all guilds and delete guild-specific commands
  try {
    const guilds = await rest.get(Routes.userGuilds());
    logger.info(`Bot is in ${guilds.length} guild(s). Deleting guild-specific commands...`);

    for (const guild of guilds) {
      await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: [] });
      logger.info(`✓ Guild commands deleted: ${guild.name} (${guild.id})`);
    }
  } catch (error) {
    logger.warn('Could not delete guild-specific commands:', error.message);
  }

  // Register new commands globally
  logger.info('Registering new global commands...');
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  logger.info('✅ Slash commands successfully registered.');
} catch (err) {
  logger.error('Fehler beim Registrieren der Commands:', err);
  process.exit(1);
}

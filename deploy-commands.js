// deploy-commands.js

import dotenv from 'dotenv';
dotenv.config();
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

// Discord API Typen als Konstante
const TYPES = {
  SUB_COMMAND: 1,
  STRING: 3,
  CHANNEL: 7
};

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // für schnellen Test: deine Test-Guild ID

if (!token || !clientId || !guildId) {
  console.error('Bitte DISCORD_TOKEN, CLIENT_ID und GUILD_ID in .env setzen.');
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
            required: true
          }
        ]
      }
    ]
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
            required: true
          }
        ]
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
            required: true
          }
        ]
      }
    ]
  },
  {
    name: 'themen',
    description: 'Verwalte alle Themen',
    options: [
      {
        name: 'löschen',
        type: TYPES.SUB_COMMAND,
        description: 'Lösche alle Themen'
      }
    ]
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
          { name: 'datum', type: TYPES.STRING, description: 'Datum/Zeit (optional)', required: false }
        ]
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
            required: true
          }
        ]
      }
    ]
  },
  {
    name: 'events',
    description: 'Verwalte alle Events',
    options: [
      {
        name: 'löschen',
        type: TYPES.SUB_COMMAND,
        description: 'Lösche alle Events'
      },
      {
        name: 'aufräumen',
        type: TYPES.SUB_COMMAND,
        description: 'Synchronisiere die Discord-Eventliste'
      }
    ]
  },
  {
    name: 'wochenüberblick',
    description: 'Poste die Wochenübersicht',
    options: [
      {
        name: 'channel',
        type: TYPES.CHANNEL,
        description: 'Optional: Kanal für die Übersicht',
        required: false
      }
    ]
  },
];


const rest = new REST({ version: '10' }).setToken(token);
async function deploy() {
  try {
    console.log('Registriere Commands im Guild...');
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('Slash-Commands erfolgreich registriert.');
  } catch (err) {
    console.error('Fehler beim Registrieren der Commands:', err);
  }
}
deploy();
import { MessageFlags } from 'discord.js';
import dbOps from '../db/operations.js';
import { syncDiscordEventsToDb } from '../utils/discordSync.js';

export default async function handleAufraumen(interaction) {
  if (interaction.options.getSubcommand() === 'discord-sync') {
    await syncDiscordEventsToDb(interaction.guild);
    await interaction.reply({
      content: 'Discord-Events wurden in die Datenbank synchronisiert.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  dbOps.clearTopics();
  dbOps.clearEvents();
  await interaction.reply({
    content: 'Alle Themen und Events wurden gelöscht.',
    flags: MessageFlags.Ephemeral,
  });
}

import { handleError } from '../utils/errorHandler.js';

export default async function handleAufraumen(interaction, dbOps, syncDiscordEventsToDb) {
  try {
    const sub = interaction.options.getSubcommand();

    if (sub === 'datenbank') {
      await dbOps.clearTopics();
      await dbOps.clearEvents();
      await interaction.reply({
        content: '✅ Alle Themen und Events wurden gelöscht.',
        ephemeral: true,
      });
      return;
    }

    if (sub === 'discord-sync') {
      await syncDiscordEventsToDb(interaction.guild, dbOps);
      await interaction.reply({
        content: '✅ Discord-Events wurden in die Datenbank synchronisiert.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: 'Unbekannter Subcommand für /aufräumen.',
      ephemeral: true,
    });
  } catch (err) {
    const errorMsg = handleError(err, 'Aufräumen');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
}

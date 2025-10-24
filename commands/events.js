// commands/events.js
import { handleError } from '../utils/errorHandler.js';

export default async function handleEvents(interaction, dbOps, syncDiscordEventsToDb) {
  try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'löschen') {
      await dbOps.clearEvents();
      await interaction.reply({ content: '✅ Alle Events wurden gelöscht.', ephemeral: true });
      return;
    }
    if (sub === 'aufräumen') {
      await syncDiscordEventsToDb(interaction.guild);
      await interaction.reply({
        content: '✅ Die Discord-Eventliste wurde synchronisiert.',
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({ content: 'Unbekannter Subcommand für /events.', ephemeral: true });
  } catch (err) {
    const errorMsg = handleError(err, 'Events');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
}

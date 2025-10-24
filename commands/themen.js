// commands/themen.js
import { handleError } from '../utils/errorHandler.js';

export default async function handleThemen(interaction, dbOps) {
  try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'löschen') {
      await dbOps.clearTopics();
      await interaction.reply({ content: '✅ Alle Themen wurden gelöscht.', ephemeral: true });
      return;
    }
    await interaction.reply({ content: 'Unbekannter Subcommand für /themen.', ephemeral: true });
  } catch (err) {
    const errorMsg = handleError(err, 'Themen');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
}

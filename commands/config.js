import { handleError } from '../utils/errorHandler.js';

export default async function handleConfig(interaction, dbOps) {
  try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel', true);
      await dbOps.setConfig('postChannel', channel.id);
      await interaction.reply({
        content: `✅ Channel für Wochenpost gesetzt: <#${channel.id}> (${channel.name})`,
      });
      return;
    }
    await interaction.reply({ content: 'Unbekannter Subcommand für /config.', ephemeral: true });
  } catch (err) {
    const errorMsg = handleError(err, 'Config');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
}

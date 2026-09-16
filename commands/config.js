import dbOps from '../db/operations.js';

export default async function handleConfig(interaction) {
  const channel = interaction.options.getChannel('channel', true);
  dbOps.setConfig('postChannel', channel.id);
  await interaction.reply({
    content: `Channel für Wochenpost gesetzt: <#${channel.id}> (${channel.name})`,
  });
}

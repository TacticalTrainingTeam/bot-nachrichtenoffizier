import { MessageFlags } from 'discord.js';
import dbOps from '../db/operations.js';

export default async function handleThema(interaction) {
  if (interaction.options.getSubcommand() === 'löschen') {
    const id = interaction.options.getInteger('id', true);
    dbOps.deleteTopicById(id);
    await interaction.reply({
      content: `Thema mit ID ${id} gelöscht.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const text = interaction.options.getString('text', true);
  dbOps.insertTopic(interaction.user.tag, interaction.user.id, text);
  await interaction.reply({
    content: 'Dein Thema wurde gespeichert. Danke!',
    flags: MessageFlags.Ephemeral,
  });
}

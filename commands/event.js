import { MessageFlags } from 'discord.js';
import dbOps from '../db/operations.js';

export default async function handleEvent(interaction) {
  if (interaction.options.getSubcommand() === 'löschen') {
    const id = interaction.options.getInteger('id', true);
    dbOps.deleteEventById(id);
    await interaction.reply({
      content: `Event mit ID ${id} gelöscht.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const title = interaction.options.getString('titel', true);
  const dateText = interaction.options.getString('datum');
  dbOps.insertEvent(title, dateText, interaction.user.tag);
  await interaction.reply({
    content: `Event **${title}** wurde gespeichert.`,
    flags: MessageFlags.Ephemeral,
  });
}

import Joi from 'joi';
import { handleError } from '../utils/errorHandler.js';

const themaSchema = Joi.object({
  text: Joi.string().min(3).max(140).required(),
});

export default async function handleThema(interaction, dbOps) {
  try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'hinzufügen') {
      const text = interaction.options.getString('text', true);

      const { error } = themaSchema.validate({ text });
      if (error) {
        await interaction.reply({
          content: `Ungültige Eingabe: ${error.details[0].message}`,
          ephemeral: true,
        });
        return;
      }

      await dbOps.insertTopic(interaction.user.tag, interaction.user.id, text);
      await interaction.reply({
        content: '✅ Dein Thema wurde gespeichert. Danke!',
        ephemeral: true,
      });
      return;
    }
    if (sub === 'löschen') {
      const id = interaction.options.getInteger('id', true);
      await dbOps.deleteTopicById(id);
      await interaction.reply({ content: `✅ Thema mit ID ${id} gelöscht.`, ephemeral: true });
      return;
    }
    await interaction.reply({ content: 'Unbekannter Subcommand für /thema.', ephemeral: true });
  } catch (err) {
    const errorMsg = handleError(err, 'Thema');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
}

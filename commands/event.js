// commands/event.js
import Joi from 'joi';
import { handleError } from '../utils/errorHandler.js';

const eventSchema = Joi.object({
  title: Joi.string().min(3).max(140).required(),
  dateText: Joi.string().optional(),
});

export default async function handleEvent(interaction, dbOps) {
  try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'hinzufügen') {
      const title = interaction.options.getString('titel', true);
      const dateText = interaction.options.getString('datum', false) || null;

      const { error } = eventSchema.validate({ title, dateText });
      if (error) {
        await interaction.reply({
          content: `Ungültige Eingabe: ${error.details[0].message}`,
          ephemeral: true,
        });
        return;
      }

      await dbOps.insertEvent(title, dateText, interaction.user.tag);
      await interaction.reply({
        content: '✅ Event **' + title + '** wurde gespeichert.',
        ephemeral: true,
      });
      return;
    }
    if (sub === 'löschen') {
      const id = interaction.options.getInteger('id', true);
      await dbOps.deleteEventById(id);
      await interaction.reply({ content: `✅ Event mit ID ${id} gelöscht.`, ephemeral: true });
      return;
    }
    await interaction.reply({ content: 'Unbekannter Subcommand für /event.', ephemeral: true });
  } catch (err) {
    const errorMsg = handleError(err, 'Event');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
}

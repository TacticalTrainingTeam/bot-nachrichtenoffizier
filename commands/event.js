// commands/event.js
const { validateText, validateDate } = require('../utils/validate');
const { handleError } = require('../utils/errorHandler');

module.exports = async function handleEvent(interaction, dbOps) {
    try {
        const sub = interaction.options.getSubcommand();
        if (sub === 'hinzufügen') {
            const title = interaction.options.getString('titel', true);
            const dateText = interaction.options.getString('datum', false) || null;
            if (!validateText(title)) {
                await interaction.reply({ content: 'Titel ungültig (3-140 Zeichen).', ephemeral: true });
                return;
            }
            if (dateText && !validateDate(dateText)) {
                await interaction.reply({ content: 'Datum ungültig.', ephemeral: true });
                return;
            }
            await dbOps.insertEvent(title, dateText, interaction.user.tag);
            await interaction.reply({ content: '✅ Event **' + title + '** wurde gespeichert.', ephemeral: true });
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
};

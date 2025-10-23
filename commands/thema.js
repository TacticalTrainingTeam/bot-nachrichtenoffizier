// commands/thema.js
const { validateText } = require('../utils/validate');
const { handleError } = require('../utils/errorHandler');

module.exports = async function handleThema(interaction, dbOps) {
    try {
        const sub = interaction.options.getSubcommand();
        if (sub === 'hinzufügen') {
            const text = interaction.options.getString('text', true);
            if (!validateText(text)) {
                await interaction.reply({ content: 'Text ungültig (3-140 Zeichen).', ephemeral: true });
                return;
            }
            await dbOps.insertTopic(interaction.user.tag, interaction.user.id, text);
            await interaction.reply({ content: '✅ Dein Thema wurde gespeichert. Danke!', ephemeral: true });
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
};

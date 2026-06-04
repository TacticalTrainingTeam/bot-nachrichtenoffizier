import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { handleError } from '../utils/errorHandler.js';

export default async function handleStream(interaction, { dbOps, client }) {
  try {
    const channelId = interaction.channelId;
    const messageContent = '**Streamer für dieses Event**';

    const registerButton = new ButtonBuilder()
      .setCustomId(`stream_register_${channelId}`)
      .setLabel('Streamer registrieren')
      .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder().addComponents(registerButton);

    await interaction.channel.send({
      content: messageContent,
      components: [actionRow],
    });

    await interaction.reply({
      content: 'Stream-Übersicht erstellt!',
      ephemeral: true,
    });
  } catch (err) {
    const errorMsg = handleError(err, 'Stream');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
}

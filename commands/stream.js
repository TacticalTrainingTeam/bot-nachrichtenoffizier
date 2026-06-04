import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { handleError } from '../utils/errorHandler.js';

export default async function handleStream(interaction) {
  try {
    const channelId = interaction.channelId;
    const messageContent = '**Wir suchen Streamer für dieses Event. Melde dich.**';

    const registerButton = new ButtonBuilder()
      .setCustomId(`stream_register_${channelId}`)
      .setLabel('Ich will streamen')
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

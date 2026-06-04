import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { handleError } from '../utils/errorHandler.js';
import dbOps from '../db/operations.js';

export default async function handleStream(interaction) {
  try {
    const channelId = interaction.channelId;

    // Prüfe, ob bereits eine Stream-Nachricht in diesem Channel existiert
    const existingMessage = dbOps.getStreamMessageByChannelId(channelId);
    if (existingMessage) {
      await interaction.reply({
        content: 'Es existiert bereits eine Stream-Übersicht in diesem Channel!',
        ephemeral: true,
      });
      return;
    }

    const messageContent = '**Wir suchen Streamer für dieses Event. Melde dich.**';

    const registerButton = new ButtonBuilder()
      .setCustomId(`stream_register_${channelId}`)
      .setLabel('Ich will streamen')
      .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder().addComponents(registerButton);

    const streamMessage = await interaction.channel.send({
      content: messageContent,
      components: [actionRow],
    });

    // Speichere die Message-ID und Channel-ID
    dbOps.insertStreamMessage(streamMessage.id, channelId);

    await interaction.reply({
      content: 'Stream-Übersicht erstellt!',
      ephemeral: true,
    });
  } catch (err) {
    const errorMsg = handleError(err, 'Stream');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
}

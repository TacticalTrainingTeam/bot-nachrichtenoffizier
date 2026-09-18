import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import dbOps from '../db/operations.js';

export default async function handleStream(interaction) {
  const { channelId } = interaction;
  const existing = dbOps.getStreamMessageByChannelId(channelId);
  if (existing) {
    const message = await interaction.channel.messages.fetch(existing.message_id).catch(() => null);
    if (message) {
      await interaction.reply({
        content: 'Es existiert bereits eine Stream-Übersicht in diesem Channel!',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    dbOps.deleteStreamMessage(existing.message_id); // Nachricht wurde gelöscht, Eintrag aufräumen
  }

  const registerButton = new ButtonBuilder()
    .setCustomId(`stream_register_${channelId}`)
    .setLabel('Ich will streamen')
    .setStyle(ButtonStyle.Primary);

  const streamMessage = await interaction.channel.send({
    content: '**Wir suchen Streamer für dieses Event. Melde dich.**',
    components: [new ActionRowBuilder().addComponents(registerButton)],
  });
  dbOps.insertStreamMessage(streamMessage.id, channelId);

  await interaction.reply({ content: 'Stream-Übersicht erstellt!', flags: MessageFlags.Ephemeral });
}

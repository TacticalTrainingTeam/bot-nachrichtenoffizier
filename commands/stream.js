import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import dbOps from '../db/operations.js';

export default async function handleStream(interaction) {
  const { channelId } = interaction;
  if (dbOps.getStreamMessageByChannelId(channelId)) {
    await interaction.reply({
      content: 'Es existiert bereits eine Stream-Übersicht in diesem Channel!',
      flags: MessageFlags.Ephemeral,
    });
    return;
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

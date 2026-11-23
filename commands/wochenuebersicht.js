import { MessageFlags } from 'discord.js';
import dbOps from '../db/operations.js';
import { sendWeeklySummary } from '../utils/weeklyPost.js';

export default async function handleWochenuebersicht(interaction) {
  let channel = interaction.options.getChannel('channel');
  if (!channel) {
    const channelId = dbOps.getConfig('postChannel');
    if (!channelId) {
      await interaction.reply({
        content: 'Kein Zielkanal konfiguriert. Bitte zuerst mit /config setzen.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    channel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.reply({
        content: 'Konfigurierter Kanal nicht erreichbar.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }
  await sendWeeklySummary(interaction.client, channel);
  await interaction.reply({
    content: 'Test-Wochenübersicht gesendet.',
    flags: MessageFlags.Ephemeral,
  });
}

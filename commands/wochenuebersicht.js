import { handleError } from '../utils/errorHandler.js';
import { syncDiscordEventsToDb } from '../utils/discordSync.js';

export default async function handleWochenuebersicht(
  interaction,
  { dbOps, client, createWeeklySummaryMessage }
) {
  try {
    let channel = interaction.options.getChannel('channel', false);
    if (!channel) {
      const channelId = await dbOps.getConfig('postChannel');
      if (!channelId) {
        await interaction.reply({
          content: 'Kein Zielkanal konfiguriert. Bitte zuerst mit /config setzen.',
          ephemeral: true,
        });
        return;
      }
      channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        await interaction.reply({
          content: 'Konfigurierter Kanal nicht erreichbar.',
          ephemeral: true,
        });
        return;
      }
    }
    await syncDiscordEventsToDb(interaction.guild, dbOps);
    const events = await dbOps.getAllEvents();
    const topics = await dbOps.getAllTopics();
    const message = createWeeklySummaryMessage(events, topics);
    await channel.send({ content: message });
    await interaction.reply({ content: 'Test-Wochenübersicht gesendet.', ephemeral: true });
  } catch (err) {
    const errorMsg = handleError(err, 'Wochenübersicht');
    await interaction.reply({ content: errorMsg.message, ephemeral: true });
  }
}

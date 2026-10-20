// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';

export const name = Events.MessageCreate;
export const once = false;

export async function execute(client, message) {
  if (!message.inGuild() || !message.guild) return;
  if (message.author?.bot || message.system || message.webhookId) return;

  client.stats.increment(message.guild.id, 'messagesScanned');

  try {
    const handled = await client.security.antiPhishing.handleMessage(message);
    if (handled) return;
  } catch (error) {
    client.logger.error('Error en Anti-Phishing', {
      guildId: message.guild.id,
      channelId: message.channelId,
      messageId: message.id,
      error,
    });
  }

  try {
    await client.security.antiSpam.handleMessage(message);
  } catch (error) {
    client.logger.error('Error en Anti-Spam', {
      guildId: message.guild.id,
      channelId: message.channelId,
      messageId: message.id,
      error,
    });
  }
}

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';

export const name = Events.ChannelDelete;
export const once = false;

export async function execute(client, channel) {
  if (!channel.guild) return;
  try {
    await client.security.antiNuke.handle({
      guild: channel.guild,
      type: 'channelDelete',
      targetId: channel.id,
      targetName: channel.name ?? channel.id,
      severity: 'high',
    });
  } catch (error) {
    client.logger.error('Error en Anti-Nuke al eliminar un canal', {
      guildId: channel.guild.id,
      channelId: channel.id,
      error,
    });
  }
}

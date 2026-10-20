// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';

export const name = Events.ChannelCreate;
export const once = false;

export async function execute(client, channel) {
  if (!channel.guild) return;
  try {
    await client.security.antiNuke.handle({
      guild: channel.guild,
      type: 'channelCreate',
      targetId: channel.id,
      targetName: channel.name ?? channel.id,
      severity: 'medium',
    });
  } catch (error) {
    client.logger.error('Error en Anti-Nuke al crear un canal', {
      guildId: channel.guild.id,
      channelId: channel.id,
      error,
    });
  }
}

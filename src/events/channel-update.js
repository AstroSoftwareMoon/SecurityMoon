// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';

export const name = Events.ChannelUpdate;
export const once = false;

export async function execute(client, oldChannel, newChannel) {
  if (!newChannel.guild) return;
  try {
    await client.security.antiNuke.handleChannelPermissionChange(newChannel.guild, oldChannel, newChannel);
  } catch (error) {
    client.logger.error('Error en la protección de permisos al actualizar un canal', {
      guildId: newChannel.guild.id,
      channelId: newChannel.id,
      error,
    });
  }
}

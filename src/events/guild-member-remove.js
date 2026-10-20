// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';

export const name = Events.GuildMemberRemove;
export const once = false;

export async function execute(client, member) {
  if (!member.guild) return;
  client.stats.increment(member.guild.id, 'leaves');
  try {
    await client.security.antiNuke.handle({
      guild: member.guild,
      type: 'kick',
      targetId: member.id,
      targetName: member.user?.tag ?? member.id,
      severity: 'medium',
    });
  } catch (error) {
    client.logger.error('Error en Anti-Nuke al procesar una salida', {
      guildId: member.guild.id,
      userId: member.id,
      error,
    });
  }
}

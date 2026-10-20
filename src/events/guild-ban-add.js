// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';

export const name = Events.GuildBanAdd;
export const once = false;

export async function execute(client, ban) {
  if (!ban.guild) return;
  try {
    await client.security.antiNuke.handle({
      guild: ban.guild,
      type: 'ban',
      targetId: ban.user.id,
      targetName: ban.user.tag,
      severity: 'high',
    });
  } catch (error) {
    client.logger.error('Error en Anti-Nuke al procesar un baneo', {
      guildId: ban.guild.id,
      userId: ban.user.id,
      error,
    });
  }
}

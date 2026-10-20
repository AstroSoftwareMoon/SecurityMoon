// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';

export const name = Events.GuildMemberAdd;
export const once = false;

export async function execute(client, member) {
  if (!member.guild) return;
  client.stats.increment(member.guild.id, 'joins');
  try {
    await client.security.antiRaid.handleMemberJoin(member);
  } catch (error) {
    client.logger.error('Error en Anti-Raid al procesar una entrada', {
      guildId: member.guild.id,
      userId: member.id,
      error,
    });
  }
}

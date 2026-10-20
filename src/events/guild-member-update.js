// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';

export const name = Events.GuildMemberUpdate;
export const once = false;

export async function execute(client, oldMember, newMember) {
  const guild = newMember.guild;
  if (!guild) return;
  try {
    await client.security.antiNuke.handleMemberRoleUpdate(guild, oldMember, newMember);
  } catch (error) {
    client.logger.error('Error en la protección de permisos al actualizar un miembro', {
      guildId: guild.id,
      userId: newMember.id,
      error,
    });
  }
}

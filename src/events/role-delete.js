// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';

export const name = Events.GuildRoleDelete;
export const once = false;

export async function execute(client, role) {
  if (!role.guild) return;
  try {
    await client.security.antiNuke.handle({
      guild: role.guild,
      type: 'roleDelete',
      targetId: role.id,
      targetName: role.name,
      severity: 'high',
    });
  } catch (error) {
    client.logger.error('Error en Anti-Nuke al eliminar un rol', {
      guildId: role.guild.id,
      roleId: role.id,
      error,
    });
  }
}

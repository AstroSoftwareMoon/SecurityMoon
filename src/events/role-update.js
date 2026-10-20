// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';

export const name = Events.GuildRoleUpdate;
export const once = false;

export async function execute(client, oldRole, newRole) {
  if (!newRole.guild) return;
  try {
    await client.security.antiNuke.handleRolePermissionChange(newRole.guild, oldRole, newRole);
  } catch (error) {
    client.logger.error('Error en la protección de permisos al actualizar un rol', {
      guildId: newRole.guild.id,
      roleId: newRole.id,
      error,
    });
  }
}

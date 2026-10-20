// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionFlagsBits } from 'discord.js';
import { hasDangerousPermissions, canModerate } from '../utils/permissions.js';
import { UserError } from '../utils/errors.js';

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

function failure(reason) {
  return { ok: false, result: reason };
}

/**
 * Aplica un timeout comprobando permisos y jerarquía.
 */
export async function applyTimeout(guild, member, milliseconds, reason) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return failure('SecurityMoon no tiene el permiso Moderar miembros.');
  }
  if (!member) return failure('El miembro ya no está en el servidor.');
  try {
    canModerate({ guild, executor: me, targetUser: member.user });
    if (!member.moderatable) return failure('El miembro no se puede moderar por jerarquía.');
    const duration = Math.max(60_000, Math.min(milliseconds, MAX_TIMEOUT_MS));
    await member.timeout(duration, reason);
    return { ok: true, result: `Timeout aplicado durante ${Math.round(duration / 1000)}s.` };
  } catch (error) {
    if (error instanceof UserError) return failure(error.message);
    return failure(`No se pudo aplicar el timeout: ${error.message}`);
  }
}

export async function applyKick(guild, member, reason) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.KickMembers)) {
    return failure('SecurityMoon no tiene el permiso Expulsar miembros.');
  }
  if (!member) return failure('El miembro ya no está en el servidor.');
  try {
    canModerate({ guild, executor: me, targetUser: member.user });
    if (!member.kickable) return failure('El miembro no se puede expulsar por jerarquía.');
    await member.kick(reason);
    return { ok: true, result: 'Miembro expulsado.' };
  } catch (error) {
    return failure(`No se pudo expulsar: ${error.message}`);
  }
}

export async function applyBan(guild, userId, reason, { deleteMessageSeconds = 0 } = {}) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.BanMembers)) {
    return failure('SecurityMoon no tiene el permiso Banear miembros.');
  }
  try {
    const user = await guild.client.users.fetch(userId).catch(() => null);
    if (!user) return failure('No se pudo obtener el usuario para banearlo.');
    canModerate({ guild, executor: me, targetUser: user });
    await guild.members.ban(userId, {
      reason,
      deleteMessageSeconds: Math.max(0, Math.min(604800, deleteMessageSeconds)),
    });
    return { ok: true, result: 'Usuario baneado.' };
  } catch (error) {
    return failure(`No se pudo banear: ${error.message}`);
  }
}

export async function stripDangerousRoles(guild, member, reason) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return failure('SecurityMoon no tiene el permiso Gestionar roles.');
  }
  if (!member) return failure('El miembro ya no está en el servidor.');
  if (guild.ownerId === member.id) return failure('No se pueden retirar roles al propietario.');
  const removable = member.roles.cache.filter(
    (role) =>
      role.id !== guild.id &&
      !role.managed &&
      hasDangerousPermissions(role.permissions) &&
      me.roles.highest.comparePositionTo(role) > 0,
  );
  if (removable.size === 0) return failure('No hay roles peligrosos que SecurityMoon pueda retirar.');
  let removed = 0;
  for (const role of removable.values()) {
    try {
      await member.roles.remove(role, reason);
      removed += 1;
    } catch {
      // Continúa con los demás roles.
    }
  }
  return removed > 0
    ? { ok: true, result: `Se retiraron ${removed} rol(es) peligroso(s).` }
    : failure('No se pudo retirar ningún rol peligroso.');
}

export async function lockdownGuild(guild, reason) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return failure('SecurityMoon no tiene el permiso Gestionar servidor para el bloqueo.');
  }
  const previous = guild.verificationLevel;
  try {
    if (previous < 3) {
      await guild.setVerificationLevel(3, reason);
      return { ok: true, result: `Nivel de verificación elevado (${previous} → 3).`, previous };
    }
    return { ok: true, result: 'El nivel de verificación ya era alto.', previous };
  } catch (error) {
    return failure(`No se pudo elevar la verificación: ${error.message}`);
  }
}

async function deleteOneByOne(messages) {
  let deleted = 0;
  for (const message of messages) {
    try {
      await message.delete();
      deleted += 1;
    } catch {
      // Mensaje ya eliminado o sin permisos puntuales.
    }
  }
  return deleted;
}

/**
 * Elimina mensajes recientes de un usuario en un canal.
 */
export async function deleteRecentMessages(channel, userId, { limit = 20, maxAgeMs = 60_000 } = {}) {
  if (!channel?.guild) return { ok: false, result: 'Canal no válido.' };
  const me = channel.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return failure('SecurityMoon no tiene el permiso Gestionar mensajes.');
  }
  try {
    const fetched = await channel.messages.fetch({ limit: Math.min(100, Math.max(2, limit)) });
    const targets = [...fetched.values()].filter(
      (message) => message.author?.id === userId && Date.now() - message.createdTimestamp <= maxAgeMs,
    );
    if (targets.length === 0) return { ok: true, result: 'No había mensajes recientes que eliminar.' };
    if (targets.length === 1) {
      await targets[0].delete().catch(() => {});
      return { ok: true, result: '1 mensaje eliminado.' };
    }
    try {
      const deleted = await channel.bulkDelete(targets, true);
      return { ok: true, result: `${deleted.size} mensajes eliminados.` };
    } catch {
      const deleted = await deleteOneByOne(targets);
      return { ok: true, result: `${deleted} mensajes eliminados.` };
    }
  } catch (error) {
    return failure(`No se pudieron eliminar mensajes: ${error.message}`);
  }
}

/** Aplica una acción de sanción genérica y devuelve un resultado descriptivo. */
export async function applySanction({ guild, member, userId, action, reason, timeoutMs = 600_000 }) {
  switch (action) {
    case 'alert':
      return { ok: true, result: 'Solo se generó una alerta.' };
    case 'timeout':
      if (!member) return failure('El miembro ya no está en el servidor.');
      return applyTimeout(guild, member, timeoutMs, reason);
    case 'kick':
      return applyKick(guild, member, reason);
    case 'ban':
      return applyBan(guild, userId ?? member?.id, reason);
    case 'strip_roles':
      return stripDangerousRoles(guild, member, reason);
    case 'lockdown':
      return lockdownGuild(guild, reason);
    default:
      return failure('Acción no reconocida.');
  }
}

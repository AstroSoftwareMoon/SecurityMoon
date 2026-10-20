// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { AuditLogEvent, PermissionFlagsBits } from 'discord.js';

const CACHE_TTL_MS = 1500;
const cache = new Map();

export const AUDIT_EVENT_TYPES = Object.freeze({
  channelDelete: AuditLogEvent.ChannelDelete,
  roleDelete: AuditLogEvent.RoleDelete,
  channelCreate: AuditLogEvent.ChannelCreate,
  roleCreate: AuditLogEvent.RoleCreate,
  ban: AuditLogEvent.GuildBanAdd,
  kick: AuditLogEvent.MemberKick,
  channelUpdate: AuditLogEvent.ChannelUpdate,
  roleUpdate: AuditLogEvent.RoleUpdate,
  memberRoleUpdate: AuditLogEvent.MemberRoleUpdate,
});

/**
 * Resuelve el autor de una acción usando los registros de auditoría.
 * Devuelve available=false si SecurityMoon no puede verlos.
 */
export async function resolveAuditExecutor(guild, type, targetId = null, { windowMs = 15_000, limit = 25 } = {}) {
  const me = guild?.members?.me;
  if (!me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
    return { available: false, entry: null, executor: null, error: 'Sin permiso Ver registro de auditoría.' };
  }

  const now = Date.now();
  const key = `${guild.id}:${type}`;
  let cached = cache.get(key);
  if (!cached || now - cached.at > CACHE_TTL_MS) {
    try {
      const logs = await guild.fetchAuditLogs({ type, limit });
      cached = { at: now, entries: [...logs.entries.values()] };
      cache.set(key, cached);
      if (cache.size > 100) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (oldest) cache.delete(oldest[0]);
      }
    } catch (error) {
      return { available: false, entry: null, executor: null, error: error.message };
    }
  }

  const entry = cached.entries.find((candidate) => {
    const matchesTarget = !targetId || candidate.target?.id === targetId;
    return matchesTarget && now - candidate.createdTimestamp <= windowMs;
  });

  return {
    available: true,
    entry: entry ?? null,
    executor: entry?.executor ?? null,
    reason: entry?.reason ?? null,
    error: null,
  };
}

export function clearAuditCache() {
  cache.clear();
}

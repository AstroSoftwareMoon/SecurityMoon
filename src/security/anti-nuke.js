// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionsBitField, PermissionFlagsBits } from 'discord.js';
import { resolveAuditExecutor, AUDIT_EVENT_TYPES } from './audit.js';
import { applySanction } from './actions.js';
import { isTrustedMember } from '../utils/permissions.js';
import { nowIso } from '../utils/time.js';

export const DANGEROUS_BITS = Object.freeze([
  'Administrator',
  'ManageGuild',
  'ManageRoles',
  'ManageChannels',
  'ManageWebhooks',
  'KickMembers',
  'BanMembers',
  'ModerateMembers',
  'MentionEveryone',
  'ManageMessages',
]);

const TYPE_LABEL = Object.freeze({
  channelDelete: 'canales eliminados',
  roleDelete: 'roles eliminados',
  channelCreate: 'canales creados',
  roleCreate: 'roles creados',
  ban: 'baneos',
  kick: 'expulsiones',
  permissionChange: 'cambios de permisos',
});

/**
 * Devuelve los permisos peligrosos añadidos entre dos bitfields.
 */
export function diffDangerousPermissions(oldPermissions, newPermissions) {
  const before = new PermissionsBitField(oldPermissions ?? 0n);
  const after = new PermissionsBitField(newPermissions ?? 0n);
  return DANGEROUS_BITS.filter((name) => {
    const bit = PermissionFlagsBits[name];
    return bit !== undefined && !before.has(bit, false) && after.has(bit, false);
  });
}

/**
 * Anti-Nuke basado en registros de auditoría y ventanas de acciones.
 */
export class AntiNuke {
  constructor(client) {
    this.client = client;
    this.logger = client.logger;
    this.buckets = new Map();
    this.auditWarnings = new Map();
    this.permissionDedup = new Map();
  }

  async settingsFor(guildId) {
    return this.client.stores.guilds.get(guildId);
  }

  thresholdFor(config, type) {
    if (type === 'permissionChange') return config.thresholds.permissionChange;
    return config.thresholds[type] ?? 3;
  }

  async isIgnored(guild, settings, trusted, actor) {
    if (!actor) return true;
    if (actor.id === this.client.user?.id) return true;
    if (actor.id === guild.ownerId) return true;
    if (settings.modules.antiNuke.trustedBots.includes(actor.id)) return true;
    const member = guild.members.cache.get(actor.id);
    if (member && isTrustedMember(member, trusted)) return true;
    return false;
  }

  async handle({
    guild,
    type,
    targetId = null,
    targetName = null,
    actorOverride = null,
    severity = null,
    details = null,
    forceAlert = false,
  }) {
    if (!TYPE_LABEL[type]) return null;
    const settings = await this.settingsFor(guild.id);
    const config = settings.modules.antiNuke;
    if (!config.enabled) return null;

    let actor = actorOverride;
    if (!actor) {
      const audit = await resolveAuditExecutor(guild, AUDIT_EVENT_TYPES[type], targetId);
      if (!audit.available) {
        const now = Date.now();
        if (now - (this.auditWarnings.get(guild.id) ?? 0) > 3_600_000) {
          this.auditWarnings.set(guild.id, now);
          this.logger?.warn('No se puede identificar al autor sin registros de auditoría', {
            guildId: guild.id,
            type,
            error: audit.error,
          });
        }
        return null;
      }
      actor = audit.executor;
    }
    if (!actor) return null;

    const trusted = await this.client.stores.trusted.get(guild.id);
    if (await this.isIgnored(guild, settings, trusted, actor)) return null;

    const now = Date.now();
    const key = `${guild.id}:${actor.id}:${type}`;
    const emergency = settings.emergency.active;
    const threshold = emergency ? 1 : this.thresholdFor(config, type);
    const windowMs = config.windowSeconds * 1000;
    const bucket = (this.buckets.get(key) ?? []).filter((timestamp) => now - timestamp <= windowMs);
    bucket.push(now);
    this.buckets.set(key, bucket);

    if (bucket.length < threshold) {
      if (forceAlert) {
        await this.recordIncident({
          guild,
          type,
          actor,
          targetId,
          targetName,
          severity: severity ?? 'high',
          description: `Cambio sensible detectado (${bucket.length}/${threshold} en ${config.windowSeconds}s).`,
          action: 'Alerta (por debajo del umbral de contención)',
          result: 'No se aplicaron sanciones automáticas.',
          details,
        });
        return { alerted: true, contained: false };
      }
      return null;
    }

    this.buckets.set(key, []);
    const member = await guild.members.fetch(actor.id).catch(() => null);
    const action = config.action;
    const sanction = await applySanction({
      guild,
      member,
      userId: actor.id,
      action,
      reason: `SecurityMoon Anti-Nuke: ${bucket.length} ${TYPE_LABEL[type]} en ${config.windowSeconds}s`,
    });

    await this.client.stats?.increment(guild.id, 'nukesBlocked');
    await this.recordIncident({
      guild,
      type,
      actor,
      targetId,
      targetName,
      severity: severity ?? 'critical',
      description: `Actividad destructiva detectada: ${bucket.length} ${TYPE_LABEL[type]} en ${config.windowSeconds}s (umbral ${threshold}).`,
      action,
      result: sanction.result,
      details,
    });

    this.logger?.warn('Anti-Nuke aplicó contención', {
      guildId: guild.id,
      actorId: actor.id,
      type,
      count: bucket.length,
      action,
    });
    return { alerted: true, contained: sanction.ok, result: sanction.result };
  }

  async recordIncident({
    guild,
    type,
    actor,
    targetId,
    targetName,
    severity,
    description,
    action,
    result,
    details,
  }) {
    const targetIsUser = type === 'ban' || type === 'kick';
    await this.client.incidents.record({
      guildId: guild.id,
      type: 'nuke',
      severity: severity ?? 'high',
      userId: targetIsUser ? targetId : null,
      actorId: actor.id,
      description: targetName ? `${description} Objetivo: ${targetName}` : description,
      action,
      result,
      details: details ?? null,
      urls: [],
      alert: true,
    });
  }

  /**
   * Analiza cambios de permisos en un rol y alerta si se añaden permisos peligrosos.
   */
  async handleRolePermissionChange(guild, oldRole, newRole) {
    const settings = await this.settingsFor(guild.id);
    if (!settings.modules.permissionsGuard.enabled) return null;
    const added = diffDangerousPermissions(oldRole?.permissions, newRole.permissions);
    if (added.length === 0) return null;

    const audit = await resolveAuditExecutor(guild, AUDIT_EVENT_TYPES.roleUpdate, newRole.id);
    if (!audit.available) return null;
    const actor = audit.executor;
    if (!actor) return null;

    const dedupKey = `role:${guild.id}:${newRole.id}:${added.join(',')}`;
    if (Date.now() - (this.permissionDedup.get(dedupKey) ?? 0) < 60_000) return null;
    this.permissionDedup.set(dedupKey, Date.now());

    const severity = added.includes('Administrator') ? 'critical' : 'high';
    return this.handle({
      guild,
      type: 'permissionChange',
      targetId: newRole.id,
      targetName: `rol ${newRole.name}`,
      actorOverride: actor,
      severity,
      details: `Permisos añadidos al rol: ${added.join(', ')}.`,
      forceAlert: settings.modules.permissionsGuard.alertOnAdminGrant,
    });
  }

  /**
   * Detecta asignaciones de roles con permisos peligrosos a miembros.
   */
  async handleMemberRoleUpdate(guild, oldMember, newMember) {
    const settings = await this.settingsFor(guild.id);
    if (!settings.modules.permissionsGuard.enabled || !settings.modules.permissionsGuard.alertOnMemberAdminRole) {
      return null;
    }
    const oldRoles = new Set(oldMember?.roles?.cache?.keys?.() ?? []);
    const addedRoles = [...newMember.roles.cache.values()].filter((role) => !oldRoles.has(role.id));
    const dangerous = addedRoles.filter((role) =>
      DANGEROUS_BITS.some((name) => role.permissions.has(PermissionFlagsBits[name])),
    );
    if (dangerous.length === 0) return null;

    const audit = await resolveAuditExecutor(guild, AUDIT_EVENT_TYPES.memberRoleUpdate, newMember.id);
    if (!audit.available || !audit.executor) return null;
    const actor = audit.executor;
    const dedupKey = `member:${guild.id}:${newMember.id}:${dangerous.map((role) => role.id).join(',')}`;
    if (Date.now() - (this.permissionDedup.get(dedupKey) ?? 0) < 120_000) return null;
    this.permissionDedup.set(dedupKey, Date.now());

    const names = dangerous.map((role) => role.name).join(', ');
    return this.handle({
      guild,
      type: 'permissionChange',
      targetId: newMember.id,
      targetName: `miembro ${newMember.user.tag}`,
      actorOverride: actor,
      severity: 'high',
      details: `Roles peligrosos asignados: ${names}.`,
      forceAlert: true,
    });
  }

  async handleChannelPermissionChange(guild, oldChannel, newChannel) {
    const settings = await this.settingsFor(guild.id);
    if (!settings.modules.permissionsGuard.enabled) return null;
    const before = oldChannel.permissionOverwrites?.cache;
    const after = newChannel.permissionOverwrites?.cache;
    if (!before || !after) return null;
    const serialize = (collection) =>
      [...collection.values()]
        .map((overwrite) => `${overwrite.id}:${overwrite.allow.bitfield}:${overwrite.deny.bitfield}`)
        .sort()
        .join('|');
    if (serialize(before) === serialize(after)) return null;

    const audit = await resolveAuditExecutor(guild, AUDIT_EVENT_TYPES.channelUpdate, newChannel.id);
    if (!audit.available || !audit.executor) return null;
    const actor = audit.executor;
    const dedupKey = `channel:${guild.id}:${newChannel.id}`;
    if (Date.now() - (this.permissionDedup.get(dedupKey) ?? 0) < 30_000) return null;
    this.permissionDedup.set(dedupKey, Date.now());

    return this.handle({
      guild,
      type: 'permissionChange',
      targetId: newChannel.id,
      targetName: `canal #${newChannel.name}`,
      actorOverride: actor,
      severity: 'medium',
      details: 'Se modificaron los permisos del canal.',
      forceAlert: false,
    });
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.buckets) {
      if (timestamps.every((timestamp) => now - timestamp > 600_000)) this.buckets.delete(key);
    }
    for (const [key, timestamp] of this.permissionDedup) {
      if (now - timestamp > 600_000) this.permissionDedup.delete(key);
    }
  }

  lastActionAt() {
    return nowIso();
  }
}

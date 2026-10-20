// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionFlagsBits } from 'discord.js';
import { DANGEROUS_PERMISSIONS } from '../constants.js';
import { PermissionError, UserError } from './errors.js';

const PERMISSION_LABELS = Object.freeze({
  Administrator: 'Administrador',
  ManageGuild: 'Gestionar servidor',
  ManageRoles: 'Gestionar roles',
  ManageChannels: 'Gestionar canales',
  ManageWebhooks: 'Gestionar webhooks',
  KickMembers: 'Expulsar miembros',
  BanMembers: 'Banear miembros',
  MentionEveryone: 'Mencionar @everyone',
  ModerateMembers: 'Moderar miembros',
  ManageMessages: 'Gestionar mensajes',
  ViewAuditLog: 'Ver registro de auditoría',
  ViewChannel: 'Ver canales',
  SendMessages: 'Enviar mensajes',
  SendMessagesInThreads: 'Enviar mensajes en hilos',
  EmbedLinks: 'Insertar enlaces',
  ReadMessageHistory: 'Leer historial',
  AddReactions: 'Añadir reacciones',
  UseExternalEmojis: 'Usar emojis externos',
});

export function permissionLabel(permission) {
  for (const [name, bit] of Object.entries(PermissionFlagsBits)) {
    if (bit === permission) return PERMISSION_LABELS[name] ?? name;
  }
  return String(permission);
}

export function memberHas(member, permissions) {
  if (!member) return false;
  const list = Array.isArray(permissions) ? permissions : [permissions];
  return list.every((permission) => member.permissions.has(permission));
}

export function botHas(guild, permissions) {
  const me = guild?.members?.me;
  return memberHas(me, permissions);
}

export function assertMemberPermissions(member, permissions) {
  const list = Array.isArray(permissions) ? permissions : [permissions];
  if (!memberHas(member, list)) {
    throw new PermissionError(
      `Necesitas estos permisos: ${list.map(permissionLabel).join(', ')}.`,
    );
  }
}

export function assertBotPermissions(guild, permissions) {
  const list = Array.isArray(permissions) ? permissions : [permissions];
  if (!botHas(guild, list)) {
    throw new PermissionError(
      `A SecurityMoon le faltan estos permisos: ${list.map(permissionLabel).join(', ')}.`,
    );
  }
}

/**
 * Comprueba jerarquía y reglas básicas antes de sancionar.
 * @returns {{targetMember: import('discord.js').GuildMember|null}}
 */
export function canModerate({ guild, executor, targetUser, botMember = guild?.members?.me }) {
  if (!guild || !executor || !targetUser) {
    throw new UserError('No se pudo comprobar el objetivo de la sanción.');
  }
  if (targetUser.id === executor.id) {
    throw new UserError('No puedes aplicar esta acción sobre ti mismo.');
  }
  if (targetUser.id === guild.client.user?.id) {
    throw new UserError('No puedes sancionar a SecurityMoon.');
  }
  if (targetUser.id === guild.ownerId) {
    throw new UserError('No se puede sancionar al propietario del servidor.');
  }
  if (!botMember) {
    throw new PermissionError('No se pudo comprobar la jerarquía de SecurityMoon.');
  }

  const targetMember = guild.members.cache.get(targetUser.id) ?? null;
  if (!targetMember) {
    return { targetMember: null };
  }

  const isOwner = executor.id === guild.ownerId;
  if (!isOwner && executor.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
    throw new PermissionError('Tu rol más alto debe estar por encima del rol del objetivo.');
  }
  if (botMember.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
    throw new PermissionError('El rol de SecurityMoon debe estar por encima del rol del objetivo.');
  }
  return { targetMember };
}

export function hasDangerousPermissions(permissions) {
  return DANGEROUS_PERMISSIONS.some((name) => {
    const bit = PermissionFlagsBits[name];
    return bit !== undefined && permissions.has(bit, false);
  });
}

export function dangerousPermissionNames(permissions) {
  return DANGEROUS_PERMISSIONS.filter((name) => {
    const bit = PermissionFlagsBits[name];
    return bit !== undefined && permissions.has(bit, false);
  });
}

/** Comprueba si un miembro está en la lista de confianza o es el propietario. */
export function isTrustedMember(member, trusted) {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  if (!trusted) return false;
  if (trusted.users.some((entry) => entry.id === member.id)) return true;
  return trusted.roles.some((entry) => member.roles.cache.has(entry.id));
}

export function isExcludedChannel(channelId, settings) {
  return Boolean(channelId && settings?.exclusions?.channels?.includes(channelId));
}

/** Formatea una lista de permisos para embeds. */
export function formatPermissionList(permissions) {
  return permissions.map(permissionLabel).join(', ') || 'Ninguno';
}

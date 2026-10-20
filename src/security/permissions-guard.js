// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionFlagsBits, GuildVerificationLevel } from 'discord.js';
import { INVITE_PERMISSIONS, MODULE_KEYS, MODULES } from '../constants.js';
import { dangerousPermissionNames } from '../utils/permissions.js';
import { progressBar } from '../utils/embeds.js';

const REQUIRED_BOT_PERMISSIONS = Object.freeze([
  'ViewChannel',
  'SendMessages',
  'EmbedLinks',
  'ReadMessageHistory',
  'ManageMessages',
  'ManageRoles',
  'ManageChannels',
  'KickMembers',
  'BanMembers',
  'ModerateMembers',
  'ViewAuditLog',
  'ManageGuild',
]);

function gradeFor(score) {
  if (score >= 85) return 'Excelente';
  if (score >= 65) return 'Buena';
  if (score >= 40) return 'Mejorable';
  return 'Crítica';
}

/**
 * Diagnóstico de seguridad de un servidor. No modifica nada.
 * Acepta objetos de Discord o dobles de prueba.
 */
export function analyzeGuildSecurity({ guild, settings, trusted = null, botMember = null, incidentCount = 0 }) {
  const me = botMember ?? guild.members?.me ?? null;
  const recommendations = [];
  const checks = [];
  let score = 100;

  const missingPermissions = REQUIRED_BOT_PERMISSIONS.filter((name) => {
    const bit = PermissionFlagsBits[name];
    return bit !== undefined && !me?.permissions?.has(bit);
  });
  if (missingPermissions.length > 0) {
    score -= Math.min(50, missingPermissions.length * 5);
    checks.push({ level: 'critical', text: `Faltan ${missingPermissions.length} permisos al bot.` });
    recommendations.push({
      severity: 'critical',
      text: `Concede estos permisos a SecurityMoon: ${missingPermissions.join(', ')}.`,
    });
  } else {
    checks.push({ level: 'ok', text: 'SecurityMoon tiene los permisos esenciales.' });
  }

  const dangerousRoles = [];
  for (const role of guild.roles?.cache?.values?.() ?? []) {
    if (role.id === guild.id) continue;
    const dangerous = dangerousPermissionNames(role.permissions);
    if (dangerous.length > 0) {
      dangerousRoles.push({
        id: role.id,
        name: role.name,
        managed: role.managed,
        dangerous,
        position: role.position,
      });
    }
  }
  dangerousRoles.sort((a, b) => b.position - a.position);
  if (me?.roles?.highest && dangerousRoles.some((role) => role.position >= me.roles.highest.position)) {
    score -= 10;
    recommendations.push({
      severity: 'high',
      text: 'Mueve el rol de SecurityMoon por encima de los roles que debe moderar.',
    });
  }
  if (dangerousRoles.some((role) => role.dangerous.includes('Administrator'))) {
    score -= 10;
    recommendations.push({
      severity: 'high',
      text: 'Revisa los roles con Administrador y limita su cantidad al mínimo necesario.',
    });
  }
  if (dangerousRoles.length > 5) {
    score -= 5;
    recommendations.push({
      severity: 'medium',
      text: `Hay ${dangerousRoles.length} roles con permisos peligrosos. Aplica el principio de mínimo privilegio.`,
    });
  }

  const everyone = guild.roles?.everyone ?? guild.roles?.cache?.get(guild.id);
  const everyoneDangerous = everyone ? dangerousPermissionNames(everyone.permissions) : [];
  if (everyoneDangerous.length > 0) {
    score -= 25;
    checks.push({ level: 'critical', text: `@everyone tiene permisos peligrosos: ${everyoneDangerous.join(', ')}.` });
    recommendations.push({
      severity: 'critical',
      text: 'Retira permisos peligrosos de @everyone inmediatamente.',
    });
  }

  const disabledModules = MODULE_KEYS.filter((key) => !settings.modules?.[key]?.enabled);
  if (disabledModules.length > 0) {
    score -= disabledModules.length * 6;
    recommendations.push({
      severity: 'high',
      text: `Activa los módulos desactivados: ${disabledModules.map((key) => MODULES[key].name).join(', ')}.`,
    });
  } else {
    checks.push({ level: 'ok', text: 'Todos los módulos de seguridad están activos.' });
  }

  if (!settings.channels?.alerts) {
    score -= 8;
    recommendations.push({
      severity: 'high',
      text: 'Configura un canal de alertas con /setup o desde el panel de seguridad.',
    });
  } else {
    checks.push({ level: 'ok', text: 'Canal de alertas configurado.' });
  }
  if (!settings.channels?.logs) {
    score -= 5;
    recommendations.push({ severity: 'medium', text: 'Configura un canal de registros para conservar evidencia.' });
  }
  if (!settings.channels?.modlog) {
    score -= 3;
    recommendations.push({ severity: 'low', text: 'Configura un canal de moderación para auditar sanciones.' });
  }

  if (guild.verificationLevel !== undefined && guild.verificationLevel < GuildVerificationLevel.Medium) {
    score -= 8;
    recommendations.push({
      severity: 'medium',
      text: 'Sube el nivel de verificación del servidor al menos a Medio.',
    });
  }

  if (settings.emergency?.active) {
    checks.push({ level: 'warning', text: 'El modo emergencia está activo.' });
  }

  if (trusted) {
    const total = (trusted.users?.length ?? 0) + (trusted.roles?.length ?? 0);
    if (total > 30) {
      score -= 5;
      recommendations.push({
        severity: 'medium',
        text: `Hay ${total} usuarios/roles de confianza. Revisa que sigan siendo necesarios.`,
      });
    } else {
      checks.push({ level: 'ok', text: `${total} usuarios/roles de confianza configurados.` });
    }
  }

  if (incidentCount > 50) {
    recommendations.push({
      severity: 'low',
      text: 'Hay muchos incidentes registrados. Revisa /incident y exporta o limpia datos antiguos.',
    });
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    grade: gradeFor(score),
    bar: progressBar(score),
    missingPermissions,
    dangerousRoles,
    everyoneDangerous,
    checks,
    recommendations: recommendations.slice(0, 12),
    requiredPermissions: REQUIRED_BOT_PERMISSIONS,
    invitePermissions: INVITE_PERMISSIONS,
    incidentCount,
  };
}

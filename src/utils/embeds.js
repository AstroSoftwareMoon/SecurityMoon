// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { COLORS, EMOJI, PROJECT } from '../constants.js';

export function truncate(value, max = 1024) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Emojis para los nombres de campo más habituales. Se aplican de forma
 * centralizada para que todos los embeds mantengan el mismo estilo.
 */
const FIELD_EMOJIS = Object.freeze({
  usuario: '👤',
  usuarios: '👥',
  miembro: '👤',
  miembros: '👥',
  moderador: '🛡️',
  autor: '🛡️',
  motivo: '📝',
  razón: '📝',
  fecha: '📅',
  estado: '📡',
  resultado: '📡',
  caso: '🆔',
  id: '🆔',
  tipo: '🏷️',
  categoría: '🏷️',
  canal: '📣',
  canales: '📣',
  rol: '🎭',
  roles: '🎭',
  'roles peligrosos': '🎭',
  servidor: '🏠',
  versión: '🏷️',
  permisos: '🔑',
  'permisos del bot': '🔑',
  nivel: '🎚️',
  'nivel de protección': '🎚️',
  módulo: '🧩',
  módulos: '🧩',
  'módulos en este servidor': '🧩',
  uptime: '⏱️',
  memoria: '💾',
  ping: '📡',
  websocket: '📡',
  'respuesta api': '📡',
  latencia: '📡',
  enlace: '🔗',
  enlaces: '🔗',
  nombre: '🏷️',
  descripción: '📝',
  detalles: '📝',
  detalle: '📝',
  nota: '📝',
  notas: '📝',
  acción: '🎯',
  total: '📋',
  incidentes: '🚧',
  advertencias: '⚠️',
  advertencia: '⚠️',
  lista: '📋',
  listas: '📋',
  confianza: '🤝',
  webhook: '🔗',
  shards: '🧩',
  'node.js': '🟩',
  'discord.js': '💬',
  licencia: '📄',
  repositorio: '🐙',
  comunidad: '💬',
  invitación: '🔗',
  creador: '✨',
  bots: '🤖',
  creado: '📅',
  'se unió': '📅',
  apodo: '🏷️',
  banner: '🖼️',
  avatar: '🖼️',
  mensajes: '💬',
  duplicados: '♻️',
  menciones: '📣',
  emojis: '😄',
  archivos: '📎',
  tamaño: '📦',
  formato: '🧾',
  emisor: '🛡️',
  propietario: '👑',
  dueño: '👑',
  'canales eliminados': '🗑️',
  'roles eliminados': '🗑️',
  baneos: '🔨',
  expulsiones: '👢',
  'cambios de permisos': '🔑',
  'cuentas nuevas': '👶',
  'emergencia automática': '🚨',
  'bloquear invitaciones': '🔗',
  'borrar mensajes': '🧹',
  'puntuación sospechosa': '📊',
  'nivel de mejora': '💎',
  verificación: '✅',
  'en línea': '🟢',
  progreso: '📈',
  'última acción': '⚡',
  'siguientes pasos': '➡️',
  'validez': '⏳',
  'solicitado por': '🙋',
  'retención': '🗄️',
  'notificaciones del proyecto': '🔔',
  'protección': '🛡️',
  'confirmación': '✅',
  'secciones': '🧭',
  'privacidad': '🔐',
  'comandos relacionados': '🔗',
  'total registrado': '🧮',
  'avisos': '📣',
  'sanciones': '⚖️',
  'diagnóstico': '🔍',
  'actividad': '📈',
  'estadísticas': '📊',
  'servidores': '🏠',
  'plataforma': '🖥️',
  'modo emergencia': '🚨',
  'filtros': '🧹',
  'alcance': '🎯',
  'comando': '⌨️',
  'parámetros': '🎛️',
  'opciones': '🎛️',
  'ayuda': '❔',
});

function decorateFieldName(name) {
  const clean = String(name ?? '').trim();
  if (!clean || /^\p{Extended_Pictographic}/u.test(clean)) return clean;
  const base = clean.toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim();
  const emoji = FIELD_EMOJIS[base];
  return emoji ? `${emoji} ${clean}`.slice(0, 256) : clean;
}

export function baseEmbed({
  title,
  description,
  color = COLORS.brand,
  fields = [],
  footer = null,
  thumbnail = null,
  image = null,
  author = null,
} = {}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: footer ?? `${EMOJI.moon} ${PROJECT.name} • ${PROJECT.creator}` })
    .setTimestamp(new Date());
  if (title) embed.setTitle(truncate(title, 256));
  if (description) embed.setDescription(truncate(description, 4096));
  if (fields.length > 0) {
    embed.addFields(
      fields.slice(0, 25).map((field) => ({
        ...field,
        name: decorateFieldName(field.name),
      })),
    );
  }
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (author) embed.setAuthor(author);
  return embed;
}

export function successEmbed(title, description) {
  return baseEmbed({ title: `${EMOJI.success} ${title}`, description, color: COLORS.success });
}

export function errorEmbed(title, description) {
  return baseEmbed({ title: `${EMOJI.error} ${title}`, description, color: COLORS.danger });
}

export function warningEmbed(title, description) {
  return baseEmbed({ title: `${EMOJI.warning} ${title}`, description, color: COLORS.warning });
}

export function infoEmbed(title, description) {
  return baseEmbed({ title: `${EMOJI.info} ${title}`, description, color: COLORS.info });
}

export function moduleEmbed({ module, settings, extraFields = [] }) {
  const config = settings.modules[module.key];
  const status = config?.enabled ? `${EMOJI.success} Activo` : `${EMOJI.error} Desactivado`;
  const fields = [
    { name: '📡 Estado', value: status, inline: true },
    { name: '🎛️ Ajustes', value: truncate(describeModuleConfig(module.key, config), 1024), inline: false },
    ...extraFields,
  ];
  return baseEmbed({
    title: `${module.emoji} ${module.name}`,
    description: module.description,
    color: config?.enabled ? COLORS.brand : COLORS.muted,
    fields,
  });
}

export function describeModuleConfig(key, config) {
  if (!config) return 'Sin configuración.';
  switch (key) {
    case 'antiRaid':
      return [
        `👥 Umbral: **${config.joinThreshold}** entradas / **${config.joinIntervalSeconds}s**`,
        `🎯 Acción: **${config.action}**`,
        `⏱️ Enfriamiento: **${config.raidCooldownSeconds}s**`,
        `👶 Cuentas nuevas: **${config.minAccountAgeDays} días**`,
        `🚨 Emergencia automática: **${config.autoEmergency ? 'sí' : 'no'}**`,
      ].join('\n');
    case 'antiNuke':
      return [
        `🪟 Ventana: **${config.windowSeconds}s**`,
        `🗑️ Canales eliminados: **${config.thresholds.channelDelete}**`,
        `🎭 Roles eliminados: **${config.thresholds.roleDelete}**`,
        `🔨 Baneos: **${config.thresholds.ban}** · 👢 Expulsiones: **${config.thresholds.kick}**`,
        `🔑 Cambios de permisos: **${config.thresholds.permissionChange}**`,
        `🎯 Acción: **${config.action}**`,
      ].join('\n');
    case 'antiPhishing':
      return [
        `🎯 Acción: **${config.action}**`,
        `📊 Puntuación sospechosa: **${config.suspiciousScoreThreshold}**`,
        `🔗 Bloquear invitaciones: **${config.blockInvites ? 'sí' : 'no'}**`,
      ].join('\n');
    case 'antiSpam':
      return [
        `💬 Mensajes: **${config.messageThreshold} / ${config.messageWindowSeconds}s**`,
        `♻️ Duplicados: **${config.duplicateThreshold} / ${config.duplicateWindowSeconds}s**`,
        `📣 Menciones: **${config.mentionThreshold}** · 🔗 Enlaces: **${config.linkThreshold}**`,
        `🎯 Acción: **${config.action}** (escalado: **${config.escalate ? 'sí' : 'no'}**)`,
        `🧹 Borrar mensajes: **${config.deleteMessages ? 'sí' : 'no'}**`,
      ].join('\n');
    case 'permissionsGuard':
      return [
        `👑 Alertar permisos admin: **${config.alertOnAdminGrant ? 'sí' : 'no'}**`,
        `⚠️ Alertar roles peligrosos: **${config.alertOnDangerousRole ? 'sí' : 'no'}**`,
        `👤 Alertar rol admin a miembro: **${config.alertOnMemberAdminRole ? 'sí' : 'no'}**`,
      ].join('\n');
    default:
      return 'Sin configuración.';
  }
}

export function statusBadge(enabled) {
  return enabled ? `${EMOJI.success} Activo` : `${EMOJI.error} Desactivado`;
}

/** Fila de enlaces oficiales del proyecto. */
export function projectLinksRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Repositorio')
      .setEmoji(EMOJI.github)
      .setStyle(ButtonStyle.Link)
      .setURL(PROJECT.repository),
    new ButtonBuilder()
      .setLabel('GitHub')
      .setEmoji(EMOJI.github)
      .setStyle(ButtonStyle.Link)
      .setURL(PROJECT.github),
    new ButtonBuilder()
      .setLabel('Comunidad')
      .setEmoji(EMOJI.discord)
      .setStyle(ButtonStyle.Link)
      .setURL(PROJECT.discord),
  );
}

export function progressBar(score, length = 12) {
  const clamped = Math.max(0, Math.min(100, score));
  const filled = Math.round((clamped / 100) * length);
  return `${'█'.repeat(filled)}${'░'.repeat(length - filled)} ${clamped}/100`;
}

export function severityColor(severity) {
  switch (severity) {
    case 'critical':
      return COLORS.danger;
    case 'high':
      return 0xff7a45;
    case 'medium':
      return COLORS.warning;
    default:
      return COLORS.info;
  }
}

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  INCIDENT_EMOJI,
  MODULE_KEYS,
  MODULES,
  PROJECT,
  PROTECTION_PRESETS,
  SEVERITY_EMOJI,
} from '../constants.js';
import { baseEmbed, describeModuleConfig, progressBar, statusBadge, truncate } from './embeds.js';
import { analyzeGuildSecurity } from '../security/permissions-guard.js';
import { discordTimestamp } from './time.js';

export async function securitySnapshot(client, guild) {
  const [settings, trusted, filters, incidentsDocument] = await Promise.all([
    client.stores.guilds.get(guild.id),
    client.stores.trusted.get(guild.id),
    client.stores.filters.get(guild.id),
    client.stores.incidents.get(guild.id),
  ]);
  const analysis = analyzeGuildSecurity({
    guild,
    settings,
    trusted,
    incidentCount: incidentsDocument.incidents.length,
  });
  return { settings, trusted, filters, incidentsDocument, analysis };
}

export function moduleStatusLine(settings, key) {
  const module = MODULES[key];
  const config = settings.modules[key];
  return `${module.emoji} **${module.name}:** ${statusBadge(config.enabled)}`;
}

export function overviewEmbed(snapshot) {
  const { settings, trusted, filters, incidentsDocument, analysis } = snapshot;
  const recent = incidentsDocument.incidents.filter(
    (incident) => Date.now() - Date.parse(incident.createdAt) <= 86_400_000,
  ).length;
  const fields = [
    {
      name: '🛡️ Módulos',
      value: MODULE_KEYS.map((key) => moduleStatusLine(settings, key)).join('\n'),
      inline: false,
    },
    {
      name: '📣 Canales',
      value: [
        `Alertas: ${settings.channels.alerts ? `<#${settings.channels.alerts}>` : 'sin configurar'}`,
        `Registros: ${settings.channels.logs ? `<#${settings.channels.logs}>` : 'sin configurar'}`,
        `Moderación: ${settings.channels.modlog ? `<#${settings.channels.modlog}>` : 'sin configurar'}`,
      ].join('\n'),
      inline: true,
    },
    {
      name: '⚙️ Protección',
      value: [
        `🎚️ Nivel: **${PROTECTION_PRESETS[settings.protectionLevel]?.label ?? settings.protectionLevel}**`,
        `🤝 Confianza: **${trusted.users.length}** usuarios / **${trusted.roles.length}** roles`,
        `📋 Listas: **${filters.blacklist.domains.length}** negras / **${filters.whitelist.domains.length}** blancas`,
      ].join('\n'),
      inline: true,
    },
    {
      name: '📡 Estado',
      value: [
        settings.emergency.active ? '🚨 **Modo emergencia activo**' : '🌙 Sin emergencia',
        `🚧 Incidentes (24h): **${recent}**`,
        `🔍 Diagnóstico: **${analysis.score}/100** (${analysis.grade})`,
      ].join('\n'),
      inline: true,
    },
    {
      name: '📊 Diagnóstico rápido',
      value: progressBar(analysis.score),
      inline: false,
    },
  ];

  return baseEmbed({
    title: `🌙 ${PROJECT.name} — Centro de seguridad`,
    description:
      '🛡️ Panel de control del servidor. La configuración se guarda en archivos JSON y solo los administradores pueden modificarla.',
    color: settings.emergency.active ? 0xed4245 : 0x7c6cf5,
    fields,
    footer: `${PROJECT.name} • ${PROJECT.creator}`,
  });
}

export function moduleDetailEmbed(key, snapshot) {
  const { settings } = snapshot;
  const module = MODULES[key];
  const config = settings.modules[key];
  return baseEmbed({
    title: `${module.emoji} ${module.name}`,
    description: module.description,
    color: config.enabled ? 0x7c6cf5 : 0x9aa0b5,
    fields: [
      { name: '📡 Estado', value: statusBadge(config.enabled), inline: true },
      { name: '🎚️ Nivel de protección', value: PROTECTION_PRESETS[settings.protectionLevel]?.label ?? settings.protectionLevel, inline: true },
      { name: '🎛️ Ajustes actuales', value: truncate(describeModuleConfig(key, config), 1024), inline: false },
    ],
    footer: `${PROJECT.name} • ${PROJECT.creator}`,
  });
}

export function diagnosticsEmbed(analysis, { title = 'Diagnóstico de permisos' } = {}) {
  const dangerous = analysis.dangerousRoles
    .slice(0, 8)
    .map((role) => `• **${role.name}** — ${role.dangerous.join(', ')}${role.managed ? ' (gestionado)' : ''}`)
    .join('\n');
  const recommendations = analysis.recommendations
    .slice(0, 8)
    .map((item) => `• **${item.severity}:** ${item.text}`)
    .join('\n');
  return baseEmbed({
    title: `🔍 ${title}`,
    description: `Puntuación: **${analysis.score}/100** (${analysis.grade})\n${analysis.bar}`,
    color: analysis.score >= 65 ? 0x57f287 : analysis.score >= 40 ? 0xfee75c : 0xed4245,
    fields: [
      {
        name: '🔑 Permisos del bot',
        value:
          analysis.missingPermissions.length === 0
            ? '✅ Todos los permisos esenciales están presentes.'
            : `❌ Faltan: ${analysis.missingPermissions.join(', ')}`,
        inline: false,
      },
      {
        name: '👥 @everyone',
        value:
          analysis.everyoneDangerous.length === 0
            ? '✅ Sin permisos peligrosos.'
            : `⚠️ ${analysis.everyoneDangerous.join(', ')}`,
        inline: false,
      },
      {
        name: `🎭 Roles peligrosos (${analysis.dangerousRoles.length})`,
        value: truncate(dangerous || 'Ninguno detectado.', 1024),
        inline: false,
      },
      {
        name: '💡 Recomendaciones',
        value: truncate(recommendations || 'No hay recomendaciones pendientes.', 1024),
        inline: false,
      },
    ],
    footer: `${PROJECT.name} • ${PROJECT.creator}`,
  });
}

export function incidentsSummaryEmbed(incidents, { title = '📋 Incidentes recientes' } = {}) {
  return baseEmbed({
    title,
    color: 0x5865f2,
    description:
      incidents.length === 0
        ? 'No hay incidentes registrados.'
        : incidents
            .map(
              (incident) =>
                `**${INCIDENT_EMOJI[incident.type] ?? '📋'} #${incident.id} · ${incident.type} · ${SEVERITY_EMOJI[incident.severity] ?? '⚪'} ${incident.severity}** — ${discordTimestamp(incident.createdAt, 'R')}\n${truncate(incident.description, 160)}`,
            )
            .join('\n\n'),
    footer: `${PROJECT.name} • ${PROJECT.creator}`,
  });
}

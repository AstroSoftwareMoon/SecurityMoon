// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from 'discord.js';
import {
  INCIDENT_EMOJI,
  MODULE_KEYS,
  MODULES,
  NUKE_ACTIONS,
  PHISHING_ACTIONS,
  PROJECT,
  PROTECTION_PRESETS,
  RAID_ACTIONS,
  SEVERITY_EMOJI,
  SPAM_ACTIONS,
} from '../constants.js';
import {
  baseEmbed,
  describeModuleConfig,
  progressBar,
  statusBadge,
  truncate,
} from '../utils/embeds.js';
import {
  diagnosticsEmbed,
  incidentsSummaryEmbed,
  moduleDetailEmbed,
  overviewEmbed,
  securitySnapshot,
} from '../utils/security-view.js';
import { isSnowflake, isValidDomain, normalizeDomain } from '../storage/validation.js';
import { defaultGuildSettings } from '../storage/schemas.js';
import { nowIso, discordTimestamp } from '../utils/time.js';
import { UserError } from '../utils/errors.js';
import { safeUpdate } from '../utils/responses.js';
import {
  actionRow,
  denyPanel,
  hasPanelPermission,
  linkButton,
  panelButton,
  PANEL_FLAGS,
  parseBoolean,
  parseBooleanList,
  parseChoice,
  parseInteger,
  parseIntegerList,
  parseOptionalText,
  parseSnowflake,
  respondFromModal,
} from './shared.js';

const LIST_TYPES = Object.freeze(['blacklist', 'whitelist']);
const LIST_LABELS = Object.freeze({ blacklist: 'lista negra', whitelist: 'lista blanca' });

export async function openSecurityPanel(interaction) {
  if (!hasPanelPermission(interaction)) return denyPanel(interaction);
  const payload = await renderView(interaction, 'overview');
  return interaction.reply({ ...payload, flags: PANEL_FLAGS });
}

function noticeField(embed, notice) {
  if (notice) embed.addFields({ name: 'Última acción', value: truncate(notice, 1024), inline: false });
  return embed;
}

function backRow(backView = 'overview', { includeClose = true } = {}) {
  const components = [panelButton(`sm:panel:view:${backView}`, 'Volver', ButtonStyle.Secondary, { emoji: '↩️' })];
  if (includeClose) components.push(panelButton('sm:panel:close', 'Cerrar', ButtonStyle.Danger, { emoji: '✖️' }));
  return actionRow(...components);
}

function moduleSelect() {
  return new StringSelectMenuBuilder()
    .setCustomId('sm:panel:select:module')
    .setPlaceholder('Selecciona un módulo')
    .addOptions(
      MODULE_KEYS.map((key) => ({
        label: MODULES[key].name,
        value: key,
        description: truncate(MODULES[key].description, 100),
        emoji: MODULES[key].emoji,
        default: false,
      })),
    );
}

function presetSelect(settings) {
  return new StringSelectMenuBuilder()
    .setCustomId('sm:panel:select:preset')
    .setPlaceholder('Cambiar nivel de protección')
    .addOptions(
      Object.entries(PROTECTION_PRESETS).map(([level, preset]) => ({
        label: `${preset.emoji} ${preset.label}`,
        value: level,
        description: truncate(preset.description, 100),
        default: settings.protectionLevel === level,
      })),
    );
}

function channelSelect(customId, placeholder) {
  return new ChannelSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder.slice(0, 150))
    .setMinValues(1)
    .setMaxValues(1)
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
}

function textInput(customId, label, { value = '', placeholder = null, style = TextInputStyle.Short, required = true, maxLength = 200 } = {}) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label.slice(0, 45))
    .setStyle(style)
    .setRequired(required)
    .setMaxLength(maxLength);
  if (value !== null && value !== undefined && `${value}`.length > 0) input.setValue(`${value}`.slice(0, maxLength));
  if (placeholder) input.setPlaceholder(placeholder.slice(0, 100));
  return actionRow(input);
}

function moduleModal(key, config) {
  const modal = new ModalBuilder()
    .setCustomId(`sm:modal:module:${key}`)
    .setTitle(`Configurar ${MODULES[key].name}`.slice(0, 45));

  if (key === 'antiRaid') {
    modal.addComponents(
      textInput('threshold', 'Entradas necesarias (2-100)', { value: config.joinThreshold, placeholder: '8' }),
      textInput('interval', 'Intervalo en segundos (5-600)', { value: config.joinIntervalSeconds, placeholder: '60' }),
      textInput('action', `Acción: ${RAID_ACTIONS.join(', ')}`, { value: config.action }),
      textInput('min_account_age', 'Antigüedad mínima de cuenta (días 0-365)', { value: config.minAccountAgeDays }),
      textInput('auto_emergency', 'Emergencia automática (sí/no)', { value: config.autoEmergency ? 'sí' : 'no' }),
    );
  } else if (key === 'antiNuke') {
    modal.addComponents(
      textInput('window', 'Ventana en segundos (10-600)', { value: config.windowSeconds }),
      textInput('channels', 'Canales eliminados, creados (ej. 3,6)', {
        value: `${config.thresholds.channelDelete},${config.thresholds.channelCreate}`,
      }),
      textInput('roles', 'Roles eliminados, creados (ej. 3,6)', {
        value: `${config.thresholds.roleDelete},${config.thresholds.roleCreate}`,
      }),
      textInput('moderation', 'Baneos, expulsiones, permisos (ej. 3,3,2)', {
        value: `${config.thresholds.ban},${config.thresholds.kick},${config.thresholds.permissionChange}`,
      }),
      textInput('action', `Acción: ${NUKE_ACTIONS.join(', ')}`, { value: config.action }),
    );
  } else if (key === 'antiPhishing') {
    modal.addComponents(
      textInput('threshold', 'Puntuación sospechosa (1-10)', { value: config.suspiciousScoreThreshold }),
      textInput('action', `Acción: ${PHISHING_ACTIONS.join(', ')}`, { value: config.action }),
      textInput('block_invites', 'Bloquear invitaciones de Discord (sí/no)', {
        value: config.blockInvites ? 'sí' : 'no',
      }),
    );
  } else if (key === 'antiSpam') {
    modal.addComponents(
      textInput('rate', 'Mensajes, ventana en segundos (ej. 6,10)', {
        value: `${config.messageThreshold},${config.messageWindowSeconds}`,
      }),
      textInput('duplicates', 'Duplicados, ventana en segundos (ej. 3,30)', {
        value: `${config.duplicateThreshold},${config.duplicateWindowSeconds}`,
      }),
      textInput('limits', 'Menciones, enlaces, emojis (ej. 6,4,15)', {
        value: `${config.mentionThreshold},${config.linkThreshold},${config.emojiThreshold}`,
      }),
      textInput('action', `Acción: ${SPAM_ACTIONS.join(', ')}`, { value: config.action }),
      textInput('options', 'Escalar, borrar mensajes (sí/no, sí/no)', {
        value: `${config.escalate ? 'sí' : 'no'},${config.deleteMessages ? 'sí' : 'no'}`,
      }),
    );
  } else {
    modal.addComponents(
      textInput('alert_admin', 'Alertar permisos admin (sí/no)', {
        value: config.alertOnAdminGrant ? 'sí' : 'no',
      }),
      textInput('alert_dangerous', 'Alertar roles peligrosos (sí/no)', {
        value: config.alertOnDangerousRole ? 'sí' : 'no',
      }),
      textInput('alert_member', 'Alertar rol admin a miembro (sí/no)', {
        value: config.alertOnMemberAdminRole ? 'sí' : 'no',
      }),
    );
  }
  return modal;
}

async function renderOverview(interaction, notice = null) {
  const snapshot = await securitySnapshot(interaction.client, interaction.guild);
  const embed = noticeField(overviewEmbed(snapshot), notice);
  const components = [
    actionRow(
      panelButton('sm:panel:view:modules', 'Módulos', ButtonStyle.Primary, { emoji: '🛡️' }),
      panelButton('sm:panel:view:diagnostics', 'Diagnóstico', ButtonStyle.Secondary, { emoji: '🔍' }),
      panelButton('sm:panel:view:settings', 'Ajustes', ButtonStyle.Secondary, { emoji: '⚙️' }),
      panelButton('sm:panel:view:incidents', 'Incidentes', ButtonStyle.Secondary, { emoji: '📋' }),
      panelButton('sm:panel:view:trusted', 'Confianza', ButtonStyle.Secondary, { emoji: '✅' }),
    ),
    actionRow(
      panelButton('sm:panel:view:lists', 'Listas', ButtonStyle.Secondary, { emoji: '📋' }),
      panelButton('sm:panel:view:help', 'Ayuda', ButtonStyle.Secondary, { emoji: '❔' }),
      panelButton('sm:panel:refresh', 'Actualizar', ButtonStyle.Secondary, { emoji: '🔄' }),
      panelButton(
        snapshot.settings.emergency.active ? 'sm:panel:emergency:deactivate' : 'sm:panel:emergency:activate',
        snapshot.settings.emergency.active ? 'Desactivar emergencia' : 'Activar emergencia',
        snapshot.settings.emergency.active ? ButtonStyle.Success : ButtonStyle.Danger,
        { emoji: '🚨' },
      ),
      panelButton('sm:panel:close', 'Cerrar', ButtonStyle.Danger, { emoji: '✖️' }),
    ),
  ];
  return { embeds: [embed], components };
}

async function renderModules(interaction, notice = null) {
  const settings = await interaction.client.stores.guilds.get(interaction.guild.id);
  const lines = MODULE_KEYS.map((key) => {
    const module = MODULES[key];
    const config = settings.modules[key];
    return `${module.emoji} **${module.name}** — ${statusBadge(config.enabled)}\n> ${truncate(describeModuleConfig(key, config).replace(/\n/g, ' · '), 180)}`;
  });
  const embed = baseEmbed({
    title: '🛡️ Módulos de seguridad',
    description: `Selecciona un módulo para revisar y cambiar sus ajustes.\n\n${lines.join('\n\n')}`,
    color: 0x7c6cf5,
  });
  noticeField(embed, notice);
  return {
    embeds: [embed],
    components: [actionRow(moduleSelect()), backRow('overview')],
  };
}

async function renderModule(interaction, key, notice = null) {
  if (!MODULE_KEYS.includes(key)) return renderModules(interaction, 'El módulo solicitado no existe.');
  const settings = await interaction.client.stores.guilds.get(interaction.guild.id);
  const embed = noticeField(moduleDetailEmbed(key, { settings }), notice);
  const components = [
    actionRow(
      panelButton(
        `sm:panel:toggle:${key}`,
        settings.modules[key].enabled ? 'Desactivar' : 'Activar',
        settings.modules[key].enabled ? ButtonStyle.Danger : ButtonStyle.Success,
        { emoji: settings.modules[key].enabled ? '⛔' : '✅' },
      ),
      panelButton(`sm:panel:configure:${key}`, 'Configurar', ButtonStyle.Primary, { emoji: '⚙️' }),
      panelButton(`sm:panel:reset:${key}`, 'Restablecer', ButtonStyle.Secondary, { emoji: '♻️' }),
    ),
    actionRow(
      panelButton('sm:panel:view:modules', 'Módulos', ButtonStyle.Secondary, { emoji: '↩️' }),
      panelButton('sm:panel:view:overview', 'Panel', ButtonStyle.Secondary, { emoji: '🌙' }),
      panelButton('sm:panel:close', 'Cerrar', ButtonStyle.Danger, { emoji: '✖️' }),
    ),
  ];
  return { embeds: [embed], components };
}

async function renderSettings(interaction, notice = null) {
  const settings = await interaction.client.stores.guilds.get(interaction.guild.id);
  const channels = settings.channels;
  const embed = baseEmbed({
    title: '⚙️ Ajustes generales',
    description: 'Canales, nivel de protección, retención y notificaciones del proyecto.',
    color: 0x7c6cf5,
    fields: [
      {
        name: 'Canales',
        value: [
          `Alertas: ${channels.alerts ? `<#${channels.alerts}>` : 'sin configurar'}`,
          `Registros: ${channels.logs ? `<#${channels.logs}>` : 'sin configurar'}`,
          `Moderación: ${channels.modlog ? `<#${channels.modlog}>` : 'sin configurar'}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Protección',
        value: `${PROTECTION_PRESETS[settings.protectionLevel]?.emoji ?? ''} **${PROTECTION_PRESETS[settings.protectionLevel]?.label ?? settings.protectionLevel}**\n${progressBar(settings.protectionLevel === 'extreme' ? 100 : settings.protectionLevel === 'high' ? 75 : settings.protectionLevel === 'medium' ? 50 : 25)}`,
        inline: false,
      },
      {
        name: 'Retención',
        value: [
          `Incidentes: **${settings.retention.incidentsDays} días** / máximo **${settings.retention.maxIncidents}**`,
          `Advertencias: **${settings.retention.warningsDays} días** / máximo **${settings.retention.maxWarnings}**`,
          `Casos: **${settings.retention.casesDays} días** / máximo **${settings.retention.maxCases}**`,
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Notificaciones del proyecto',
        value: settings.notifications.projectUpdates
          ? '✅ Activadas (solo se envían actualizaciones reales del repositorio).'
          : '⛔ Desactivadas. El bot no enviará promociones.',
        inline: false,
      },
    ],
  });
  noticeField(embed, notice);

  const alertChannel = channels.alerts
    ? interaction.guild.channels.cache.get(channels.alerts)
    : null;
  const logChannel = channels.logs ? interaction.guild.channels.cache.get(channels.logs) : null;
  const modlogChannel = channels.modlog
    ? interaction.guild.channels.cache.get(channels.modlog)
    : null;

  const components = [
    actionRow(presetSelect(settings)),
    actionRow(
      channelSelect(
        'sm:panel:channel:alerts',
        alertChannel ? `Alertas: #${alertChannel.name}` : 'Canal de alertas',
      ),
    ),
    actionRow(
      channelSelect(
        'sm:panel:channel:logs',
        logChannel ? `Registros: #${logChannel.name}` : 'Canal de registros',
      ),
    ),
    actionRow(
      channelSelect(
        'sm:panel:channel:modlog',
        modlogChannel ? `Moderación: #${modlogChannel.name}` : 'Canal de moderación',
      ),
    ),
    actionRow(
      panelButton('sm:panel:retention', 'Retención de datos', ButtonStyle.Secondary, { emoji: '🗂️' }),
      panelButton('sm:panel:notify', settings.notifications.projectUpdates ? 'Desactivar avisos' : 'Activar avisos', ButtonStyle.Secondary, { emoji: '🔔' }),
      panelButton('sm:panel:view:overview', 'Volver', ButtonStyle.Secondary, { emoji: '↩️' }),
      panelButton('sm:panel:close', 'Cerrar', ButtonStyle.Danger, { emoji: '✖️' }),
    ),
  ];
  return { embeds: [embed], components };
}

async function renderIncidents(interaction, { notice = null, confirm = false } = {}) {
  const incidents = await interaction.client.incidents.list(interaction.guild.id, { limit: 10 });
  const document = await interaction.client.stores.incidents.get(interaction.guild.id);
  const embed = incidentsSummaryEmbed(incidents, { title: '📋 Incidentes recientes' });
  embed.addFields({
    name: 'Total registrado',
    value: `${document.incidents.length} incidentes. Los datos se conservan según la retención configurada.`,
    inline: false,
  });
  noticeField(embed, notice);
  if (confirm) {
    embed.addFields({
      name: 'Confirmación',
      value: 'Pulsa **Confirmar limpieza** para borrar todos los incidentes. Se crea una copia de seguridad JSON antes de escribir.',
      inline: false,
    });
  }

  const components = [];
  if (incidents.length > 0) {
    components.push(
      actionRow(
        new StringSelectMenuBuilder()
          .setCustomId('sm:panel:select:incident')
          .setPlaceholder('Ver detalle de un incidente')
          .addOptions(
            incidents.map((incident) => ({
              label: `${INCIDENT_EMOJI[incident.type] ?? '📋'} #${incident.id} · ${incident.type}`.slice(0, 100),
              value: String(incident.id),
              description: truncate(
                `${SEVERITY_EMOJI[incident.severity] ?? '⚪'} ${incident.severity} · ${incident.description}`,
                100,
              ),
              emoji: SEVERITY_EMOJI[incident.severity] ?? 'ℹ️',
            })),
          ),
      ),
    );
  }

  const actionButtons = confirm
    ? [
        panelButton('sm:panel:incidents:clear_confirm', 'Confirmar limpieza', ButtonStyle.Danger, { emoji: '🗑️' }),
        panelButton('sm:panel:view:incidents', 'Cancelar', ButtonStyle.Secondary, { emoji: '❌' }),
        panelButton('sm:panel:view:overview', 'Panel', ButtonStyle.Secondary, { emoji: '🌙' }),
      ]
    : [
        panelButton('sm:panel:view:incidents', 'Actualizar', ButtonStyle.Secondary, { emoji: '🔄' }),
        panelButton('sm:panel:incidents:clear', 'Limpiar', ButtonStyle.Danger, { emoji: '🗑️', disabled: incidents.length === 0 }),
        panelButton('sm:panel:view:overview', 'Volver', ButtonStyle.Secondary, { emoji: '↩️' }),
        panelButton('sm:panel:close', 'Cerrar', ButtonStyle.Danger, { emoji: '✖️' }),
      ];
  components.push(actionRow(...actionButtons));
  return { embeds: [embed], components };
}

async function renderIncident(interaction, incidentId) {
  const id = Number.parseInt(incidentId, 10);
  const incident = Number.isInteger(id)
    ? await interaction.client.incidents.get(interaction.guild.id, id)
    : null;
  if (!incident) return renderIncidents(interaction, { notice: 'El incidente solicitado ya no existe.' });
  const embed = baseEmbed({
    title: `${INCIDENT_EMOJI[incident.type] ?? '📋'} Incidente #${incident.id} · ${incident.type}`,
    description: truncate(incident.description, 3500),
    color:
      incident.severity === 'critical'
        ? 0xed4245
        : incident.severity === 'high'
          ? 0xff7a45
          : incident.severity === 'medium'
            ? 0xfee75c
            : 0x5865f2,
    fields: [
      {
        name: 'Gravedad',
        value: `${SEVERITY_EMOJI[incident.severity] ?? '⚪'} ${incident.severity}`,
        inline: true,
      },
      { name: 'Fecha', value: discordTimestamp(incident.createdAt, 'f'), inline: true },
      { name: 'Usuario', value: incident.userId ? `<@${incident.userId}>` : '—', inline: true },
      { name: 'Autor', value: incident.actorId ? `<@${incident.actorId}>` : '—', inline: true },
      { name: 'Acción', value: truncate(incident.action ?? '—', 1024), inline: false },
      { name: 'Resultado', value: truncate(incident.result ?? '—', 1024), inline: false },
      ...(incident.details
        ? [{ name: 'Detalles', value: truncate(incident.details, 1024), inline: false }]
        : []),
      ...(incident.urls?.length
        ? [{ name: 'Enlaces', value: truncate(incident.urls.map((url) => `<${url}>`).join('\n'), 1024), inline: false }]
        : []),
    ],
  });
  return {
    embeds: [embed],
    components: [
      actionRow(
        panelButton('sm:panel:view:incidents', 'Incidentes', ButtonStyle.Secondary, { emoji: '↩️' }),
        panelButton('sm:panel:view:overview', 'Panel', ButtonStyle.Secondary, { emoji: '🌙' }),
        panelButton('sm:panel:close', 'Cerrar', ButtonStyle.Danger, { emoji: '✖️' }),
      ),
    ],
  };
}

async function renderDiagnostics(interaction) {
  const snapshot = await securitySnapshot(interaction.client, interaction.guild);
  const embed = diagnosticsEmbed(snapshot.analysis);
  const components = [
    actionRow(
      panelButton('sm:panel:view:diagnostics', 'Actualizar', ButtonStyle.Secondary, { emoji: '🔄' }),
      panelButton('sm:panel:view:modules', 'Módulos', ButtonStyle.Secondary, { emoji: '🛡️' }),
      panelButton('sm:panel:view:settings', 'Ajustes', ButtonStyle.Secondary, { emoji: '⚙️' }),
      panelButton('sm:panel:view:overview', 'Volver', ButtonStyle.Secondary, { emoji: '↩️' }),
      panelButton('sm:panel:close', 'Cerrar', ButtonStyle.Danger, { emoji: '✖️' }),
    ),
  ];
  return { embeds: [embed], components };
}

async function renderTrusted(interaction, notice = null) {
  const trusted = await interaction.client.stores.trusted.get(interaction.guild.id);
  const users = trusted.users
    .slice(0, 15)
    .map((entry) => `<@${entry.id}>${entry.note ? ` — ${truncate(entry.note, 80)}` : ''}`);
  const roles = trusted.roles
    .slice(0, 15)
    .map((entry) => `<@&${entry.id}>${entry.note ? ` — ${truncate(entry.note, 80)}` : ''}`);
  const embed = baseEmbed({
    title: '✅ Usuarios y roles de confianza',
    description:
      'Las entradas de confianza quedan excluidas de los módulos Anti-Raid, Anti-Spam y Anti-Phishing. El propietario del servidor siempre está excluido.',
    color: 0x57f287,
    fields: [
      {
        name: `Usuarios (${trusted.users.length})`,
        value: truncate(users.join('\n') || 'Ninguno configurado.', 1024),
        inline: false,
      },
      {
        name: `Roles (${trusted.roles.length})`,
        value: truncate(roles.join('\n') || 'Ninguno configurado.', 1024),
        inline: false,
      },
    ],
  });
  noticeField(embed, notice);

  const components = [
    actionRow(
      new UserSelectMenuBuilder()
        .setCustomId('sm:panel:trusted:add_user_select')
        .setPlaceholder('Añadir un usuario de confianza')
        .setMinValues(1)
        .setMaxValues(1),
    ),
    actionRow(
      new RoleSelectMenuBuilder()
        .setCustomId('sm:panel:trusted:add_role_select')
        .setPlaceholder('Añadir un rol de confianza')
        .setMinValues(1)
        .setMaxValues(1),
    ),
  ];
  const entries = [
    ...trusted.users.map((entry) => ({ value: `user:${entry.id}`, label: `Usuario ${entry.id}` })),
    ...trusted.roles.map((entry) => ({ value: `role:${entry.id}`, label: `Rol ${entry.id}` })),
  ].slice(0, 25);
  if (entries.length > 0) {
    components.push(
      actionRow(
        new StringSelectMenuBuilder()
          .setCustomId('sm:panel:select:trusted_remove')
          .setPlaceholder('Quitar una entrada de confianza')
          .addOptions(
            entries.map((entry) => ({
              label: entry.label.slice(0, 100),
              value: entry.value,
              description: 'Eliminar de la lista de confianza',
            })),
          ),
      ),
    );
  }
  components.push(
    actionRow(
      panelButton('sm:panel:trusted:add_user', 'Añadir por ID', ButtonStyle.Secondary, { emoji: '➕' }),
      panelButton('sm:panel:view:overview', 'Volver', ButtonStyle.Secondary, { emoji: '↩️' }),
      panelButton('sm:panel:close', 'Cerrar', ButtonStyle.Danger, { emoji: '✖️' }),
    ),
  );
  return { embeds: [embed], components };
}

async function renderLists(interaction, notice = null) {
  const filters = await interaction.client.stores.filters.get(interaction.guild.id);
  const format = (entries) =>
    entries.length === 0
      ? 'Sin dominios.'
      : truncate(entries.slice(-12).map((entry) => `\`${entry.value}\``).join(', '), 1024);
  const embed = baseEmbed({
    title: '📋 Listas de dominios',
    description: 'La lista negra bloquea siempre. La lista blanca excluye un dominio del análisis heurístico.',
    color: 0x7c6cf5,
    fields: [
      { name: `Lista negra (${filters.blacklist.domains.length})`, value: format(filters.blacklist.domains), inline: false },
      { name: `Lista blanca (${filters.whitelist.domains.length})`, value: format(filters.whitelist.domains), inline: false },
    ],
  });
  noticeField(embed, notice);
  const components = [
    actionRow(
      panelButton('sm:panel:list:add:blacklist', 'Añadir a negra', ButtonStyle.Danger, { emoji: '⛔' }),
      panelButton('sm:panel:list:add:whitelist', 'Añadir a blanca', ButtonStyle.Success, { emoji: '✅' }),
      panelButton('sm:panel:list:remove:blacklist', 'Quitar de negra', ButtonStyle.Secondary, { emoji: '➖' }),
      panelButton('sm:panel:list:remove:whitelist', 'Quitar de blanca', ButtonStyle.Secondary, { emoji: '➖' }),
    ),
    actionRow(
      panelButton('sm:panel:view:overview', 'Volver', ButtonStyle.Secondary, { emoji: '↩️' }),
      panelButton('sm:panel:close', 'Cerrar', ButtonStyle.Danger, { emoji: '✖️' }),
    ),
  ];
  return { embeds: [embed], components };
}

async function renderHelp() {
  const embed = baseEmbed({
    title: '❔ Ayuda del panel',
    description: 'El panel permite administrar la seguridad del servidor sin escribir comandos.',
    color: 0x5865f2,
    fields: [
      {
        name: 'Secciones',
        value: [
          '🛡️ **Módulos:** activa y configura Anti-Raid, Anti-Nuke, Anti-Phishing, Anti-Spam y protección de permisos.',
          '🔍 **Diagnóstico:** revisa permisos, roles peligrosos y recomendaciones.',
          '⚙️ **Ajustes:** canales, nivel de protección, retención y notificaciones.',
          '📋 **Incidentes:** consulta y limpia el historial con confirmación.',
          '✅ **Confianza:** excluye usuarios y roles de los módulos automáticos.',
          '📋 **Listas:** gestiona dominios bloqueados y permitidos.',
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Comandos relacionados',
        value: '`/security` · `/securitycheck` · `/permissions` · `/setup` · `/config` · `/help`',
        inline: false,
      },
      {
        name: 'Privacidad',
        value: 'Los datos se guardan en archivos JSON del servidor donde se ejecuta el bot. No se envían a servicios externos.',
        inline: false,
      },
    ],
  });
  return {
    embeds: [embed],
    components: [
      actionRow(
        linkButton('Repositorio', PROJECT.repository, { emoji: '🐙' }),
        linkButton('Comunidad', PROJECT.discord, { emoji: '💬' }),
        panelButton('sm:panel:view:overview', 'Volver', ButtonStyle.Secondary, { emoji: '↩️' }),
        panelButton('sm:panel:close', 'Cerrar', ButtonStyle.Danger, { emoji: '✖️' }),
      ),
    ],
  };
}

async function renderView(interaction, view, options = {}) {
  if (view.startsWith('module:')) return renderModule(interaction, view.slice(7), options.notice ?? null);
  if (view.startsWith('incident:')) return renderIncident(interaction, view.slice(9));
  switch (view) {
    case 'modules':
      return renderModules(interaction, options.notice ?? null);
    case 'settings':
      return renderSettings(interaction, options.notice ?? null);
    case 'incidents':
      return renderIncidents(interaction, options);
    case 'diagnostics':
      return renderDiagnostics(interaction);
    case 'trusted':
      return renderTrusted(interaction, options.notice ?? null);
    case 'lists':
      return renderLists(interaction, options.notice ?? null);
    case 'help':
      return renderHelp();
    case 'overview':
    default:
      return renderOverview(interaction, options.notice ?? null);
  }
}

async function updateView(interaction, view, options = {}) {
  const payload = await renderView(interaction, view, options);
  return safeUpdate(interaction, payload);
}

function retentionModal(settings) {
  return new ModalBuilder()
    .setCustomId('sm:modal:retention')
    .setTitle('Retención de datos')
    .addComponents(
      textInput('incidents_days', 'Días de incidentes (1-3650)', { value: settings.retention.incidentsDays }),
      textInput('incidents_max', 'Máximo de incidentes (50-5000)', { value: settings.retention.maxIncidents }),
      textInput('warnings_days', 'Días de advertencias (1-3650)', { value: settings.retention.warningsDays }),
      textInput('warnings_max', 'Máximo de advertencias (50-5000)', { value: settings.retention.maxWarnings }),
      textInput('cases_days', 'Días de casos (1-3650)', { value: settings.retention.casesDays }),
    );
}

function listModal(action, list) {
  const modal = new ModalBuilder()
    .setCustomId(`sm:modal:list:${action}:${list}`)
    .setTitle(`${action === 'add' ? 'Añadir a' : 'Quitar de'} la ${LIST_LABELS[list]}`.slice(0, 45));
  if (action === 'add') {
    modal.addComponents(
      textInput('domain', 'Dominio (sin protocolo)', { placeholder: 'ejemplo.com' }),
      textInput('reason', 'Motivo (opcional)', { required: false, placeholder: 'Dominio oficial del servidor' }),
    );
  } else {
    modal.addComponents(textInput('domain', 'Dominio a eliminar', { placeholder: 'ejemplo.com' }));
  }
  return modal;
}

function trustedModal(kind) {
  return new ModalBuilder()
    .setCustomId(`sm:modal:trusted:${kind}`)
    .setTitle(kind === 'user' ? 'Añadir usuario de confianza' : 'Añadir rol de confianza')
    .addComponents(
      textInput(kind === 'user' ? 'user_id' : 'role_id', `ID del ${kind === 'user' ? 'usuario' : 'rol'}`, {
        placeholder: '123456789012345678',
      }),
      textInput('note', 'Nota (opcional)', { required: false, placeholder: 'Staff de confianza' }),
    );
}

async function addListEntry(interaction, list, domain, reason) {
  const clean = normalizeDomain(domain);
  if (!isValidDomain(clean)) throw new UserError('El dominio no es válido. Usa un formato como ejemplo.com.');
  const filters = await interaction.client.stores.filters.get(interaction.guild.id);
  if (filters[list].domains.some((entry) => entry.value === clean)) {
    throw new UserError(`El dominio \`${clean}\` ya está en la ${LIST_LABELS[list]}.`);
  }
  await interaction.client.stores.filters.update(interaction.guild.id, (document) => {
    document[list].domains.push({
      value: clean,
      addedBy: interaction.user.id,
      addedAt: nowIso(),
      reason: reason || null,
    });
    return document;
  });
  interaction.client.logger.info('Dominio añadido a una lista', {
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    list,
    domain: clean,
  });
  return `Dominio \`${clean}\` añadido a la ${LIST_LABELS[list]}.`;
}

async function removeListEntry(interaction, list, domain) {
  const clean = normalizeDomain(domain);
  const filters = await interaction.client.stores.filters.get(interaction.guild.id);
  if (!filters[list].domains.some((entry) => entry.value === clean)) {
    throw new UserError(`El dominio \`${clean}\` no está en la ${LIST_LABELS[list]}.`);
  }
  await interaction.client.stores.filters.update(interaction.guild.id, (document) => {
    document[list].domains = document[list].domains.filter((entry) => entry.value !== clean);
    return document;
  });
  return `Dominio \`${clean}\` eliminado de la ${LIST_LABELS[list]}.`;
}

async function handleModuleModal(interaction, key) {
  if (!MODULE_KEYS.includes(key)) throw new UserError('Módulo desconocido.');
  const fields = interaction.fields;
  let notice;

  if (key === 'antiRaid') {
    const joinThreshold = parseInteger(fields, 'threshold', { min: 2, max: 100, label: 'Entradas necesarias' });
    const joinIntervalSeconds = parseInteger(fields, 'interval', { min: 5, max: 600, label: 'Intervalo' });
    const action = parseChoice(fields, 'action', RAID_ACTIONS, { label: 'Acción' });
    const minAccountAgeDays = parseInteger(fields, 'min_account_age', {
      min: 0,
      max: 365,
      label: 'Antigüedad mínima',
    });
    const autoEmergency = parseBoolean(fields, 'auto_emergency', { label: 'Emergencia automática' });
    await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
      Object.assign(document.modules.antiRaid, {
        joinThreshold,
        joinIntervalSeconds,
        action,
        minAccountAgeDays,
        autoEmergency,
      });
      return document;
    });
    notice = `Anti-Raid actualizado: ${joinThreshold} entradas / ${joinIntervalSeconds}s, acción **${action}**.`;
  } else if (key === 'antiNuke') {
    const windowSeconds = parseInteger(fields, 'window', { min: 10, max: 600, label: 'Ventana' });
    const [channelDelete, channelCreate] = parseIntegerList(fields, 'channels', [
      { min: 1, max: 25 },
      { min: 1, max: 25 },
    ], { label: 'Canales' });
    const [roleDelete, roleCreate] = parseIntegerList(fields, 'roles', [
      { min: 1, max: 25 },
      { min: 1, max: 25 },
    ], { label: 'Roles' });
    const [ban, kick, permissionChange] = parseIntegerList(fields, 'moderation', [
      { min: 1, max: 25 },
      { min: 1, max: 25 },
      { min: 1, max: 25 },
    ], { label: 'Moderación' });
    const action = parseChoice(fields, 'action', NUKE_ACTIONS, { label: 'Acción' });
    await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
      document.modules.antiNuke.windowSeconds = windowSeconds;
      Object.assign(document.modules.antiNuke.thresholds, {
        channelDelete,
        channelCreate,
        roleDelete,
        roleCreate,
        ban,
        kick,
        permissionChange,
      });
      document.modules.antiNuke.action = action;
      return document;
    });
    notice = `Anti-Nuke actualizado: ventana de ${windowSeconds}s, acción **${action}**.`;
  } else if (key === 'antiPhishing') {
    const suspiciousScoreThreshold = parseInteger(fields, 'threshold', {
      min: 1,
      max: 10,
      label: 'Puntuación',
    });
    const action = parseChoice(fields, 'action', PHISHING_ACTIONS, { label: 'Acción' });
    const blockInvites = parseBoolean(fields, 'block_invites', { label: 'Bloquear invitaciones' });
    await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
      Object.assign(document.modules.antiPhishing, {
        suspiciousScoreThreshold,
        action,
        blockInvites,
      });
      return document;
    });
    notice = `Anti-Phishing actualizado: umbral ${suspiciousScoreThreshold}, acción **${action}**.`;
  } else if (key === 'antiSpam') {
    const [messageThreshold, messageWindowSeconds] = parseIntegerList(fields, 'rate', [
      { min: 2, max: 30 },
      { min: 3, max: 120 },
    ], { label: 'Mensajes y ventana' });
    const [duplicateThreshold, duplicateWindowSeconds] = parseIntegerList(fields, 'duplicates', [
      { min: 2, max: 15 },
      { min: 5, max: 300 },
    ], { label: 'Duplicados' });
    const [mentionThreshold, linkThreshold, emojiThreshold] = parseIntegerList(fields, 'limits', [
      { min: 2, max: 30 },
      { min: 2, max: 15 },
      { min: 5, max: 50 },
    ], { label: 'Límites' });
    const action = parseChoice(fields, 'action', SPAM_ACTIONS, { label: 'Acción' });
    const [escalate, deleteMessages] = parseBooleanList(fields, 'options', 2, { label: 'Opciones' });
    await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
      Object.assign(document.modules.antiSpam, {
        messageThreshold,
        messageWindowSeconds,
        duplicateThreshold,
        duplicateWindowSeconds,
        mentionThreshold,
        linkThreshold,
        emojiThreshold,
        action,
        escalate,
        deleteMessages,
      });
      return document;
    });
    notice = `Anti-Spam actualizado: ${messageThreshold} mensajes / ${messageWindowSeconds}s, acción **${action}**.`;
  } else {
    const alertOnAdminGrant = parseBoolean(fields, 'alert_admin', { label: 'Alertar permisos admin' });
    const alertOnDangerousRole = parseBoolean(fields, 'alert_dangerous', { label: 'Alertar roles peligrosos' });
    const alertOnMemberAdminRole = parseBoolean(fields, 'alert_member', { label: 'Alertar rol admin a miembro' });
    await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
      Object.assign(document.modules.permissionsGuard, {
        alertOnAdminGrant,
        alertOnDangerousRole,
        alertOnMemberAdminRole,
      });
      return document;
    });
    notice = 'Protección de permisos actualizada.';
  }

  interaction.client.logger.info('Módulo configurado desde el panel', {
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    module: key,
  });
  return respondFromModal(interaction, await renderModule(interaction, key, notice));
}

async function handleRetentionModal(interaction) {
  const fields = interaction.fields;
  const retention = {
    incidentsDays: parseInteger(fields, 'incidents_days', { min: 1, max: 3650, label: 'Días de incidentes' }),
    maxIncidents: parseInteger(fields, 'incidents_max', { min: 50, max: 5000, label: 'Máximo de incidentes' }),
    warningsDays: parseInteger(fields, 'warnings_days', { min: 1, max: 3650, label: 'Días de advertencias' }),
    maxWarnings: parseInteger(fields, 'warnings_max', { min: 50, max: 5000, label: 'Máximo de advertencias' }),
    casesDays: parseInteger(fields, 'cases_days', { min: 1, max: 3650, label: 'Días de casos' }),
  };
  await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
    Object.assign(document.retention, retention);
    return document;
  });
  return respondFromModal(
    interaction,
    await renderSettings(interaction, 'Retención de datos actualizada.'),
  );
}

async function handleListModal(interaction, action, list) {
  if (!LIST_TYPES.includes(list)) throw new UserError('Lista desconocida.');
  const domain = interaction.fields.getTextInputValue('domain');
  let notice;
  if (action === 'add') {
    const reason = interaction.fields.fields.has('reason')
      ? parseOptionalText(interaction.fields, 'reason', { maxLength: 300 })
      : null;
    notice = await addListEntry(interaction, list, domain, reason);
  } else {
    notice = await removeListEntry(interaction, list, domain);
  }
  return respondFromModal(interaction, await renderLists(interaction, notice));
}

async function handleTrustedModal(interaction, kind) {
  const note = interaction.fields.fields.has('note')
    ? parseOptionalText(interaction.fields, 'note', { maxLength: 300 })
    : null;
  if (kind === 'user') {
    const userId = parseSnowflake(interaction.fields.getTextInputValue('user_id'), 'usuario');
    await addTrustedUser(interaction, userId, note);
    return respondFromModal(interaction, await renderTrusted(interaction, `<@${userId}> añadido a confianza.`));
  }
  const roleId = parseSnowflake(interaction.fields.getTextInputValue('role_id'), 'rol');
  await addTrustedRole(interaction, roleId, note);
  return respondFromModal(interaction, await renderTrusted(interaction, `<@&${roleId}> añadido a confianza.`));
}

async function addTrustedUser(interaction, userId, note = null) {
  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (!member) throw new UserError('Ese usuario no está en el servidor.');
  if (member.id === interaction.guild.ownerId) throw new UserError('El propietario ya está excluido automáticamente.');
  const trusted = await interaction.client.stores.trusted.get(interaction.guild.id);
  if (trusted.users.some((entry) => entry.id === userId)) {
    throw new UserError('Ese usuario ya está en la lista de confianza.');
  }
  await interaction.client.stores.trusted.update(interaction.guild.id, (document) => {
    document.users.push({ id: userId, addedBy: interaction.user.id, addedAt: nowIso(), note });
    return document;
  });
  interaction.client.logger.info('Usuario añadido a confianza', {
    guildId: interaction.guild.id,
    userId,
    addedBy: interaction.user.id,
  });
}

async function addTrustedRole(interaction, roleId, note = null) {
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) throw new UserError('Ese rol no existe en el servidor.');
  if (role.id === interaction.guild.id) {
    throw new UserError('No puedes añadir @everyone a la lista de confianza.');
  }
  const trusted = await interaction.client.stores.trusted.get(interaction.guild.id);
  if (trusted.roles.some((entry) => entry.id === roleId)) {
    throw new UserError('Ese rol ya está en la lista de confianza.');
  }
  await interaction.client.stores.trusted.update(interaction.guild.id, (document) => {
    document.roles.push({ id: roleId, addedBy: interaction.user.id, addedAt: nowIso(), note });
    return document;
  });
  interaction.client.logger.info('Rol añadido a confianza', {
    guildId: interaction.guild.id,
    roleId,
    addedBy: interaction.user.id,
  });
}

async function removeTrustedEntry(interaction, value) {
  const [kind, id] = String(value).split(':');
  if (!['user', 'role'].includes(kind) || !isSnowflake(id)) {
    throw new UserError('Entrada de confianza no válida.');
  }
  const trusted = await interaction.client.stores.trusted.get(interaction.guild.id);
  const collection = kind === 'user' ? trusted.users : trusted.roles;
  if (!collection.some((entry) => entry.id === id)) {
    throw new UserError('Esa entrada ya no está en la lista de confianza.');
  }
  await interaction.client.stores.trusted.update(interaction.guild.id, (document) => {
    document[kind === 'user' ? 'users' : 'roles'] = document[kind === 'user' ? 'users' : 'roles'].filter(
      (entry) => entry.id !== id,
    );
    return document;
  });
  return `${kind === 'user' ? `<@${id}>` : `<@&${id}>`} eliminado de confianza.`;
}

async function applyPreset(interaction, level) {
  if (!PROTECTION_PRESETS[level]) throw new UserError('Nivel de protección desconocido.');
  const preset = PROTECTION_PRESETS[level];
  await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
    document.protectionLevel = level;
    for (const [key, changes] of Object.entries(preset.modules)) {
      if (!document.modules[key]) continue;
      for (const [property, value] of Object.entries(changes)) {
        if (property === 'thresholds' && value && typeof value === 'object') {
          Object.assign(document.modules[key].thresholds, value);
        } else {
          document.modules[key][property] = value;
        }
      }
    }
    return document;
  });
  interaction.client.logger.info('Nivel de protección aplicado desde el panel', {
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    level,
  });
  return `Nivel de protección cambiado a **${preset.label}**.`;
}

export async function handleSecurityPanelInteraction(interaction) {
  if (!hasPanelPermission(interaction)) return denyPanel(interaction);

  try {
    if (interaction.isModalSubmit()) {
      const parts = interaction.customId.split(':');
      if (parts[2] === 'module') return await handleModuleModal(interaction, parts[3]);
      if (parts[2] === 'retention') return await handleRetentionModal(interaction);
      if (parts[2] === 'list') return await handleListModal(interaction, parts[3], parts[4]);
      if (parts[2] === 'trusted') return await handleTrustedModal(interaction, parts[3]);
      throw new UserError('Formulario no reconocido.');
    }

    if (interaction.isButton()) {
      const parts = interaction.customId.split(':');
      const action = parts[2];
      const rest = parts.slice(3);

      if (action === 'view') return updateView(interaction, rest[0] ?? 'overview');
      if (action === 'refresh') return updateView(interaction, 'overview', { notice: 'Panel actualizado.' });
      if (action === 'close') {
        return safeUpdate(interaction, {
          embeds: [
            baseEmbed({
              title: '🌙 Panel cerrado',
              description: 'Puedes volver a abrirlo cuando quieras con `/securitymoon`.',
              color: 0x9aa0b5,
            }),
          ],
          components: [],
        });
      }
      if (action === 'module') return updateView(interaction, `module:${rest[0]}`);
      if (action === 'retention') {
        const settings = await interaction.client.stores.guilds.get(interaction.guild.id);
        return interaction.showModal(retentionModal(settings));
      }
      if (action === 'toggle') {
        const key = rest[0];
        if (!MODULE_KEYS.includes(key)) throw new UserError('Módulo desconocido.');
        const settings = await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
          document.modules[key].enabled = !document.modules[key].enabled;
          return document;
        });
        const enabled = settings.modules[key].enabled;
        interaction.client.logger.info('Módulo alternado desde el panel', {
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          module: key,
          enabled,
        });
        return updateView(interaction, `module:${key}`, {
          notice: enabled ? 'Módulo activado.' : 'Módulo desactivado.',
        });
      }
      if (action === 'configure') {
        const key = rest[0];
        if (!MODULE_KEYS.includes(key)) throw new UserError('Módulo desconocido.');
        const settings = await interaction.client.stores.guilds.get(interaction.guild.id);
        return interaction.showModal(moduleModal(key, settings.modules[key]));
      }
      if (action === 'reset') {
        const key = rest[0];
        if (!MODULE_KEYS.includes(key)) throw new UserError('Módulo desconocido.');
        const defaults = defaultGuildSettings(interaction.guild.id);
        await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
          document.modules[key] = defaults.modules[key];
          return document;
        });
        return updateView(interaction, `module:${key}`, { notice: 'Configuración del módulo restablecida.' });
      }
      if (action === 'emergency') {
        const activate = rest[0] === 'activate';
        const result = activate
          ? await interaction.client.security.emergency.activate(interaction.guild, {
              activatedBy: interaction.user.id,
              reason: 'Activado desde el panel de seguridad',
            })
          : await interaction.client.security.emergency.deactivate(interaction.guild, {
              deactivatedBy: interaction.user.id,
              reason: 'Desactivado desde el panel de seguridad',
            });
        return updateView(interaction, 'overview', {
          notice: result.result ?? (activate ? 'Modo emergencia activado.' : 'Modo emergencia desactivado.'),
        });
      }
      if (action === 'notify') {
        const settings = await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
          document.notifications.projectUpdates = !document.notifications.projectUpdates;
          return document;
        });
        return updateView(interaction, 'settings', {
          notice: settings.notifications.projectUpdates
            ? 'Avisos del proyecto activados. Solo se enviarán actualizaciones reales del repositorio.'
            : 'Avisos del proyecto desactivados.',
        });
      }
      if (action === 'incidents') {
        if (rest[0] === 'clear') {
          return updateView(interaction, 'incidents', { confirm: true });
        }
        if (rest[0] === 'clear_confirm') {
          const cleared = await interaction.client.incidents.clear(interaction.guild.id);
          return updateView(interaction, 'incidents', {
            notice: `Se limpiaron los incidentes (${cleared.incidents.length} restantes).`,
          });
        }
      }
      if (action === 'list') {
        const [operation, list] = rest;
        if (!LIST_TYPES.includes(list)) throw new UserError('Lista desconocida.');
        return interaction.showModal(listModal(operation, list));
      }
      if (action === 'trusted') {
        if (rest[0] === 'add_user') return interaction.showModal(trustedModal('user'));
        if (rest[0] === 'add_role') return interaction.showModal(trustedModal('role'));
      }
      throw new UserError('Acción del panel no reconocida.');
    }

    if (interaction.isAnySelectMenu()) {
      const parts = interaction.customId.split(':');
      const group = parts[2];
      const value = interaction.values[0];

      if (group === 'select' && parts[3] === 'module') {
        return updateView(interaction, `module:${value}`);
      }
      if (group === 'select' && parts[3] === 'preset') {
        const notice = await applyPreset(interaction, value);
        return updateView(interaction, 'settings', { notice });
      }
      if (group === 'select' && parts[3] === 'incident') {
        return updateView(interaction, `incident:${value}`);
      }
      if (group === 'select' && parts[3] === 'trusted_remove') {
        const notice = await removeTrustedEntry(interaction, value);
        return updateView(interaction, 'trusted', { notice });
      }
      if (group === 'channel') {
        const kind = parts[3];
        if (!['alerts', 'logs', 'modlog'].includes(kind)) throw new UserError('Canal desconocido.');
        const channel = await interaction.guild.channels.fetch(value).catch(() => null);
        if (!channel || !channel.isTextBased?.()) {
          throw new UserError('Selecciona un canal de texto válido.');
        }
        await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
          document.channels[kind] = channel.id;
          return document;
        });
        return updateView(interaction, 'settings', {
          notice: `Canal de ${kind === 'alerts' ? 'alertas' : kind === 'logs' ? 'registros' : 'moderación'} configurado en <#${channel.id}>.`,
        });
      }
      if (group === 'trusted' && parts[3] === 'add_user_select') {
        await addTrustedUser(interaction, value);
        return updateView(interaction, 'trusted', { notice: `<@${value}> añadido a confianza.` });
      }
      if (group === 'trusted' && parts[3] === 'add_role_select') {
        await addTrustedRole(interaction, value);
        return updateView(interaction, 'trusted', { notice: `<@&${value}> añadido a confianza.` });
      }
      throw new UserError('Selección del panel no reconocida.');
    }

    return null;
  } catch (error) {
    if (error instanceof UserError) {
      const payload = {
        embeds: [baseEmbed({ title: '❌ Acción no completada', description: error.message, color: 0xed4245 })],
        flags: 64,
      };
      try {
        if (interaction.replied || interaction.deferred) return await interaction.followUp(payload);
        if (interaction.isModalSubmit() && typeof interaction.isFromMessage === 'function' && interaction.isFromMessage()) {
          return await interaction.update({
            embeds: [baseEmbed({ title: '❌ Acción no completada', description: error.message, color: 0xed4245 })],
          });
        }
        return await interaction.reply(payload);
      } catch {
        return null;
      }
    }
    throw error;
  }
}

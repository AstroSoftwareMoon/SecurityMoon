// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  AttachmentBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { MODULE_KEYS, PROJECT, PROTECTION_PRESETS } from '../../constants.js';
import { baseEmbed, statusBadge, warningEmbed } from '../../utils/embeds.js';

const DATA_SCOPES = ['warnings', 'incidents', 'moderation', 'stats', 'filters'];
const SCOPE_LABELS = Object.freeze({
  warnings: '⚠️ Advertencias',
  incidents: '🚧 Incidentes',
  moderation: '📋 Casos de moderación',
  stats: '📊 Estadísticas',
  filters: '📋 Listas blancas y negras',
});

function configSummaryEmbed(settings, guild) {
  const channels = settings.channels;
  return baseEmbed({
    title: `⚙️ Configuración de ${guild.name}`,
    color: 0x7c6cf5,
    fields: [
      { name: 'Servidor', value: `\`${guild.id}\``, inline: true },
      { name: 'Asistente', value: settings.setupCompleted ? '✅ Completado' : '⚠️ Pendiente (/setup)', inline: true },
      { name: 'Nivel', value: PROTECTION_PRESETS[settings.protectionLevel]?.label ?? settings.protectionLevel, inline: true },
      {
        name: 'Módulos',
        value: MODULE_KEYS.map(
          (key) => `${key}: ${statusBadge(settings.modules[key].enabled)}`,
        ).join('\n'),
        inline: false,
      },
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
        name: 'Retención',
        value: [
          `Incidentes: **${settings.retention.incidentsDays} días** / máximo **${settings.retention.maxIncidents}**`,
          `Advertencias: **${settings.retention.warningsDays} días** / máximo **${settings.retention.maxWarnings}**`,
          `Casos: **${settings.retention.casesDays} días** / máximo **${settings.retention.maxCases}**`,
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Emergencia',
        value: settings.emergency.active ? '🚨 Activo' : '🌙 Inactivo',
        inline: true,
      },
      {
        name: 'Notificaciones del proyecto',
        value: settings.notifications.projectUpdates ? 'Activadas' : 'Desactivadas',
        inline: true,
      },
    ],
    footer: `${PROJECT.name} • ${PROJECT.creator}`,
  });
}

async function buildExport(client, guild, scopes) {
  const data = {
    format: 'securitymoon-export-v1',
    exportedAt: new Date().toISOString(),
    guild: { id: guild.id, name: guild.name },
  };
  const stores = {
    settings: client.stores.guilds,
    warnings: client.stores.warnings,
    incidents: client.stores.incidents,
    moderation: client.stores.moderation,
    stats: client.stores.stats,
    filters: client.stores.filters,
    trusted: client.stores.trusted,
  };
  for (const scope of scopes) {
    if (stores[scope]) data[scope] = await stores[scope].get(guild.id);
  }
  return data;
}

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Consulta, exporta o restablece la configuración del servidor.')
    .addSubcommand((sub) =>
      sub.setName('view').setDescription('Muestra la configuración actual.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('export')
        .setDescription('Exporta toda la configuración y datos del servidor a JSON.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Restablece la configuración del servidor a los valores predeterminados.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('data')
        .setDescription('Exporta o limpia datos concretos del servidor.')
        .addStringOption((option) =>
          option
            .setName('scope')
            .setDescription('Tipo de datos.')
            .setRequired(true)
            .addChoices(
              ...DATA_SCOPES.map((scope) => ({ name: SCOPE_LABELS[scope], value: scope })),
              { name: '🗂️ Todos los datos anteriores', value: 'all' },
            ),
        )
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Acción a realizar.')
            .setRequired(true)
            .addChoices(
              { name: '📦 Exportar', value: 'export' },
              { name: '🧹 Limpiar', value: 'clear' },
            ),
        ),
    ),
  confirmation(interaction) {
    const subcommand = interaction.options.getSubcommand(false);
    if (subcommand === 'reset') {
      return {
        danger: true,
        description:
          'Se restaurará la configuración del servidor a los valores predeterminados. Se creará una copia de seguridad.',
      };
    }
    if (subcommand === 'data' && interaction.options.getString('action') === 'clear') {
      return {
        danger: true,
        description:
          'Se limpiarán los datos seleccionados del servidor. Se creará una copia de seguridad antes de borrar.',
      };
    }
    return null;
  },
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 3000,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand(true);
    const guild = interaction.guild;

    if (subcommand === 'view') {
      const settings = await interaction.client.stores.guilds.get(guild.id);
      return interaction.reply({
        embeds: [configSummaryEmbed(settings, guild)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === 'export') {
      const data = await buildExport(interaction.client, guild, [
        'settings',
        'warnings',
        'incidents',
        'moderation',
        'stats',
        'filters',
        'trusted',
      ]);
      const file = new AttachmentBuilder(
        Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8'),
        { name: `securitymoon-${guild.id}.json` },
      );
      return interaction.reply({
        content: '🌙 Exportación completa de los datos del servidor. Contiene únicamente información de este servidor.',
        files: [file],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === 'reset') {
      const settings = await interaction.client.stores.guilds.get(guild.id);
      if (settings.emergency.active) {
        await interaction.client.security.emergency.deactivate(guild, {
          deactivatedBy: interaction.user.id,
          reason: 'Restablecimiento de configuración',
        });
      }
      await interaction.client.stores.guilds.clear(guild.id);
      interaction.client.logger.info('Configuración restablecida', {
        guildId: guild.id,
        userId: interaction.user.id,
      });
      return interaction.reply({
        embeds: [
          warningEmbed(
            'Configuración restablecida',
            'Se restauraron los valores predeterminados. Las advertencias, incidentes, casos, listas y usuarios de confianza no se han eliminado; usa `/config data` para gestionarlos.',
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === 'data') {
      const selected = interaction.options.getString('scope', true);
      const action = interaction.options.getString('action', true);
      const scopes = selected === 'all' ? DATA_SCOPES : [selected];
      if (action === 'export') {
        const data = await buildExport(interaction.client, guild, scopes);
        const file = new AttachmentBuilder(
          Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8'),
          { name: `securitymoon-${guild.id}-${selected}.json` },
        );
        return interaction.reply({
          content: `📦 Exportación de **${selected === 'all' ? 'todos los datos' : SCOPE_LABELS[selected]}**.`,
          files: [file],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (selected === 'stats') await interaction.client.stats.flush();
      for (const scope of scopes) {
        await interaction.client.stores[scope].clear(guild.id);
      }
      if (selected === 'stats' || selected === 'all') {
        interaction.client.stats.pending.delete(guild.id);
      }
      interaction.client.logger.info('Datos de servidor limpiados por administrador', {
        guildId: guild.id,
        userId: interaction.user.id,
        scopes,
      });
      return interaction.reply({
        embeds: [
          warningEmbed(
            'Datos limpiados',
            `Se limpiaron: **${scopes.map((scope) => SCOPE_LABELS[scope]).join(', ')}**. Se conservó una copia de seguridad JSON.`,
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    return null;
  },
};

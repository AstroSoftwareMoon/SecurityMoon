// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  AttachmentBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { baseEmbed, truncate } from '../../utils/embeds.js';
import { discordTimestamp } from '../../utils/time.js';
import { readGuildLogEntries } from '../../utils/log-reader.js';
import { INCIDENT_EMOJI, INCIDENT_TYPES, SEVERITY_EMOJI } from '../../constants.js';

function incidentEmbed(incidents) {
  return baseEmbed({
    title: '📋 Registro de incidentes',
    description:
      incidents.length === 0
        ? 'No hay incidentes que mostrar.'
        : incidents
            .map(
              (incident) =>
                `**${INCIDENT_EMOJI[incident.type] ?? '📋'} #${incident.id} · ${incident.type} · ${SEVERITY_EMOJI[incident.severity] ?? '⚪'} ${incident.severity}** — ${discordTimestamp(incident.createdAt, 'R')}\n${truncate(incident.description, 180)}`,
            )
            .join('\n\n'),
    color: 0x5865f2,
  });
}

function eventsEmbed(entries) {
  return baseEmbed({
    title: '📜 Eventos de seguridad',
    description:
      entries.length === 0
        ? 'No hay eventos recientes para este servidor.'
        : entries
            .map(
              (entry) =>
                `\`${discordTimestamp(entry.timestamp, 'f')}\` **${entry.level}** — ${truncate(entry.message, 200)}`,
            )
            .join('\n'),
    color: 0x7c6cf5,
    footer: 'Solo se muestran eventos de este servidor. Los secretos se redactan.',
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName('securitylogs')
    .setDescription('Consulta o exporta los registros de seguridad.')
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('Muestra incidentes o eventos recientes.')
        .addStringOption((option) =>
          option
            .setName('source')
            .setDescription('Tipo de registro.')
            .addChoices(
              { name: '📋 Incidentes', value: 'incidents' },
              { name: '📜 Eventos técnicos', value: 'events' },
            ),
        )
        .addIntegerOption((option) =>
          option.setName('limit').setDescription('Cantidad (1-25).').setMinValue(1).setMaxValue(25),
        )
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Filtrar incidentes por tipo.')
            .addChoices(...INCIDENT_TYPES.slice(0, 25).map((type) => ({ name: type, value: type }))),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('export')
        .setDescription('Exporta los registros del servidor a JSON.')
        .addStringOption((option) =>
          option
            .setName('source')
            .setDescription('Qué exportar.')
            .addChoices(
              { name: '🗂️ Incidentes y eventos', value: 'all' },
              { name: '🚧 Solo incidentes', value: 'incidents' },
              { name: '📜 Solo eventos técnicos', value: 'events' },
            ),
        ),
    ),
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2500,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand(true);
    const guildId = interaction.guild.id;
    if (sub === 'view') {
      const source = interaction.options.getString('source') ?? 'incidents';
      const limit = interaction.options.getInteger('limit') ?? 10;
      if (source === 'events') {
        const entries = await readGuildLogEntries({
          logFilePath: interaction.client.logger.filePath,
          guildId,
          limit,
        });
        return interaction.reply({ embeds: [eventsEmbed(entries)], flags: MessageFlags.Ephemeral });
      }
      const type = interaction.options.getString('type');
      const incidents = await interaction.client.incidents.list(guildId, { limit, type });
      return interaction.reply({ embeds: [incidentEmbed(incidents)], flags: MessageFlags.Ephemeral });
    }

    const source = interaction.options.getString('source') ?? 'all';
    const data = {
      format: 'securitymoon-logs-v1',
      exportedAt: new Date().toISOString(),
      guildId,
    };
    if (source === 'all' || source === 'incidents') {
      data.incidents = await interaction.client.incidents.export(guildId);
    }
    if (source === 'all' || source === 'events') {
      data.events = await readGuildLogEntries({
        logFilePath: interaction.client.logger.filePath,
        guildId,
        limit: 100,
      });
    }
    const file = new AttachmentBuilder(
      Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8'),
      { name: `securitymoon-logs-${guildId}.json` },
    );
    return interaction.reply({
      content: '📦 Exportación de registros completada.',
      files: [file],
      flags: MessageFlags.Ephemeral,
    });
  },
};

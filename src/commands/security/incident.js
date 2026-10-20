// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  AttachmentBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { INCIDENT_EMOJI, INCIDENT_TYPES, SEVERITY_EMOJI } from '../../constants.js';
import { baseEmbed, truncate, warningEmbed } from '../../utils/embeds.js';
import { discordTimestamp } from '../../utils/time.js';

export default {
  data: new SlashCommandBuilder()
    .setName('incident')
    .setDescription('Consulta, exporta o limpia los incidentes de seguridad.')
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Lista los incidentes recientes.')
        .addIntegerOption((option) =>
          option.setName('limit').setDescription('Cantidad (1-25).').setMinValue(1).setMaxValue(25),
        )
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Filtrar por tipo.')
            .addChoices(...INCIDENT_TYPES.map((type) => ({ name: type, value: type }))),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('Muestra un incidente concreto.')
        .addIntegerOption((option) =>
          option.setName('id').setDescription('ID del incidente.').setMinValue(1).setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName('export').setDescription('Exporta todos los incidentes a JSON.'))
    .addSubcommand((sub) =>
      sub
        .setName('clear')
        .setDescription('Elimina todos los incidentes del servidor.'),
    ),
  confirmation: { subcommands: ['clear'], danger: true },
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2500,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand(true);
    const guildId = interaction.guild.id;
    if (sub === 'list') {
      const limit = interaction.options.getInteger('limit') ?? 10;
      const type = interaction.options.getString('type');
      const incidents = await interaction.client.incidents.list(guildId, { limit, type });
      return interaction.reply({
        embeds: [
          baseEmbed({
            title: '📋 Incidentes recientes',
            description:
              incidents.length === 0
                ? 'No hay incidentes con ese filtro.'
                : incidents
                    .map(
                      (incident) =>
                        `**${INCIDENT_EMOJI[incident.type] ?? '📋'} #${incident.id} · ${incident.type} · ${SEVERITY_EMOJI[incident.severity] ?? '⚪'} ${incident.severity}** — ${discordTimestamp(incident.createdAt, 'R')}\n${truncate(incident.description, 180)}`,
                    )
                    .join('\n\n'),
            color: 0x5865f2,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (sub === 'view') {
      const id = interaction.options.getInteger('id', true);
      const incident = await interaction.client.incidents.get(guildId, id);
      if (!incident) {
        return interaction.reply({
          content: `No existe el incidente #${id}.`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({
        embeds: [interaction.client.incidents.buildEmbed(incident)],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (sub === 'export') {
      const document = await interaction.client.incidents.export(guildId);
      const file = new AttachmentBuilder(
        Buffer.from(`${JSON.stringify(document, null, 2)}\n`, 'utf8'),
        { name: `securitymoon-incidents-${guildId}.json` },
      );
      return interaction.reply({
        content: `📦 ${document.incidents.length} incidente(s) exportado(s).`,
        files: [file],
        flags: MessageFlags.Ephemeral,
      });
    }
    const cleared = await interaction.client.incidents.clear(guildId);
    return interaction.reply({
      embeds: [
        warningEmbed(
          'Incidentes eliminados',
          `Se eliminaron los incidentes del servidor. El archivo conserva un contador reiniciado (${cleared.nextId - 1} previos).`,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

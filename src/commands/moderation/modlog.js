// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { baseEmbed } from '../../utils/embeds.js';
import { moderationCaseEmbed } from '../../utils/moderation.js';
import { caseLine } from '../../utils/moderation-helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('modlog')
    .setDescription('Consulta los casos de moderación del servidor.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Filtrar por usuario sancionado.'),
    )
    .addIntegerOption((option) =>
      option.setName('case_id').setDescription('Consultar un caso concreto.').setMinValue(1),
    )
    .addIntegerOption((option) =>
      option.setName('limit').setDescription('Número de casos a mostrar (1-25).').setMinValue(1).setMaxValue(25),
    ),
  permissions: [PermissionFlagsBits.ManageMessages],
  cooldown: 2000,
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const caseId = interaction.options.getInteger('case_id');
    const limit = interaction.options.getInteger('limit') ?? 10;
    const document = await interaction.client.stores.moderation.get(interaction.guild.id);

    if (caseId) {
      const found = document.cases.find((entry) => entry.id === caseId);
      if (!found) {
        return interaction.reply({
          content: `No existe el caso #${caseId}.`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({
        embeds: [moderationCaseEmbed(found)],
        flags: MessageFlags.Ephemeral,
      });
    }

    let cases = [...document.cases].reverse();
    if (user) cases = cases.filter((entry) => entry.targetId === user.id);
    cases = cases.slice(0, limit);

    const embed = baseEmbed({
      title: '📋 Registro de moderación',
      description:
        cases.length === 0
          ? 'No hay casos que coincidan con el filtro.'
          : cases.map((entry) => caseLine(entry)).join('\n\n'),
      color: 0x5865f2,
      footer: `Mostrando ${cases.length} de ${document.cases.length} casos`,
    });
    if (embed.data.description?.length > 4096) {
      embed.setDescription(`${embed.data.description.slice(0, 4093)}…`);
    }
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

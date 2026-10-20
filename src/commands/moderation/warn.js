// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase, tryDirectMessage } from '../../utils/moderation.js';
import { warningEmbed } from '../../utils/embeds.js';
import { replyModeration, resolveModerationTarget } from '../../utils/moderation-helpers.js';
import { sanitizeReason } from '../../utils/validators.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Añade una advertencia persistente a un usuario.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Usuario a advertir.').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Motivo de la advertencia.').setMaxLength(1000).setRequired(true),
    ),
  confirmation: { danger: true },
  permissions: [PermissionFlagsBits.ModerateMembers],
  cooldown: 2500,
  async execute(interaction) {
    const { user } = await resolveModerationTarget(interaction);
    const reasonText = sanitizeReason(interaction.options.getString('reason', true));
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const warning = await interaction.client.warnings.add(interaction.guild, {
      userId: user.id,
      moderatorId: interaction.user.id,
      reason: reasonText,
    });
    const count = await interaction.client.warnings.count(interaction.guild.id, user.id);

    await tryDirectMessage(interaction.client, user.id, {
      embeds: [
        warningEmbed(
          'Has recibido una advertencia',
          `Servidor: **${interaction.guild.name}**\nMotivo: ${reasonText}\nAdvertencia: **#${warning.id}**\nAdvertencias activas: **${count}**`,
        ),
      ],
    });

    const caseData = await createModerationCase(interaction.client, interaction.guild, {
      type: 'warn',
      targetId: user.id,
      moderatorId: interaction.user.id,
      reason: reasonText,
      result: `Advertencia #${warning.id} registrada.`,
    });

    return replyModeration(interaction, {
      title: 'Advertencia registrada',
      description: `${user.tag} tiene ahora **${count}** advertencia(s) activa(s).`,
      caseData,
      extraFields: [
        { name: 'Advertencia', value: `#${warning.id}`, inline: true },
        { name: 'Motivo', value: reasonText, inline: false },
      ],
    });
  },
};

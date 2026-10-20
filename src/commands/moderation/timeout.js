// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase, tryDirectMessage } from '../../utils/moderation.js';
import { warningEmbed } from '../../utils/embeds.js';
import { formatDuration, parseDuration } from '../../utils/time.js';
import { moderationReason, replyModeration, resolveModerationTarget } from '../../utils/moderation-helpers.js';
import { sanitizeReason } from '../../utils/validators.js';
import { UserError } from '../../utils/errors.js';

const MAX_MS = 28 * 24 * 60 * 60 * 1000;

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Silencia temporalmente a un miembro.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Miembro a silenciar.').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('Duración: 30s, 10m, 2h o 1d (máximo 28 días).')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Motivo del timeout.').setMaxLength(1000),
    ),
  confirmation: { danger: true },
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldown: 3000,
  async execute(interaction) {
    const { user, targetMember } = await resolveModerationTarget(interaction, { requireMember: true });
    const reasonText = sanitizeReason(interaction.options.getString('reason'));
    let milliseconds;
    try {
      milliseconds = parseDuration(interaction.options.getString('duration', true));
    } catch (error) {
      throw new UserError(error.message);
    }
    if (milliseconds > MAX_MS) throw new UserError('El timeout máximo es de 28 días.');
    if (!targetMember.moderatable) throw new UserError('El miembro no se puede moderar por jerarquía.');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await targetMember.timeout(milliseconds, moderationReason(interaction, reasonText));
    await tryDirectMessage(interaction.client, user.id, {
      embeds: [
        warningEmbed(
          'Has recibido un timeout',
          `Servidor: **${interaction.guild.name}**\nDuración: **${formatDuration(milliseconds)}**\nMotivo: ${reasonText}`,
        ),
      ],
    });

    const caseData = await createModerationCase(interaction.client, interaction.guild, {
      type: 'timeout',
      targetId: user.id,
      moderatorId: interaction.user.id,
      reason: reasonText,
      durationSeconds: Math.floor(milliseconds / 1000),
      result: 'Timeout aplicado.',
    });

    return replyModeration(interaction, {
      title: 'Timeout aplicado',
      description: `${user.tag} no podrá escribir durante **${formatDuration(milliseconds)}**.`,
      caseData,
      extraFields: [{ name: 'Motivo', value: reasonText, inline: false }],
    });
  },
};

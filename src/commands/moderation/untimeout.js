// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase } from '../../utils/moderation.js';
import { UserError } from '../../utils/errors.js';
import { replyModeration, resolveModerationTarget } from '../../utils/moderation-helpers.js';
import { sanitizeReason } from '../../utils/validators.js';

export default {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Retira el timeout de un miembro.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Miembro a liberar.').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Motivo de la retirada.').setMaxLength(1000),
    ),
  confirmation: { danger: true },
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldown: 3000,
  async execute(interaction) {
    const { user, targetMember } = await resolveModerationTarget(interaction, { requireMember: true });
    if (!targetMember.isCommunicationDisabled()) {
      throw new UserError('Ese miembro no tiene un timeout activo.');
    }
    const reasonText = sanitizeReason(interaction.options.getString('reason'), {
      fallback: 'Timeout retirado por un moderador',
    });
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await targetMember.timeout(null, `SecurityMoon | ${interaction.user.tag}: ${reasonText}`);

    const caseData = await createModerationCase(interaction.client, interaction.guild, {
      type: 'untimeout',
      targetId: user.id,
      moderatorId: interaction.user.id,
      reason: reasonText,
      result: 'Timeout retirado.',
    });

    return replyModeration(interaction, {
      title: 'Timeout retirado',
      description: `${user.tag} puede volver a escribir.`,
      caseData,
    });
  },
};

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase, tryDirectMessage } from '../../utils/moderation.js';
import { UserError } from '../../utils/errors.js';
import { warningEmbed } from '../../utils/embeds.js';
import { moderationReason, replyModeration, resolveModerationTarget } from '../../utils/moderation-helpers.js';
import { sanitizeReason } from '../../utils/validators.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un miembro del servidor.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Miembro que será expulsado.').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Motivo de la expulsión.').setMaxLength(1000),
    ),
  confirmation: { danger: true },
  permissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  cooldown: 3000,
  async execute(interaction) {
    const { user, targetMember } = await resolveModerationTarget(interaction, { requireMember: true });
    if (!targetMember.kickable) throw new UserError('El miembro no se puede expulsar por jerarquía.');
    const reasonText = sanitizeReason(interaction.options.getString('reason'));
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await tryDirectMessage(interaction.client, user.id, {
      embeds: [
        warningEmbed(
          'Has sido expulsado',
          `Servidor: **${interaction.guild.name}**\nMotivo: ${reasonText}\nModerador: ${interaction.user.tag}`,
        ),
      ],
    });

    await targetMember.kick(moderationReason(interaction, reasonText));

    const caseData = await createModerationCase(interaction.client, interaction.guild, {
      type: 'kick',
      targetId: user.id,
      moderatorId: interaction.user.id,
      reason: reasonText,
      result: 'Miembro expulsado.',
    });

    return replyModeration(interaction, {
      title: 'Miembro expulsado',
      description: `${user.tag} fue expulsado del servidor.`,
      caseData,
      extraFields: [{ name: 'Motivo', value: reasonText, inline: false }],
    });
  },
};

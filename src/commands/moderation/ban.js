// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase, tryDirectMessage } from '../../utils/moderation.js';
import { infoEmbed } from '../../utils/embeds.js';
import { moderationReason, replyModeration, resolveModerationTarget } from '../../utils/moderation-helpers.js';
import { sanitizeReason } from '../../utils/validators.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banea a un usuario del servidor.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Usuario que será baneado.').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Motivo del baneo.').setMaxLength(1000),
    )
    .addIntegerOption((option) =>
      option
        .setName('delete_days')
        .setDescription('Días de mensajes recientes a eliminar (0-7).')
        .setMinValue(0)
        .setMaxValue(7),
    ),
  confirmation: { danger: true },
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  cooldown: 3000,
  async execute(interaction) {
    const { user } = await resolveModerationTarget(interaction);
    const reasonText = sanitizeReason(interaction.options.getString('reason'));
    const days = interaction.options.getInteger('delete_days') ?? 0;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await tryDirectMessage(interaction.client, user.id, {
      embeds: [
        infoEmbed(
          'Has sido baneado',
          `Servidor: **${interaction.guild.name}**\nMotivo: ${reasonText}\nModerador: ${interaction.user.tag}`,
        ),
      ],
    });

    await interaction.guild.members.ban(user.id, {
      reason: moderationReason(interaction, reasonText),
      deleteMessageSeconds: days * 86_400,
    });

    const caseData = await createModerationCase(interaction.client, interaction.guild, {
      type: 'ban',
      targetId: user.id,
      moderatorId: interaction.user.id,
      reason: reasonText,
      result: 'Usuario baneado.',
    });

    return replyModeration(interaction, {
      title: 'Usuario baneado',
      description: `${user.tag} fue baneado correctamente.`,
      caseData,
      extraFields: [
        { name: 'Motivo', value: reasonText, inline: false },
        { name: 'Mensajes eliminados', value: `${days} día(s)`, inline: true },
      ],
    });
  },
};

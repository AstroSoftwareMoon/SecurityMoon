// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase } from '../../utils/moderation.js';
import { UserError } from '../../utils/errors.js';
import { replyModeration } from '../../utils/moderation-helpers.js';
import { isSnowflake } from '../../storage/validation.js';
import { sanitizeReason } from '../../utils/validators.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Retira el baneo de un usuario.')
    .addStringOption((option) =>
      option
        .setName('user_id')
        .setDescription('ID del usuario baneado.')
        .setRequired(true)
        .setMaxLength(20),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Motivo del desbaneo.').setMaxLength(1000),
    ),
  confirmation: { danger: true },
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  cooldown: 3000,
  async execute(interaction) {
    const userId = interaction.options.getString('user_id', true).trim();
    if (!isSnowflake(userId)) throw new UserError('El ID del usuario no es válido.');
    const reasonText = sanitizeReason(interaction.options.getString('reason'));

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) throw new UserError('Ese usuario no está baneado en este servidor.');

    await interaction.guild.members.unban(
      userId,
      `SecurityMoon | ${interaction.user.tag}: ${reasonText}`,
    );

    const caseData = await createModerationCase(interaction.client, interaction.guild, {
      type: 'unban',
      targetId: userId,
      moderatorId: interaction.user.id,
      reason: reasonText,
      result: 'Baneo retirado.',
    });

    return replyModeration(interaction, {
      title: 'Usuario desbaneado',
      description: `${ban.user.tag} ya puede volver al servidor.`,
      caseData,
      extraFields: [{ name: 'Motivo', value: reasonText, inline: false }],
    });
  },
};

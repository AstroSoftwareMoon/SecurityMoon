// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase, tryDirectMessage } from '../../utils/moderation.js';
import { infoEmbed } from '../../utils/embeds.js';
import { moderationReason, replyModeration } from '../../utils/moderation-helpers.js';
import { canModerate } from '../../utils/permissions.js';
import { sanitizeReason } from '../../utils/validators.js';
import { UserError } from '../../utils/errors.js';

const SNOWFLAKE = /^(\d{17,20})$/;
const MENTION = /^<@!?(\d{17,20})>$/;

/** Acepta una ID pura o una mención; útil para usuarios que no están en el servidor. */
export function parseTargetId(input) {
  const value = String(input ?? '').trim();
  const match = MENTION.exec(value) ?? SNOWFLAKE.exec(value);
  if (!match) {
    throw new UserError(
      'Indica una ID de usuario válida (17-20 dígitos) o una mención como `<@123456789012345678>`.',
    );
  }
  return match[1];
}

export default {
  data: new SlashCommandBuilder()
    .setName('hackban')
    .setDescription('Banea por ID a un usuario que no está en el servidor.')
    .addStringOption((option) =>
      option
        .setName('user_id')
        .setDescription('ID o mención del usuario (aunque no esté en el servidor).')
        .setRequired(true)
        .setMaxLength(64),
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
  confirmation: {
    danger: true,
    description:
      'El usuario se baneará por ID, aunque no esté en el servidor. Se guardará el motivo y los días de mensajes a eliminar.',
  },
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  cooldown: 3000,
  async execute(interaction) {
    const targetId = parseTargetId(interaction.options.getString('user_id', true));
    const reasonText = sanitizeReason(interaction.options.getString('reason'));
    const days = interaction.options.getInteger('delete_days') ?? 0;

    // Se intenta resolver como miembro para aplicar jerarquía, y como usuario
    // para validar que la ID existe aunque no esté en el servidor.
    const member = await interaction.guild.members.fetch(targetId).catch(() => null);
    const targetUser =
      member?.user ?? (await interaction.client.users.fetch(targetId).catch(() => null));
    if (!targetUser) {
      throw new UserError('No existe ningún usuario con esa ID. Revisa el número e inténtalo de nuevo.');
    }

    canModerate({
      guild: interaction.guild,
      executor: interaction.member,
      targetUser,
    });

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await tryDirectMessage(interaction.client, targetUser.id, {
      embeds: [
        infoEmbed(
          'Has sido baneado',
          `Servidor: **${interaction.guild.name}**\nMotivo: ${reasonText}\nModerador: ${interaction.user.tag}`,
        ),
      ],
    });

    await interaction.guild.members.ban(targetId, {
      reason: moderationReason(interaction, reasonText),
      deleteMessageSeconds: days * 86_400,
    });

    const caseData = await createModerationCase(interaction.client, interaction.guild, {
      type: 'hackban',
      targetId: targetUser.id,
      moderatorId: interaction.user.id,
      reason: reasonText,
      result: 'Usuario baneado por ID.',
    });

    return replyModeration(interaction, {
      title: 'Usuario hackbaneado',
      description: `${targetUser.tag} fue baneado por ID correctamente.`,
      caseData,
      extraFields: [
        { name: 'Motivo', value: reasonText, inline: false },
        { name: 'Mensajes eliminados', value: `${days} día(s)`, inline: true },
        {
          name: 'Estaba en el servidor',
          value: member ? 'Sí' : 'No',
          inline: true,
        },
      ],
    });
  },
};

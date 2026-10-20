// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase } from '../../utils/moderation.js';
import { parseTextChannel, sanitizeReason } from '../../utils/validators.js';
import { UserError } from '../../utils/errors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Vuelve a permitir la escritura en un canal.')
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Canal a desbloquear (por defecto el actual).'),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Motivo del desbloqueo.').setMaxLength(1000),
    ),
  confirmation: { danger: true },
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  cooldown: 2500,
  async execute(interaction) {
    const channel = parseTextChannel(interaction.options.getChannel('channel') ?? interaction.channel);
    if (channel.guildId !== interaction.guildId) throw new UserError('El canal no pertenece a este servidor.');
    const reason = sanitizeReason(interaction.options.getString('reason'), {
      fallback: 'Canal desbloqueado',
    });

    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { SendMessages: null, SendMessagesInThreads: null },
      { reason: `SecurityMoon | ${interaction.user.tag}: ${reason}` },
    );

    await createModerationCase(interaction.client, interaction.guild, {
      type: 'unlock',
      moderatorId: interaction.user.id,
      reason,
      result: `Canal #${channel.name} desbloqueado.`,
    });

    return interaction.reply({
      embeds: [
        {
          color: 0x57f287,
          title: '🔓 Canal desbloqueado',
          description: `<#${channel.id}> vuelve a permitir la escritura según los permisos heredados.`,
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

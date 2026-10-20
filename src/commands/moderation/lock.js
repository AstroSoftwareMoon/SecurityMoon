// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase } from '../../utils/moderation.js';
import { parseTextChannel, sanitizeReason } from '../../utils/validators.js';
import { UserError } from '../../utils/errors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Bloquea la escritura en un canal.')
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Canal a bloquear (por defecto el actual).'),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Motivo del bloqueo.').setMaxLength(1000),
    ),
  confirmation: { danger: true },
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  cooldown: 2500,
  async execute(interaction) {
    const channel = parseTextChannel(interaction.options.getChannel('channel') ?? interaction.channel);
    if (channel.guildId !== interaction.guildId) throw new UserError('El canal no pertenece a este servidor.');
    const reason = sanitizeReason(interaction.options.getString('reason'), {
      fallback: 'Canal bloqueado',
    });

    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { SendMessages: false, SendMessagesInThreads: false },
      { reason: `SecurityMoon | ${interaction.user.tag}: ${reason}` },
    );

    await createModerationCase(interaction.client, interaction.guild, {
      type: 'lock',
      moderatorId: interaction.user.id,
      reason,
      result: `Canal #${channel.name} bloqueado.`,
    });

    return interaction.reply({
      embeds: [
        {
          color: 0xed4245,
          title: '🔒 Canal bloqueado',
          description: `<#${channel.id}> ya no permite escribir a @everyone.\nMotivo: ${reason}`,
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

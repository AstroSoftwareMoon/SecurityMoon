// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase } from '../../utils/moderation.js';
import { parseTextChannel } from '../../utils/validators.js';
import { UserError } from '../../utils/errors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Configura el modo lento de un canal.')
    .addIntegerOption((option) =>
      option
        .setName('seconds')
        .setDescription('Segundos entre mensajes (0 desactiva; máximo 21600).')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Canal a modificar (por defecto el actual).'),
    ),
  confirmation: { danger: true },
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  cooldown: 2500,
  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds', true);
    const channel = parseTextChannel(interaction.options.getChannel('channel') ?? interaction.channel);
    if (channel.guildId !== interaction.guildId) throw new UserError('El canal no pertenece a este servidor.');

    await channel.setRateLimitPerUser(seconds, `SecurityMoon | ${interaction.user.tag}`);

    await createModerationCase(interaction.client, interaction.guild, {
      type: 'slowmode',
      moderatorId: interaction.user.id,
      reason: `Modo lento configurado en #${channel.name}`,
      durationSeconds: seconds,
      result: `${seconds} segundo(s)`,
    });

    return interaction.reply({
      embeds: [
        {
          color: 0x57f287,
          title: seconds === 0 ? '✅ Modo lento desactivado' : '✅ Modo lento configurado',
          description:
            seconds === 0
              ? `Se desactivó el modo lento en <#${channel.id}>.`
              : `Los usuarios deberán esperar **${seconds}s** entre mensajes en <#${channel.id}>.`,
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

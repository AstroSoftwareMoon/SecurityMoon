// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { baseEmbed, statusBadge, warningEmbed } from '../../utils/embeds.js';
import { discordTimestamp } from '../../utils/time.js';
import { sanitizeReason } from '../../utils/validators.js';

export default {
  data: new SlashCommandBuilder()
    .setName('emergency')
    .setDescription('Activa o desactiva el modo emergencia del servidor.')
    .addSubcommand((sub) =>
      sub
        .setName('activate')
        .setDescription('Activa umbrales estrictos y eleva la verificación.')
        .addStringOption((option) =>
          option.setName('reason').setDescription('Motivo de la emergencia.').setMaxLength(500),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('deactivate')
        .setDescription('Desactiva el modo emergencia y restaura la verificación.')
        .addStringOption((option) =>
          option.setName('reason').setDescription('Motivo del fin de la emergencia.').setMaxLength(500),
        ),
    )
    .addSubcommand((sub) => sub.setName('status').setDescription('Muestra el estado de emergencia.')),
  confirmation: {
    subcommands: ['activate', 'deactivate'],
    dangerSubcommands: ['activate'],
  },
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3000,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand(true);
    if (sub === 'status') {
      const settings = await interaction.client.stores.guilds.get(interaction.guild.id);
      const emergency = settings.emergency;
      return interaction.reply({
        embeds: [
          baseEmbed({
            title: emergency.active ? '🚨 Modo emergencia activo' : '🌙 Modo emergencia inactivo',
            description: emergency.active
              ? 'Los umbrales de detección están reducidos y la verificación del servidor puede estar elevada.'
              : 'El servidor utiliza los umbrales configurados normalmente.',
            color: emergency.active ? 0xed4245 : 0x57f287,
            fields: emergency.active
              ? [
                  { name: 'Activado', value: discordTimestamp(emergency.activatedAt), inline: true },
                  { name: 'Por', value: emergency.activatedBy ? `<@${emergency.activatedBy}>` : 'Automático', inline: true },
                  { name: 'Motivo', value: emergency.reason ?? 'Sin motivo especificado', inline: false },
                  {
                    name: 'Verificación actual',
                    value: `${interaction.guild.verificationLevel}`,
                    inline: true,
                  },
                ]
              : [
                  { name: 'Anti-Raid', value: statusBadge(settings.modules.antiRaid.enabled), inline: true },
                  { name: 'Anti-Nuke', value: statusBadge(settings.modules.antiNuke.enabled), inline: true },
                  { name: 'Anti-Spam', value: statusBadge(settings.modules.antiSpam.enabled), inline: true },
                ],
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'activate') {
      const reason = sanitizeReason(interaction.options.getString('reason'), {
        maxLength: 500,
        fallback: null,
      });
      const result = await interaction.client.security.emergency.activate(interaction.guild, {
        activatedBy: interaction.user.id,
        reason,
        automated: false,
      });
      return interaction.reply({
        embeds: [
          warningEmbed(
            result.already ? 'La emergencia ya estaba activa' : '🚨 Modo emergencia activado',
            `${result.result}\n\nSe registró un incidente y se notificó al canal de alertas si está configurado.`,
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const reason = sanitizeReason(interaction.options.getString('reason'), {
      maxLength: 500,
      fallback: null,
    });
    const result = await interaction.client.security.emergency.deactivate(interaction.guild, {
      deactivatedBy: interaction.user.id,
      reason,
    });
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: result.already ? '🌙 Modo emergencia desactivado' : 'ℹ️ La emergencia no estaba activa',
          description: result.result,
          color: 0x57f287,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

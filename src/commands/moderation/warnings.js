// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { baseEmbed } from '../../utils/embeds.js';
import { discordTimestamp } from '../../utils/time.js';
import { truncate } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Muestra las advertencias de un usuario.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Usuario a consultar.').setRequired(true),
    ),
  permissions: [PermissionFlagsBits.ModerateMembers],
  cooldown: 2000,
  async execute(interaction) {
    const user = interaction.options.getUser('user', true);
    const warnings = await interaction.client.warnings.list(interaction.guild.id, user.id);
    const active = warnings.filter((warning) => warning.active);

    const embed = baseEmbed({
      title: `⚠️ Advertencias de ${user.tag}`,
      description:
        active.length === 0
          ? 'Este usuario no tiene advertencias activas.'
          : `**${active.length}** activa(s) de **${warnings.length}** registrada(s).`,
      color: active.length > 0 ? 0xfee75c : 0x57f287,
      fields: warnings.slice(0, 15).map((warning) => ({
        name: `#${warning.id} · ${warning.active ? 'Activa' : 'Retirada'} · ${discordTimestamp(warning.createdAt, 'd')}`,
        value: truncate(
          `${warning.reason}\nModerador: <@${warning.moderatorId}>${warning.removedAt ? `\nRetirada: ${discordTimestamp(warning.removedAt)}` : ''}`,
          1024,
        ),
      })),
    });

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

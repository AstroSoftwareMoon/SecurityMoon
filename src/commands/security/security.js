// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { securitySnapshot, overviewEmbed } from '../../utils/security-view.js';

export default {
  data: new SlashCommandBuilder()
    .setName('security')
    .setDescription('Muestra un resumen del estado de seguridad del servidor.'),
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2000,
  async execute(interaction) {
    const snapshot = await securitySnapshot(interaction.client, interaction.guild);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('sm:panel:view:overview')
        .setLabel('Abrir panel')
        .setEmoji('🌙')
        .setStyle(ButtonStyle.Primary),
    );
    return interaction.reply({
      embeds: [overviewEmbed(snapshot)],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};

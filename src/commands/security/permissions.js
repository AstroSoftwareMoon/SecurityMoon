// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { diagnosticsEmbed, securitySnapshot } from '../../utils/security-view.js';

export default {
  data: new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Diagnostica permisos y roles peligrosos del servidor.'),
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2500,
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const snapshot = await securitySnapshot(interaction.client, interaction.guild);
    return interaction.editReply({
      embeds: [diagnosticsEmbed(snapshot.analysis)],
    });
  },
};

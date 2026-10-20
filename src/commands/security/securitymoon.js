// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { openSecurityPanel } from '../../panels/security-panel.js';

export default {
  data: new SlashCommandBuilder()
    .setName('securitymoon')
    .setDescription('Abre el panel interactivo de SecurityMoon.'),
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2000,
  async execute(interaction) {
    return openSecurityPanel(interaction);
  },
};

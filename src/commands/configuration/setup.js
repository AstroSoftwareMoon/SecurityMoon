// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { startSetup } from '../../panels/setup-wizard.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Inicia el asistente de configuración paso a paso.'),
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 3000,
  async execute(interaction) {
    return startSetup(interaction);
  },
};

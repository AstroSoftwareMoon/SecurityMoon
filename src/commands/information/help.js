// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { SlashCommandBuilder } from 'discord.js';
import { openHelpPanel } from '../../panels/help-panel.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la ayuda interactiva de SecurityMoon.')
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('Categoría inicial.')
        .addChoices(
          { name: '🔨 Moderación', value: 'moderation' },
          { name: '🛡️ Seguridad', value: 'security' },
          { name: '⚙️ Configuración', value: 'configuration' },
          { name: 'ℹ️ Información', value: 'information' },
          { name: '🌙 Comunidad', value: 'community' },
        ),
    ),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    return openHelpPanel(interaction, interaction.options.getString('category'));
  },
};

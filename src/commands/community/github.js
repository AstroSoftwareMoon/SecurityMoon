// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed } from '../../utils/embeds.js';
import { issuesUrl, releasesUrl } from '../../utils/project-info.js';

export default {
  data: new SlashCommandBuilder().setName('github').setDescription('Enlaces oficiales de GitHub.'),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Repositorio').setEmoji('🐙').setStyle(ButtonStyle.Link).setURL(PROJECT.repository),
      new ButtonBuilder().setLabel('Perfil').setEmoji('👤').setStyle(ButtonStyle.Link).setURL(PROJECT.github),
      new ButtonBuilder().setLabel('Issues').setEmoji('🐛').setStyle(ButtonStyle.Link).setURL(issuesUrl()),
      new ButtonBuilder().setLabel('Releases').setEmoji('📦').setStyle(ButtonStyle.Link).setURL(releasesUrl()),
    );
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '🐙 GitHub oficial',
          description: `Repositorio de **${PROJECT.name}**, creado por **${PROJECT.creator}**.`,
          color: 0x24292f,
          fields: [
            { name: 'Repositorio', value: PROJECT.repository, inline: false },
            { name: 'Creador', value: PROJECT.github, inline: false },
            { name: 'Licencia', value: PROJECT.license, inline: true },
          ],
        }),
      ],
      components: [row],
    });
  },
};

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed, truncate } from '../../utils/embeds.js';
import { parseChangelog, readChangelog, releasesUrl } from '../../utils/project-info.js';
import { VERSION } from '../../utils/version.js';

export default {
  data: new SlashCommandBuilder().setName('changelog').setDescription('Muestra el historial de cambios del proyecto.'),
  permissions: [],
  cooldown: 3000,
  async execute(interaction) {
    const content = await readChangelog();
    const sections = parseChangelog(content).slice(0, 5);
    if (sections.length === 0) {
      return interaction.reply({
        embeds: [
          baseEmbed({
            title: '📜 Changelog',
            description: 'No se encontró `CHANGELOG.md` o está vacío. No se inventan versiones.',
            color: 0x9aa0b5,
          }),
        ],
      });
    }
    const files = content
      ? [new AttachmentBuilder(Buffer.from(content, 'utf8'), { name: 'CHANGELOG.md' })]
      : [];
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '📜 Changelog',
          description: `Versión instalada: **${VERSION}**. Se muestran las últimas ${sections.length} entrada(s) del archivo local.`,
          color: 0x7c6cf5,
          fields: sections.map((section) => ({
            name: section.title,
            value: truncate(section.body || 'Sin detalles.', 1024),
            inline: false,
          })),
          footer: `${PROJECT.name} • ${PROJECT.creator}`,
        }),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Releases en GitHub').setEmoji('📦').setStyle(ButtonStyle.Link).setURL(releasesUrl()),
        ),
      ],
      files,
    });
  },
};

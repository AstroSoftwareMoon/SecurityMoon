// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { SlashCommandBuilder } from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed, projectLinksRow } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder().setName('opensource').setDescription('Información sobre el código abierto del proyecto.'),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '🐙 Código abierto',
          description: [
            `${PROJECT.name} se distribuye bajo la licencia **${PROJECT.license}**.`,
            '',
            'Puedes consultar el código, abrir issues, proponer mejoras o enviar pull requests. No hay funciones Premium, donaciones ni compras.',
            '',
            'Antes de contribuir, lee `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` y `SECURITY.md` en el repositorio.',
          ].join('\n'),
          color: 0x7c6cf5,
          fields: [
            { name: 'Repositorio', value: `[Abrir en GitHub](${PROJECT.repository})`, inline: false },
            { name: 'Perfil del creador', value: `[${PROJECT.creator}](${PROJECT.github})`, inline: false },
            { name: 'Licencia', value: PROJECT.license, inline: true },
          ],
        }),
      ],
      components: [projectLinksRow()],
    });
  },
};

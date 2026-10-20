// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { SlashCommandBuilder } from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed, projectLinksRow } from '../../utils/embeds.js';
import { VERSION } from '../../utils/version.js';

export default {
  data: new SlashCommandBuilder().setName('credits').setDescription('Créditos del proyecto SecurityMoon.'),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '✨ Créditos',
          description: [
            `**${PROJECT.name}** es creado y mantenido por **${PROJECT.creator}**.`,
            '',
            'Tecnologías utilizadas:',
            '• **Node.js** — entorno de ejecución.',
            '• **Discord.js** — biblioteca para la API de Discord.',
            '• **JavaScript con módulos ES** — código modular y abierto.',
            '• Persistencia en archivos **JSON**, sin bases de datos.',
            '',
            'Gracias a la comunidad de Discord y a todas las personas que reportan errores o proponen mejoras.',
          ].join('\n'),
          color: 0x7c6cf5,
          fields: [
            { name: 'Creador', value: PROJECT.creator, inline: true },
            { name: 'Versión', value: VERSION, inline: true },
            { name: 'Licencia', value: PROJECT.license, inline: true },
          ],
          footer: `${PROJECT.name} • Código abierto`,
        }),
      ],
      components: [projectLinksRow()],
    });
  },
};

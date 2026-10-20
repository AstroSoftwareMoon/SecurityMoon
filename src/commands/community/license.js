// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed } from '../../utils/embeds.js';
import { readLicense } from '../../utils/project-info.js';

export default {
  data: new SlashCommandBuilder().setName('license').setDescription('Muestra la licencia del proyecto.'),
  permissions: [],
  cooldown: 2000,
  async execute(interaction) {
    const license = await readLicense();
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '📄 Licencia MIT',
          description: [
            'SecurityMoon se distribuye bajo la **licencia MIT**.',
            '',
            'Puedes usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar y vender copias del software, siempre que se incluya el aviso de copyright y el texto de la licencia.',
            '',
            'El software se proporciona "tal cual", sin garantías de ningún tipo.',
            '',
            `Titular: **${PROJECT.creator}**`,
          ].join('\n'),
          color: 0x7c6cf5,
          fields: [
            { name: 'Repositorio', value: PROJECT.repository, inline: false },
            { name: 'Año', value: '2026', inline: true },
          ],
        }),
      ],
      files: [new AttachmentBuilder(Buffer.from(license, 'utf8'), { name: 'LICENSE.txt' })],
    });
  },
};

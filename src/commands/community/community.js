// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { SlashCommandBuilder } from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed, projectLinksRow } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder().setName('community').setDescription('Únete a la comunidad oficial.'),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '💬 Comunidad de SecurityMoon',
          description: [
            'El servidor oficial de Discord es el lugar para recibir soporte, compartir configuraciones y seguir las novedades del proyecto.',
            '',
            'No se realizan anuncios masivos ni se envían mensajes privados no solicitados.',
          ].join('\n'),
          color: 0x5865f2,
          fields: [
            { name: 'Invitación', value: PROJECT.discord, inline: false },
            { name: 'Creador', value: PROJECT.creator, inline: true },
          ],
        }),
      ],
      components: [projectLinksRow()],
    });
  },
};

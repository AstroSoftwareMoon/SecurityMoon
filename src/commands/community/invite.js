// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { INVITE_PERMISSIONS, PROJECT } from '../../constants.js';
import { baseEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder().setName('invite').setDescription('Obtén el enlace para invitar a SecurityMoon.'),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    const clientId = interaction.client.application?.id ?? interaction.client.config.clientId;
    const permissions = INVITE_PERMISSIONS.reduce((total, name) => {
      const bit = PermissionFlagsBits[name];
      return bit === undefined ? total : total | bit;
    }, 0n);
    const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '➕ Invitar a SecurityMoon',
          description:
            'Añade el bot a tu servidor. Después ejecuta `/setup` para configurar los canales y los sistemas de seguridad.',
          color: 0x7c6cf5,
          fields: [
            { name: 'Permisos solicitados', value: INVITE_PERMISSIONS.join(', '), inline: false },
            {
              name: 'Recomendación',
              value: 'Revisa los permisos antes de autorizar y coloca el rol del bot por encima de los roles que debe moderar.',
              inline: false,
            },
            { name: 'Creador', value: PROJECT.creator, inline: true },
            { name: 'Licencia', value: PROJECT.license, inline: true },
          ],
        }),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Invitar al servidor').setEmoji('➕').setStyle(ButtonStyle.Link).setURL(url),
        ),
      ],
    });
  },
};

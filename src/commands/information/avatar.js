// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from 'discord.js';
import { baseEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Muestra el avatar de un usuario.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Usuario (por defecto tú).'),
    ),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const avatar = user.displayAvatarURL({ size: 4096 });
    const banner = user.bannerURL({ size: 4096 });
    const components = [];
    if (banner) {
      components.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Ver banner').setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(banner),
          new ButtonBuilder().setLabel('Ver avatar').setEmoji('👤').setStyle(ButtonStyle.Link).setURL(avatar),
        ),
      );
    }
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: `🖼️ Avatar de ${user.tag}`,
          color: 0x7c6cf5,
          image: avatar,
          fields: banner ? [{ name: 'Banner', value: `[Abrir](${banner})`, inline: false }] : [],
        }),
      ],
      components,
    });
  },
};

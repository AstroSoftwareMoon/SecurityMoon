// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, SlashCommandBuilder, version as discordJsVersion } from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed, projectLinksRow } from '../../utils/embeds.js';
import { formatUptime } from '../../utils/time.js';
import { VERSION } from '../../utils/version.js';

export default {
  data: new SlashCommandBuilder().setName('botinfo').setDescription('Muestra información sobre SecurityMoon.'),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    const client = interaction.client;
    const embed = baseEmbed({
      title: `🌙 ${PROJECT.name}`,
      description:
        'Bot de seguridad gratuito y de código abierto para Discord. Protección contra raids, nukes, phishing, spam y abuso de permisos.',
      color: 0x7c6cf5,
      thumbnail: client.user.displayAvatarURL({ size: 256 }),
      fields: [
        { name: 'Versión', value: VERSION, inline: true },
        { name: 'Creador', value: PROJECT.creator, inline: true },
        { name: 'Licencia', value: PROJECT.license, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'Discord.js', value: `v${discordJsVersion}`, inline: true },
        { name: 'Uptime', value: formatUptime(client.uptime ?? 0), inline: true },
        { name: 'Servidores', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Usuarios', value: `${client.users.cache.size}`, inline: true },
        { name: 'Repositorio', value: PROJECT.repository, inline: false },
      ],
      footer: `${PROJECT.name} • ${PROJECT.creator}`,
    });
    return interaction.reply({
      embeds: [embed],
      components: [projectLinksRow()],
      flags: MessageFlags.Ephemeral,
    });
  },
};

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { SlashCommandBuilder } from 'discord.js';
import { baseEmbed } from '../../utils/embeds.js';
import { discordTimestamp } from '../../utils/time.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Muestra información de un usuario.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Usuario a consultar (por defecto tú).'),
    ),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const roles = member
      ? [...member.roles.cache.values()]
          .filter((role) => role.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .slice(0, 15)
          .map((role) => `<@&${role.id}>`)
          .join(', ')
      : 'No está en el servidor';
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: `👤 ${user.tag}`,
          color: 0x5865f2,
          thumbnail: user.displayAvatarURL({ size: 256 }),
          fields: [
            { name: 'ID', value: `\`${user.id}\``, inline: true },
            { name: 'Cuenta creada', value: discordTimestamp(user.createdAt), inline: true },
            { name: 'Bot', value: user.bot ? 'Sí' : 'No', inline: true },
            { name: 'Se unió', value: member ? discordTimestamp(member.joinedAt) : '—', inline: true },
            { name: 'Apodo', value: member?.nickname ?? '—', inline: true },
            { name: 'Rol más alto', value: member ? `<@&${member.roles.highest.id}>` : '—', inline: true },
            { name: 'Roles', value: roles || 'Ninguno', inline: false },
          ],
          footer: `Solicitado por ${interaction.user.tag}`,
        }),
      ],
    });
  },
};

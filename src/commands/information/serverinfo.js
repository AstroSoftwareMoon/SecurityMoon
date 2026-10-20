// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { SlashCommandBuilder } from 'discord.js';
import { baseEmbed } from '../../utils/embeds.js';
import { discordTimestamp } from '../../utils/time.js';

const VERIFICATION_LABELS = ['Ninguna', 'Baja', 'Media', 'Alta', 'Muy alta'];

export default {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Muestra información del servidor.'),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);
    const channels = guild.channels.cache;
    const text = channels.filter((channel) => channel.isTextBased()).size;
    const voice = channels.filter((channel) => channel.isVoiceBased()).size;
    const categories = channels.filter((channel) => channel.type === 4).size;
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: `🏠 ${guild.name}`,
          color: 0x7c6cf5,
          thumbnail: guild.iconURL({ size: 256 }),
          fields: [
            { name: 'ID', value: `\`${guild.id}\``, inline: true },
            { name: 'Propietario', value: owner ? `${owner.user.tag}` : `<@${guild.ownerId}>`, inline: true },
            { name: 'Creado', value: discordTimestamp(guild.createdAt), inline: true },
            { name: 'Miembros', value: `${guild.memberCount}`, inline: true },
            { name: 'Canales', value: `${text} texto · ${voice} voz · ${categories} categorías`, inline: true },
            { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
            { name: 'Nivel de mejora', value: `${guild.premiumTier}`, inline: true },
            { name: 'Verificación', value: VERIFICATION_LABELS[guild.verificationLevel] ?? String(guild.verificationLevel), inline: true },
            { name: 'Emojis', value: `${guild.emojis.cache.size}`, inline: true },
          ],
          footer: `Solicitado por ${interaction.user.tag}`,
        }),
      ],
    });
  },
};

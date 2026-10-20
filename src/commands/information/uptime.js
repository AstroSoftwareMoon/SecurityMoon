// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { baseEmbed } from '../../utils/embeds.js';
import { discordTimestamp, formatUptime } from '../../utils/time.js';

export default {
  data: new SlashCommandBuilder().setName('uptime').setDescription('Muestra el tiempo en línea del bot.'),
  permissions: [],
  cooldown: 1000,
  async execute(interaction) {
    const client = interaction.client;
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '🌙 Tiempo en línea',
          color: 0x57f287,
          fields: [
            { name: 'Uptime', value: formatUptime(client.uptime ?? 0), inline: true },
            { name: 'Conectado desde', value: client.readyAt ? discordTimestamp(client.readyAt) : '—', inline: true },
            { name: 'Proceso', value: formatUptime(process.uptime() * 1000), inline: true },
          ],
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { baseEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder().setName('ping').setDescription('Comprueba la latencia del bot.'),
  permissions: [],
  cooldown: 1000,
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const started = Date.now();
    await interaction.editReply({
      embeds: [baseEmbed({ title: '🌙 Calculando latencia…' })],
    });
    const roundtrip = Date.now() - started;
    const websocket = Math.round(interaction.client.ws.ping);
    return interaction.editReply({
      embeds: [
        baseEmbed({
          title: '🏓 Pong',
          color: websocket < 200 ? 0x57f287 : websocket < 500 ? 0xfee75c : 0xed4245,
          fields: [
            { name: 'WebSocket', value: `${websocket} ms`, inline: true },
            { name: 'Respuesta API', value: `${roundtrip} ms`, inline: true },
            { name: 'Estado', value: interaction.client.ws.status, inline: true },
          ],
        }),
      ],
    });
  },
};

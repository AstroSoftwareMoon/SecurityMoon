// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { MODULE_KEYS, MODULES, PROJECT } from '../../constants.js';
import { baseEmbed, statusBadge } from '../../utils/embeds.js';
import { formatBytes, formatUptime } from '../../utils/time.js';
import { VERSION } from '../../utils/version.js';

export default {
  data: new SlashCommandBuilder().setName('status').setDescription('Muestra el estado operativo del bot.'),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    const client = interaction.client;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const settings = await client.stores.guilds.get(interaction.guild.id);
    const modules = MODULE_KEYS.map(
      (key) => `${MODULES[key].emoji} ${MODULES[key].name}: ${statusBadge(settings.modules[key].enabled)}`,
    ).join('\n');
    return interaction.editReply({
      embeds: [
        baseEmbed({
          title: `🌙 ${PROJECT.name} — Estado`,
          color: client.ws.status === 0 ? 0x57f287 : 0xed4245,
          fields: [
            { name: 'Estado', value: `${client.ws.status === 0 ? '🟢 En línea' : '🟠 Conectando'}`, inline: true },
            { name: 'WebSocket', value: `${Math.round(client.ws.ping)} ms`, inline: true },
            { name: 'Uptime', value: formatUptime(client.uptime ?? 0), inline: true },
            { name: 'Servidores', value: `${client.guilds.cache.size}`, inline: true },
            { name: 'Usuarios en caché', value: `${client.users.cache.size}`, inline: true },
            { name: 'Memoria', value: formatBytes(process.memoryUsage().rss), inline: true },
            { name: 'Shards', value: `${client.ws.shards.size}`, inline: true },
            { name: 'Versión', value: VERSION, inline: true },
            { name: 'Node.js', value: process.version, inline: true },
            { name: 'Módulos en este servidor', value: modules, inline: false },
            {
              name: 'Modo emergencia',
              value: settings.emergency.active ? '🚨 Activo' : '🌙 Inactivo',
              inline: true,
            },
          ],
        }),
      ],
    });
  },
};

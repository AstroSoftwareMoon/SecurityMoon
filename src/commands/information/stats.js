// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { baseEmbed } from '../../utils/embeds.js';
import { formatDate } from '../../utils/time.js';

const COUNTER_LABELS = Object.freeze({
  messagesScanned: 'Mensajes analizados',
  linksScanned: 'Enlaces analizados',
  spamBlocked: 'Spam bloqueado',
  phishingBlocked: 'Phishing bloqueado',
  raidsDetected: 'Raids detectados',
  nukesBlocked: 'Nukes bloqueados',
  sanctionsApplied: 'Sanciones aplicadas',
  incidents: 'Incidentes',
  commandsUsed: 'Comandos usados',
  joins: 'Entradas',
  leaves: 'Salidas',
  warnings: 'Advertencias',
  moderationActions: 'Acciones de moderación',
});

export default {
  data: new SlashCommandBuilder().setName('stats').setDescription('Muestra estadísticas de seguridad del servidor.'),
  permissions: [],
  cooldown: 2000,
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const stats = await interaction.client.stats.snapshot(interaction.guild.id);
    const fields = Object.entries(COUNTER_LABELS).map(([key, label]) => ({
      name: label,
      value: (stats.counters[key] ?? 0).toLocaleString('es-ES'),
      inline: true,
    }));
    return interaction.editReply({
      embeds: [
        baseEmbed({
          title: `📊 Estadísticas de ${interaction.guild.name}`,
          description: `Contadores desde ${formatDate(stats.since)}. Los datos se guardan en JSON y sobreviven a los reinicios.`,
          color: 0x7c6cf5,
          fields,
          footer: `Miembros actuales: ${interaction.guild.memberCount}`,
        }),
      ],
    });
  },
};

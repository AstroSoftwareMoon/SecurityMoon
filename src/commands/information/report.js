// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed, projectLinksRow, truncate } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Envía un reporte local al equipo de administración del servidor.')
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('Categoría del reporte.')
        .setRequired(true)
        .addChoices(
          { name: '🐛 Error del bot', value: 'bug' },
          { name: '🛡️ Problema de seguridad', value: 'security' },
          { name: '🚨 Abuso o conducta', value: 'abuse' },
          { name: '💡 Sugerencia', value: 'suggestion' },
          { name: '📝 Otro', value: 'other' },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('details')
        .setDescription('Describe el problema sin incluir contraseñas ni tokens.')
        .setMinLength(10)
        .setMaxLength(1500)
        .setRequired(true),
    ),
  confirmation: { danger: false },
  permissions: [],
  cooldown: 30_000,
  async execute(interaction) {
    const category = interaction.options.getString('category', true);
    const details = interaction.options.getString('details', true).trim();
    if (/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{20,}/.test(details)) {
      return interaction.reply({
        content: 'El reporte parece contener un token. Elimínalo antes de enviarlo.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const { incident } = await interaction.client.incidents.record({
      guildId: interaction.guild.id,
      type: 'report',
      severity: category === 'security' || category === 'abuse' ? 'high' : 'low',
      actorId: interaction.user.id,
      description: `Reporte (${category}) de ${interaction.user.tag}: ${truncate(details, 1200)}`,
      action: 'Reporte almacenado localmente',
      result: 'Disponible para los administradores mediante /incident y en el canal de alertas.',
      channelId: interaction.channelId,
      alert: true,
    });

    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '📨 Reporte registrado',
          description: `Tu reporte se guardó como incidente **#${incident.id}**. Los administradores pueden revisarlo con \`/incident view id:${incident.id}\`.\n\nNo se envía automáticamente a servicios externos. Para fallos del proyecto también puedes abrir un issue en GitHub.`,
          color: 0x57f287,
          fields: [
            { name: 'Categoría', value: category, inline: true },
            { name: 'Servidor', value: interaction.guild.name, inline: true },
            { name: 'Detalles', value: truncate(details, 1024), inline: false },
          ],
          footer: `${PROJECT.name} • ${PROJECT.creator}`,
        }),
      ],
      components: [projectLinksRow()],
      flags: MessageFlags.Ephemeral,
    });
  },
};

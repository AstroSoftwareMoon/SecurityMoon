// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { MODULE_KEYS, MODULES, PROTECTION_PRESETS } from '../../constants.js';
import { baseEmbed, progressBar, statusBadge, truncate } from '../../utils/embeds.js';
import { securitySnapshot } from '../../utils/security-view.js';

export default {
  data: new SlashCommandBuilder()
    .setName('securitycheck')
    .setDescription('Realiza una auditoría de la configuración de seguridad.'),
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 3000,
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const snapshot = await securitySnapshot(interaction.client, interaction.guild);
    const { settings, analysis } = snapshot;

    const checks = analysis.checks
      .map((check) => {
        const icon = check.level === 'ok' ? '✅' : check.level === 'warning' ? '⚠️' : '❌';
        return `${icon} ${check.text}`;
      })
      .join('\n');
    const recommendations = analysis.recommendations
      .map((item) => `• **${item.severity}:** ${item.text}`)
      .join('\n');
    const modules = MODULE_KEYS.map(
      (key) => `${MODULES[key].emoji} ${MODULES[key].name}: ${statusBadge(settings.modules[key].enabled)}`,
    ).join('\n');

    return interaction.editReply({
      embeds: [
        baseEmbed({
          title: '🔍 Auditoría de seguridad',
          description: `Puntuación: **${analysis.score}/100** (${analysis.grade})\n${progressBar(analysis.score)}`,
          color: analysis.score >= 65 ? 0x57f287 : analysis.score >= 40 ? 0xfee75c : 0xed4245,
          fields: [
            {
              name: 'Nivel de protección',
              value: PROTECTION_PRESETS[settings.protectionLevel]?.label ?? settings.protectionLevel,
              inline: true,
            },
            {
              name: 'Emergencia',
              value: settings.emergency.active ? '🚨 Activa' : '🌙 Inactiva',
              inline: true,
            },
            { name: 'Comprobaciones', value: truncate(checks, 1024), inline: false },
            { name: 'Módulos', value: truncate(modules, 1024), inline: false },
            {
              name: 'Recomendaciones',
              value: truncate(recommendations || 'No hay recomendaciones pendientes.', 1024),
              inline: false,
            },
          ],
        }),
      ],
    });
  },
};

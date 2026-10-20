// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { RAID_ACTIONS } from '../../constants.js';
import {
  collectChanges,
  replyModuleStatus,
  resetModuleSettings,
  setModuleEnabled,
  updateModuleSettings,
} from '../../utils/module-command.js';

const ACTION_LABELS = {
  alert: '👀 Solo alerta',
  timeout: '⏳ Timeout',
  kick: '👢 Expulsar',
  ban: '🔨 Banear',
  lockdown: '🛡️ Bloqueo de verificación',
};

export default {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Configura la protección contra raids de miembros.')
    .addSubcommand((sub) => sub.setName('status').setDescription('Muestra el estado actual.'))
    .addSubcommand((sub) => sub.setName('enable').setDescription('Activa Anti-Raid.'))
    .addSubcommand((sub) => sub.setName('disable').setDescription('Desactiva Anti-Raid.'))
    .addSubcommand((sub) =>
      sub
        .setName('action')
        .setDescription('Define la acción al detectar un raid.')
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Acción a aplicar.')
            .setRequired(true)
            .addChoices(...RAID_ACTIONS.map((value) => ({ name: ACTION_LABELS[value], value }))),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('configure')
        .setDescription('Ajusta umbrales y comportamiento.')
        .addIntegerOption((option) =>
          option.setName('threshold').setDescription('Entradas necesarias (2-100).').setMinValue(2).setMaxValue(100),
        )
        .addIntegerOption((option) =>
          option.setName('interval').setDescription('Intervalo en segundos (5-600).').setMinValue(5).setMaxValue(600),
        )
        .addIntegerOption((option) =>
          option.setName('cooldown').setDescription('Duración de la contención en segundos (30-3600).').setMinValue(30).setMaxValue(3600),
        )
        .addIntegerOption((option) =>
          option.setName('min_account_age').setDescription('Días mínimos de antigüedad de cuenta (0-365).').setMinValue(0).setMaxValue(365),
        )
        .addBooleanOption((option) =>
          option.setName('auto_emergency').setDescription('Activar emergencia en raids recurrentes.'),
        )
        .addBooleanOption((option) =>
          option.setName('ignore_bots').setDescription('Ignorar cuentas de bots al contar entradas.'),
        ),
    )
    .addSubcommand((sub) => sub.setName('reset').setDescription('Restablece Anti-Raid a los valores predeterminados.')),
  confirmation: {
    subcommands: ['enable', 'disable', 'action', 'configure', 'reset'],
    dangerSubcommands: ['disable', 'action', 'reset'],
  },
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2500,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand(true);
    if (sub === 'status') return replyModuleStatus(interaction, 'antiRaid');
    if (sub === 'enable') return setModuleEnabled(interaction, 'antiRaid', true);
    if (sub === 'disable') return setModuleEnabled(interaction, 'antiRaid', false);
    if (sub === 'action') {
      const action = interaction.options.getString('action', true);
      return updateModuleSettings(interaction, 'antiRaid', { action });
    }
    if (sub === 'configure') {
      const changes = collectChanges(interaction, {
        joinThreshold: { name: 'threshold', type: 'integer' },
        joinIntervalSeconds: { name: 'interval', type: 'integer' },
        raidCooldownSeconds: { name: 'cooldown', type: 'integer' },
        minAccountAgeDays: { name: 'min_account_age', type: 'integer' },
        autoEmergency: { name: 'auto_emergency', type: 'boolean' },
        ignoreBots: { name: 'ignore_bots', type: 'boolean' },
      });
      return updateModuleSettings(interaction, 'antiRaid', changes);
    }
    if (sub === 'reset') return resetModuleSettings(interaction, 'antiRaid');
    return null;
  },
};

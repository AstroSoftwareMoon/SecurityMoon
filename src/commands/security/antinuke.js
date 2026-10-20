// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { NUKE_ACTIONS } from '../../constants.js';
import {
  collectChanges,
  replyModuleStatus,
  resetModuleSettings,
  setModuleEnabled,
  updateModuleSettings,
} from '../../utils/module-command.js';

const ACTION_LABELS = {
  alert: '👀 Solo alerta',
  strip_roles: '🎭 Retirar roles peligrosos',
  kick: '👢 Expulsar',
  ban: '🔨 Banear',
  lockdown: '🛡️ Bloqueo de verificación',
};

export default {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Configura la protección contra acciones destructivas.')
    .addSubcommand((sub) => sub.setName('status').setDescription('Muestra el estado actual.'))
    .addSubcommand((sub) => sub.setName('enable').setDescription('Activa Anti-Nuke.'))
    .addSubcommand((sub) => sub.setName('disable').setDescription('Desactiva Anti-Nuke.'))
    .addSubcommand((sub) =>
      sub
        .setName('action')
        .setDescription('Define la acción de contención.')
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Acción a aplicar.')
            .setRequired(true)
            .addChoices(...NUKE_ACTIONS.map((value) => ({ name: ACTION_LABELS[value], value }))),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('configure')
        .setDescription('Ajusta la ventana y los umbrales de acciones.')
        .addIntegerOption((option) =>
          option.setName('window').setDescription('Ventana en segundos (10-600).').setMinValue(10).setMaxValue(600),
        )
        .addIntegerOption((option) =>
          option.setName('channel_delete').setDescription('Canales eliminados permitidos (1-25).').setMinValue(1).setMaxValue(25),
        )
        .addIntegerOption((option) =>
          option.setName('role_delete').setDescription('Roles eliminados permitidos (1-25).').setMinValue(1).setMaxValue(25),
        )
        .addIntegerOption((option) =>
          option.setName('channel_create').setDescription('Canales creados permitidos (1-25).').setMinValue(1).setMaxValue(25),
        )
        .addIntegerOption((option) =>
          option.setName('role_create').setDescription('Roles creados permitidos (1-25).').setMinValue(1).setMaxValue(25),
        )
        .addIntegerOption((option) =>
          option.setName('ban').setDescription('Baneos permitidos (1-25).').setMinValue(1).setMaxValue(25),
        )
        .addIntegerOption((option) =>
          option.setName('kick').setDescription('Expulsiones permitidas (1-25).').setMinValue(1).setMaxValue(25),
        )
        .addIntegerOption((option) =>
          option.setName('permission_change').setDescription('Cambios de permisos permitidos (1-25).').setMinValue(1).setMaxValue(25),
        ),
    )
    .addSubcommand((sub) => sub.setName('reset').setDescription('Restablece Anti-Nuke a los valores predeterminados.')),
  confirmation: {
    subcommands: ['enable', 'disable', 'action', 'configure', 'reset'],
    dangerSubcommands: ['disable', 'action', 'reset'],
  },
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2500,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand(true);
    if (sub === 'status') return replyModuleStatus(interaction, 'antiNuke');
    if (sub === 'enable') return setModuleEnabled(interaction, 'antiNuke', true);
    if (sub === 'disable') return setModuleEnabled(interaction, 'antiNuke', false);
    if (sub === 'action') {
      return updateModuleSettings(interaction, 'antiNuke', {
        action: interaction.options.getString('action', true),
      });
    }
    if (sub === 'configure') {
      const flat = collectChanges(interaction, {
        windowSeconds: { name: 'window', type: 'integer' },
        channelDelete: { name: 'channel_delete', type: 'integer' },
        roleDelete: { name: 'role_delete', type: 'integer' },
        channelCreate: { name: 'channel_create', type: 'integer' },
        roleCreate: { name: 'role_create', type: 'integer' },
        ban: { name: 'ban', type: 'integer' },
        kick: { name: 'kick', type: 'integer' },
        permissionChange: { name: 'permission_change', type: 'integer' },
      });
      const changes = {};
      if (flat.windowSeconds !== undefined) changes.windowSeconds = flat.windowSeconds;
      const thresholds = {};
      for (const key of ['channelDelete', 'roleDelete', 'channelCreate', 'roleCreate', 'ban', 'kick', 'permissionChange']) {
        if (flat[key] !== undefined) thresholds[key] = flat[key];
      }
      if (Object.keys(thresholds).length > 0) changes.thresholds = thresholds;
      return updateModuleSettings(interaction, 'antiNuke', changes);
    }
    if (sub === 'reset') return resetModuleSettings(interaction, 'antiNuke');
    return null;
  },
};

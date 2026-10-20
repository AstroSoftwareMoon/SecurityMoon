// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { PHISHING_ACTIONS } from '../../constants.js';
import {
  collectChanges,
  replyModuleStatus,
  resetModuleSettings,
  setModuleEnabled,
  updateModuleSettings,
} from '../../utils/module-command.js';

const ACTION_LABELS = {
  alert: '👀 Solo alerta',
  delete: '🧹 Eliminar mensaje',
  delete_with_warning: '🧹 Eliminar + advertencia',
  delete_with_timeout: '🧹 Eliminar + timeout',
};

export default {
  data: new SlashCommandBuilder()
    .setName('antiphishing')
    .setDescription('Configura la detección de enlaces sospechosos.')
    .addSubcommand((sub) => sub.setName('status').setDescription('Muestra el estado actual.'))
    .addSubcommand((sub) => sub.setName('enable').setDescription('Activa Anti-Phishing.'))
    .addSubcommand((sub) => sub.setName('disable').setDescription('Desactiva Anti-Phishing.'))
    .addSubcommand((sub) =>
      sub
        .setName('action')
        .setDescription('Define la acción ante enlaces sospechosos.')
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Acción a aplicar.')
            .setRequired(true)
            .addChoices(...PHISHING_ACTIONS.map((value) => ({ name: ACTION_LABELS[value], value }))),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('configure')
        .setDescription('Ajusta la sensibilidad y las invitaciones.')
        .addIntegerOption((option) =>
          option
            .setName('threshold')
            .setDescription('Puntuación mínima para considerar sospechoso (1-10).')
            .setMinValue(1)
            .setMaxValue(10),
        )
        .addBooleanOption((option) =>
          option.setName('block_invites').setDescription('Tratar invitaciones de Discord como sospechosas.'),
        ),
    )
    .addSubcommand((sub) => sub.setName('reset').setDescription('Restablece Anti-Phishing a los valores predeterminados.')),
  confirmation: {
    subcommands: ['enable', 'disable', 'action', 'configure', 'reset'],
    dangerSubcommands: ['disable', 'action', 'reset'],
  },
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2500,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand(true);
    if (sub === 'status') return replyModuleStatus(interaction, 'antiPhishing');
    if (sub === 'enable') return setModuleEnabled(interaction, 'antiPhishing', true);
    if (sub === 'disable') return setModuleEnabled(interaction, 'antiPhishing', false);
    if (sub === 'action') {
      return updateModuleSettings(interaction, 'antiPhishing', {
        action: interaction.options.getString('action', true),
      });
    }
    if (sub === 'configure') {
      const changes = collectChanges(interaction, {
        suspiciousScoreThreshold: { name: 'threshold', type: 'integer' },
        blockInvites: { name: 'block_invites', type: 'boolean' },
      });
      return updateModuleSettings(interaction, 'antiPhishing', changes);
    }
    if (sub === 'reset') return resetModuleSettings(interaction, 'antiPhishing');
    return null;
  },
};

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { SPAM_ACTIONS } from '../../constants.js';
import {
  collectChanges,
  replyModuleStatus,
  resetModuleSettings,
  setModuleEnabled,
  updateModuleSettings,
} from '../../utils/module-command.js';

const ACTION_LABELS = {
  warn: '⚠️ Advertencia',
  timeout: '⏳ Timeout',
  kick: '👢 Expulsar',
  ban: '🔨 Banear',
};

export default {
  data: new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('Configura la detección de spam y flood.')
    .addSubcommand((sub) => sub.setName('status').setDescription('Muestra el estado actual.'))
    .addSubcommand((sub) => sub.setName('enable').setDescription('Activa Anti-Spam.'))
    .addSubcommand((sub) => sub.setName('disable').setDescription('Desactiva Anti-Spam.'))
    .addSubcommand((sub) =>
      sub
        .setName('action')
        .setDescription('Define la sanción inicial por spam.')
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Acción a aplicar.')
            .setRequired(true)
            .addChoices(...SPAM_ACTIONS.map((value) => ({ name: ACTION_LABELS[value], value }))),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('configure')
        .setDescription('Ajusta los umbrales de detección.')
        .addIntegerOption((option) =>
          option.setName('messages').setDescription('Mensajes por ventana (2-30).').setMinValue(2).setMaxValue(30),
        )
        .addIntegerOption((option) =>
          option.setName('window').setDescription('Ventana de mensajes en segundos (3-120).').setMinValue(3).setMaxValue(120),
        )
        .addIntegerOption((option) =>
          option.setName('duplicates').setDescription('Mensajes idénticos permitidos (2-15).').setMinValue(2).setMaxValue(15),
        )
        .addIntegerOption((option) =>
          option.setName('duplicate_window').setDescription('Ventana de duplicados en segundos (5-300).').setMinValue(5).setMaxValue(300),
        )
        .addIntegerOption((option) =>
          option.setName('mentions').setDescription('Menciones por mensaje (2-30).').setMinValue(2).setMaxValue(30),
        )
        .addIntegerOption((option) =>
          option.setName('links').setDescription('Enlaces por mensaje (2-15).').setMinValue(2).setMaxValue(15),
        )
        .addIntegerOption((option) =>
          option.setName('emojis').setDescription('Emojis por mensaje (5-50).').setMinValue(5).setMaxValue(50),
        )
        .addIntegerOption((option) =>
          option.setName('timeout_seconds').setDescription('Duración del timeout (60-2419200).').setMinValue(60).setMaxValue(2419200),
        )
        .addBooleanOption((option) =>
          option.setName('escalate').setDescription('Aumentar la sanción con reincidencias.'),
        )
        .addBooleanOption((option) =>
          option.setName('delete_messages').setDescription('Eliminar los mensajes detectados.'),
        ),
    )
    .addSubcommand((sub) => sub.setName('reset').setDescription('Restablece Anti-Spam a los valores predeterminados.')),
  confirmation: {
    subcommands: ['enable', 'disable', 'action', 'configure', 'reset'],
    dangerSubcommands: ['disable', 'action', 'reset'],
  },
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2500,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand(true);
    if (sub === 'status') return replyModuleStatus(interaction, 'antiSpam');
    if (sub === 'enable') return setModuleEnabled(interaction, 'antiSpam', true);
    if (sub === 'disable') return setModuleEnabled(interaction, 'antiSpam', false);
    if (sub === 'action') {
      return updateModuleSettings(interaction, 'antiSpam', {
        action: interaction.options.getString('action', true),
      });
    }
    if (sub === 'configure') {
      const changes = collectChanges(interaction, {
        messageThreshold: { name: 'messages', type: 'integer' },
        messageWindowSeconds: { name: 'window', type: 'integer' },
        duplicateThreshold: { name: 'duplicates', type: 'integer' },
        duplicateWindowSeconds: { name: 'duplicate_window', type: 'integer' },
        mentionThreshold: { name: 'mentions', type: 'integer' },
        linkThreshold: { name: 'links', type: 'integer' },
        emojiThreshold: { name: 'emojis', type: 'integer' },
        timeoutSeconds: { name: 'timeout_seconds', type: 'integer' },
        escalate: { name: 'escalate', type: 'boolean' },
        deleteMessages: { name: 'delete_messages', type: 'boolean' },
      });
      return updateModuleSettings(interaction, 'antiSpam', changes);
    }
    if (sub === 'reset') return resetModuleSettings(interaction, 'antiSpam');
    return null;
  },
};

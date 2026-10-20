// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {
  MODULE_KEYS,
  MODULES,
  PHISHING_ACTIONS,
  PROTECTION_PRESETS,
  RAID_ACTIONS,
  SPAM_ACTIONS,
} from '../constants.js';
import { baseEmbed, progressBar, truncate } from '../utils/embeds.js';
import { defaultGuildSettings } from '../storage/schemas.js';
import { UserError } from '../utils/errors.js';
import {
  actionRow,
  denyPanel,
  hasPanelPermission,
  panelButton,
  PANEL_FLAGS,
  parseBoolean,
  parseBooleanList,
  parseChoice,
  parseInteger,
} from './shared.js';

const STEP_COUNT = 10;
const SESSION_TTL_MS = 30 * 60 * 1000;
const sessions = new Map();

const STEP_EMOJI = Object.freeze(['🌙', '🛡️', '📣', '🗂️', '🔨', '🧩', '🚨', '💬', '🎣', '✅']);

const STEP_TEXT = Object.freeze([
  'Bienvenido al asistente de SecurityMoon. Configuraremos el servidor en menos de dos minutos. Nada se guarda hasta que confirmes en el último paso.',
  'Elige el nivel de protección inicial. Podrás ajustar cada módulo después desde el panel o con los comandos de seguridad.',
  'Selecciona el canal donde SecurityMoon enviará alertas de incidentes. Puedes omitirlo y configurarlo más tarde.',
  'Selecciona el canal de registros para conservar evidencia de seguridad y moderación.',
  'Selecciona el canal de moderación donde se publicarán las sanciones y casos.',
  'Activa los módulos que quieres usar. Todos están incluidos y no requieren permisos adicionales de pago.',
  'Ajusta el Anti-Raid. Los valores propuestos son los del nivel de protección elegido; puedes mantenerlos.',
  'Ajusta el Anti-Spam. El escalado aplica sanciones progresivas a reincidentes.',
  'Ajusta el Anti-Phishing. Los enlaces se analizan con heurísticas locales; no se consultan servicios externos.',
  'Revisa el resumen. Al confirmar se guardará la configuración del servidor y se creará una copia de seguridad si ya existían datos.',
]);

function keyFor(interaction) {
  return `${interaction.guild.id}:${interaction.user.id}`;
}

function createSession(interaction) {
  const draft = defaultGuildSettings(interaction.guild.id);
  draft.setupCompleted = false;
  const session = {
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    step: 0,
    draft,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sessions.set(keyFor(interaction), session);
  return session;
}

function getSession(interaction) {
  const session = sessions.get(keyFor(interaction));
  if (!session || Date.now() - session.updatedAt > SESSION_TTL_MS) {
    sessions.delete(keyFor(interaction));
    throw new UserError('La sesión de configuración caducó. Ejecuta `/setup` para empezar de nuevo.');
  }
  session.updatedAt = Date.now();
  return session;
}

function applyPresetToDraft(draft, level) {
  const preset = PROTECTION_PRESETS[level];
  draft.protectionLevel = level;
  for (const [key, changes] of Object.entries(preset.modules)) {
    if (!draft.modules[key]) continue;
    for (const [property, value] of Object.entries(changes)) {
      if (property === 'thresholds' && value && typeof value === 'object') {
        Object.assign(draft.modules[key].thresholds, value);
      } else {
        draft.modules[key][property] = value;
      }
    }
  }
}

function summaryFields(draft) {
  const enabled = MODULE_KEYS.filter((key) => draft.modules[key].enabled).map((key) => MODULES[key].name);
  return [
    {
      name: 'Nivel de protección',
      value: `${PROTECTION_PRESETS[draft.protectionLevel]?.emoji ?? ''} **${PROTECTION_PRESETS[draft.protectionLevel]?.label ?? draft.protectionLevel}**`,
      inline: true,
    },
    {
      name: 'Canales',
      value: [
        `Alertas: ${draft.channels.alerts ? `<#${draft.channels.alerts}>` : 'sin configurar'}`,
        `Registros: ${draft.channels.logs ? `<#${draft.channels.logs}>` : 'sin configurar'}`,
        `Moderación: ${draft.channels.modlog ? `<#${draft.channels.modlog}>` : 'sin configurar'}`,
      ].join('\n'),
      inline: true,
    },
    {
      name: 'Módulos activos',
      value: truncate(enabled.join(', ') || 'Ninguno', 1024),
      inline: false,
    },
    {
      name: 'Anti-Raid',
      value: `${draft.modules.antiRaid.joinThreshold} entradas / ${draft.modules.antiRaid.joinIntervalSeconds}s · ${draft.modules.antiRaid.action}`,
      inline: true,
    },
    {
      name: 'Anti-Spam',
      value: `${draft.modules.antiSpam.messageThreshold} mensajes / ${draft.modules.antiSpam.messageWindowSeconds}s · ${draft.modules.antiSpam.action}`,
      inline: true,
    },
    {
      name: 'Anti-Phishing',
      value: `umbral ${draft.modules.antiPhishing.suspiciousScoreThreshold} · ${draft.modules.antiPhishing.action}`,
      inline: true,
    },
  ];
}

function presetSelect(draft) {
  return new StringSelectMenuBuilder()
    .setCustomId('sm:setup:select:preset')
    .setPlaceholder('Selecciona el nivel de protección')
    .addOptions(
      Object.entries(PROTECTION_PRESETS).map(([level, preset]) => ({
        label: `${preset.emoji} ${preset.label}`,
        value: level,
        description: truncate(preset.description, 100),
        default: draft.protectionLevel === level,
      })),
    );
}

function channelSelect(customId, placeholder) {
  return new ChannelSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setMinValues(1)
    .setMaxValues(1)
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
}

function modulesSelect(draft) {
  return new StringSelectMenuBuilder()
    .setCustomId('sm:setup:select:modules')
    .setPlaceholder('Selecciona los módulos activos')
    .setMinValues(1)
    .setMaxValues(MODULE_KEYS.length)
    .addOptions(
      MODULE_KEYS.map((key) => ({
        label: MODULES[key].name,
        value: key,
        description: truncate(MODULES[key].description, 100),
        emoji: MODULES[key].emoji,
        default: draft.modules[key].enabled,
      })),
    );
}

function textInput(customId, label, value, { placeholder = null, maxLength = 200 } = {}) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label.slice(0, 45))
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(maxLength)
    .setValue(`${value}`.slice(0, maxLength));
  if (placeholder) input.setPlaceholder(placeholder.slice(0, 100));
  return actionRow(input);
}

function raidModal(draft) {
  const config = draft.modules.antiRaid;
  return new ModalBuilder()
    .setCustomId('sm:setup:modal:raid')
    .setTitle('Anti-Raid')
    .addComponents(
      textInput('threshold', 'Entradas necesarias (2-100)', config.joinThreshold),
      textInput('interval', 'Intervalo en segundos (5-600)', config.joinIntervalSeconds),
      textInput('action', `Acción: ${RAID_ACTIONS.join(', ')}`, config.action),
      textInput('account_age', 'Antigüedad mínima de cuenta (0-365 días)', config.minAccountAgeDays),
      textInput('auto_emergency', 'Emergencia automática (sí/no)', config.autoEmergency ? 'sí' : 'no'),
    );
}

function spamModal(draft) {
  const config = draft.modules.antiSpam;
  return new ModalBuilder()
    .setCustomId('sm:setup:modal:spam')
    .setTitle('Anti-Spam')
    .addComponents(
      textInput('messages', 'Mensajes por ventana (2-30)', config.messageThreshold),
      textInput('window', 'Ventana en segundos (3-120)', config.messageWindowSeconds),
      textInput('action', `Acción: ${SPAM_ACTIONS.join(', ')}`, config.action),
      textInput('timeout', 'Timeout en segundos (60-2419200)', config.timeoutSeconds),
      textInput('options', 'Escalar, borrar mensajes (sí/no, sí/no)', `${config.escalate ? 'sí' : 'no'},${config.deleteMessages ? 'sí' : 'no'}`),
    );
}

function phishingModal(draft) {
  const config = draft.modules.antiPhishing;
  return new ModalBuilder()
    .setCustomId('sm:setup:modal:phishing')
    .setTitle('Anti-Phishing')
    .addComponents(
      textInput('threshold', 'Puntuación sospechosa (1-10)', config.suspiciousScoreThreshold),
      textInput('action', `Acción: ${PHISHING_ACTIONS.join(', ')}`, config.action),
      textInput('block_invites', 'Bloquear invitaciones (sí/no)', config.blockInvites ? 'sí' : 'no'),
    );
}

function renderSetup(interaction, session, notice = null) {
  const { step, draft } = session;
  const embed = baseEmbed({
    title: `${STEP_EMOJI[step] ?? '🌙'} Configuración · Paso ${step + 1} de ${STEP_COUNT}`,
    description: STEP_TEXT[step],
    color: 0x7c6cf5,
    footer: 'SecurityMoon • Nada se guarda hasta confirmar',
  });
  embed.addFields({ name: 'Progreso', value: progressBar(((step + 1) / STEP_COUNT) * 100), inline: false });
  if (notice) embed.addFields({ name: 'Aviso', value: truncate(notice, 1024), inline: false });
  if (step >= 5) embed.addFields(...summaryFields(draft));

  const components = [];
  if (step === 0) {
    components.push(
      actionRow(
        panelButton('sm:setup:start', 'Comenzar', ButtonStyle.Primary, { emoji: '🌙' }),
        panelButton('sm:setup:cancel', 'Cancelar', ButtonStyle.Secondary, { emoji: '✖️' }),
      ),
    );
  } else if (step === 1) {
    components.push(
      actionRow(presetSelect(draft)),
      actionRow(panelButton('sm:setup:cancel', 'Cancelar', ButtonStyle.Secondary, { emoji: '✖️' })),
    );
  } else if (step >= 2 && step <= 4) {
    const kind = step === 2 ? 'alerts' : step === 3 ? 'logs' : 'modlog';
    const current = draft.channels[kind];
    const channel = current ? interaction.guild.channels.cache.get(current) : null;
    components.push(
      actionRow(
        channelSelect(
          `sm:setup:select:${kind}`,
          channel ? `Actual: #${channel.name}` : `Selecciona el canal de ${kind === 'alerts' ? 'alertas' : kind === 'logs' ? 'registros' : 'moderación'}`,
        ),
      ),
      actionRow(
        panelButton('sm:setup:skip', 'Omitir', ButtonStyle.Secondary, { emoji: '⏭️' }),
        panelButton('sm:setup:back', 'Atrás', ButtonStyle.Secondary, { emoji: '↩️' }),
        panelButton('sm:setup:cancel', 'Cancelar', ButtonStyle.Danger, { emoji: '✖️' }),
      ),
    );
  } else if (step === 5) {
    components.push(
      actionRow(modulesSelect(draft)),
      actionRow(
        panelButton('sm:setup:continue', 'Continuar', ButtonStyle.Primary, { emoji: '➡️' }),
        panelButton('sm:setup:back', 'Atrás', ButtonStyle.Secondary, { emoji: '↩️' }),
        panelButton('sm:setup:cancel', 'Cancelar', ButtonStyle.Danger, { emoji: '✖️' }),
      ),
    );
  } else if (step >= 6 && step <= 8) {
    const label = step === 6 ? 'Anti-Raid' : step === 7 ? 'Anti-Spam' : 'Anti-Phishing';
    components.push(
      actionRow(
        panelButton(`sm:setup:modal:${step === 6 ? 'raid' : step === 7 ? 'spam' : 'phishing'}`, `Configurar ${label}`, ButtonStyle.Primary, { emoji: '⚙️' }),
        panelButton('sm:setup:defaults', 'Usar valores propuestos', ButtonStyle.Secondary, { emoji: '✅' }),
      ),
      actionRow(
        panelButton('sm:setup:back', 'Atrás', ButtonStyle.Secondary, { emoji: '↩️' }),
        panelButton('sm:setup:cancel', 'Cancelar', ButtonStyle.Danger, { emoji: '✖️' }),
      ),
    );
  } else {
    components.push(
      actionRow(
        panelButton('sm:setup:confirm', 'Confirmar y guardar', ButtonStyle.Success, { emoji: '✅' }),
        panelButton('sm:setup:back', 'Atrás', ButtonStyle.Secondary, { emoji: '↩️' }),
        panelButton('sm:setup:cancel', 'Cancelar', ButtonStyle.Danger, { emoji: '✖️' }),
      ),
    );
  }
  return { embeds: [embed], components };
}

async function respondSetup(interaction, session, notice = null) {
  if (interaction.isModalSubmit()) {
    session.step = Math.max(session.step, 0);
  }
  const payload = renderSetup(interaction, session, notice);
  try {
    if (typeof interaction.isFromMessage === 'function' && interaction.isFromMessage()) {
      return await interaction.update(payload);
    }
  } catch {
    // Continúa con una respuesta nueva.
  }
  try {
    if (!interaction.isModalSubmit() && !interaction.replied && !interaction.deferred) {
      return await interaction.update(payload);
    }
  } catch {
    // Continúa con una respuesta nueva.
  }
  try {
    return await interaction.reply({ ...payload, flags: PANEL_FLAGS });
  } catch {
    return null;
  }
}

async function validateChannel(interaction, channelId) {
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased?.()) {
    throw new UserError('Selecciona un canal de texto válido.');
  }
  const permissions = channel.permissionsFor(interaction.guild.members.me);
  if (!permissions?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
    throw new UserError(
      `SecurityMoon necesita Ver canal, Enviar mensajes e Insertar enlaces en <#${channel.id}>.`,
    );
  }
  return channel;
}

async function saveSetup(interaction, session) {
  const draft = session.draft;
  draft.setupCompleted = true;
  await interaction.client.stores.guilds.save(interaction.guild.id, draft, { backup: true });
  await interaction.client.incidents.record({
    guildId: interaction.guild.id,
    type: 'system',
    severity: 'low',
    actorId: interaction.user.id,
    description: 'Configuración inicial completada mediante el asistente /setup.',
    action: `Nivel ${PROTECTION_PRESETS[draft.protectionLevel]?.label ?? draft.protectionLevel}`,
    result: 'Configuración guardada en JSON con copia de seguridad.',
    alert: false,
  });
  interaction.client.logger.info('Asistente de configuración completado', {
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    level: draft.protectionLevel,
  });
  sessions.delete(keyFor(interaction));
}

function completedPayload() {
  return {
    embeds: [
      baseEmbed({
        title: '✅ Configuración completada',
        description:
          'SecurityMoon ya está configurado en este servidor. La configuración se guardó en archivos JSON locales y se creó una copia de seguridad del archivo anterior.',
        color: 0x57f287,
        fields: [
          {
            name: 'Siguientes pasos',
            value: [
              '• Abre el panel para revisar módulos y canales.',
              '• Ejecuta `/securitycheck` para comprobar permisos y roles peligrosos.',
              '• Consulta `/help` para ver todos los comandos.',
            ].join('\n'),
            inline: false,
          },
        ],
      }),
    ],
    components: [
      actionRow(
        panelButton('sm:panel:view:overview', 'Abrir panel', ButtonStyle.Primary, { emoji: '🌙' }),
        panelButton('sm:panel:view:diagnostics', 'Ver diagnóstico', ButtonStyle.Secondary, { emoji: '🔍' }),
      ),
    ],
  };
}

export async function startSetup(interaction) {
  if (!hasPanelPermission(interaction)) return denyPanel(interaction);
  const session = createSession(interaction);
  session.step = 0;
  return interaction.reply({ ...renderSetup(interaction, session), flags: PANEL_FLAGS });
}

export async function handleSetupInteraction(interaction) {
  if (!hasPanelPermission(interaction)) return denyPanel(interaction);

  let session = null;
  try {
    if (interaction.isModalSubmit()) {
      const parts = interaction.customId.split(':');
      const kind = parts[3];
      session = getSession(interaction);
      const fields = interaction.fields;

      if (kind === 'raid') {
        const config = session.draft.modules.antiRaid;
        config.joinThreshold = parseInteger(fields, 'threshold', { min: 2, max: 100, label: 'Entradas' });
        config.joinIntervalSeconds = parseInteger(fields, 'interval', { min: 5, max: 600, label: 'Intervalo' });
        config.action = parseChoice(fields, 'action', RAID_ACTIONS, { label: 'Acción' });
        config.minAccountAgeDays = parseInteger(fields, 'account_age', { min: 0, max: 365, label: 'Antigüedad' });
        config.autoEmergency = parseBoolean(fields, 'auto_emergency', { label: 'Emergencia automática' });
        session.step = 7;
      } else if (kind === 'spam') {
        const config = session.draft.modules.antiSpam;
        config.messageThreshold = parseInteger(fields, 'messages', { min: 2, max: 30, label: 'Mensajes' });
        config.messageWindowSeconds = parseInteger(fields, 'window', { min: 3, max: 120, label: 'Ventana' });
        config.action = parseChoice(fields, 'action', SPAM_ACTIONS, { label: 'Acción' });
        config.timeoutSeconds = parseInteger(fields, 'timeout', { min: 60, max: 2419200, label: 'Timeout' });
        const [escalate, deleteMessages] = parseBooleanList(fields, 'options', 2, { label: 'Opciones' });
        config.escalate = escalate;
        config.deleteMessages = deleteMessages;
        session.step = 8;
      } else if (kind === 'phishing') {
        const config = session.draft.modules.antiPhishing;
        config.suspiciousScoreThreshold = parseInteger(fields, 'threshold', { min: 1, max: 10, label: 'Puntuación' });
        config.action = parseChoice(fields, 'action', PHISHING_ACTIONS, { label: 'Acción' });
        config.blockInvites = parseBoolean(fields, 'block_invites', { label: 'Bloquear invitaciones' });
        session.step = 9;
      } else {
        throw new UserError('Formulario del asistente no reconocido.');
      }
      return respondSetup(interaction, session);
    }

    if (interaction.isButton()) {
      const action = interaction.customId.split(':')[2];
      if (action === 'cancel') {
        sessions.delete(keyFor(interaction));
        return interaction.update({
          embeds: [
            baseEmbed({
              title: '🌙 Asistente cancelado',
              description: 'No se guardó ningún cambio. Puedes iniciar de nuevo con `/setup`.',
              color: 0x9aa0b5,
            }),
          ],
          components: [],
        });
      }
      if (action === 'start') {
        session = createSession(interaction);
        session.step = 1;
        return respondSetup(interaction, session);
      }

      session = getSession(interaction);
      if (action === 'back') {
        session.step = Math.max(0, session.step - 1);
        return respondSetup(interaction, session);
      }
      if (action === 'skip') {
        if (![2, 3, 4].includes(session.step)) throw new UserError('No hay nada que omitir en este paso.');
        const kind = session.step === 2 ? 'alerts' : session.step === 3 ? 'logs' : 'modlog';
        session.draft.channels[kind] = null;
        session.step += 1;
        return respondSetup(interaction, session, 'Canal omitido. Podrás configurarlo después.');
      }
      if (action === 'continue') {
        if (session.step === 5) session.step = 6;
        return respondSetup(interaction, session);
      }
      if (action === 'defaults') {
        if (![6, 7, 8].includes(session.step)) throw new UserError('Este paso no admite valores propuestos.');
        session.step += 1;
        return respondSetup(interaction, session, 'Se mantuvieron los valores propuestos.');
      }
      if (action === 'modal') {
        const kind = interaction.customId.split(':')[3];
        if (kind === 'raid') return interaction.showModal(raidModal(session.draft));
        if (kind === 'spam') return interaction.showModal(spamModal(session.draft));
        if (kind === 'phishing') return interaction.showModal(phishingModal(session.draft));
        throw new UserError('Formulario del asistente no reconocido.');
      }
      if (action === 'confirm') {
        if (session.step !== 9) throw new UserError('Completa todos los pasos antes de confirmar.');
        await saveSetup(interaction, session);
        return interaction.update(completedPayload());
      }
      throw new UserError('Acción del asistente no reconocida.');
    }

    if (interaction.isAnySelectMenu()) {
      session = getSession(interaction);
      const parts = interaction.customId.split(':');
      const group = parts[2];
      const value = interaction.values[0];

      if (group === 'select' && parts[3] === 'preset') {
        if (!PROTECTION_PRESETS[value]) throw new UserError('Nivel de protección desconocido.');
        applyPresetToDraft(session.draft, value);
        session.step = 2;
        return respondSetup(interaction, session);
      }
      if (group === 'select' && ['alerts', 'logs', 'modlog'].includes(parts[3])) {
        const kind = parts[3];
        const channel = await validateChannel(interaction, value);
        session.draft.channels[kind] = channel.id;
        session.step = kind === 'alerts' ? 3 : kind === 'logs' ? 4 : 5;
        return respondSetup(interaction, session, `Canal configurado en <#${channel.id}>.`);
      }
      if (group === 'select' && parts[3] === 'modules') {
        const selected = new Set(interaction.values);
        for (const key of MODULE_KEYS) {
          session.draft.modules[key].enabled = selected.has(key);
        }
        return respondSetup(interaction, session, 'Selección de módulos guardada para este borrador.');
      }
      throw new UserError('Selección del asistente no reconocida.');
    }

    return null;
  } catch (error) {
    if (error instanceof UserError) {
      try {
        if (session) {
          return await respondSetup(interaction, session, `❌ ${error.message}`);
        }
        return await interaction.reply({
          embeds: [baseEmbed({ title: '❌ Acción no completada', description: error.message, color: 0xed4245 })],
          flags: PANEL_FLAGS,
        });
      } catch {
        return null;
      }
    }
    throw error;
  }
}

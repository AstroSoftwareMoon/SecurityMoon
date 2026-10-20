// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { randomUUID } from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { ACTION_EMOJI, COLORS, EMOJI } from '../constants.js';
import { baseEmbed, warningEmbed } from './embeds.js';
import { PermissionError } from './errors.js';
import { replyError } from './responses.js';

const SESSION_TTL_MS = 5 * 60 * 1000;
const MAX_SESSIONS = 500;

const sessions = new Map();

function pruneSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }
  if (sessions.size > MAX_SESSIONS) {
    const oldest = [...sessions.values()]
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, sessions.size - MAX_SESSIONS);
    for (const session of oldest) sessions.delete(session.id);
  }
}

function subcommandOf(interaction) {
  try {
    return interaction.options.getSubcommand(false);
  } catch {
    return null;
  }
}

/**
 * Devuelve la configuración de confirmación aplicable o null si el comando
 * no necesita confirmación para esta invocación.
 */
export function getConfirmationConfig(command, interaction) {
  const config = command?.confirmation;
  if (!config) return null;
  if (typeof config === 'function') {
    return config(interaction) ?? null;
  }
  if (config === true) return {};
  if (config.subcommands) {
    const sub = subcommandOf(interaction);
    if (!sub || !config.subcommands.includes(sub)) return null;
  }
  if (config.when && !config.when(interaction)) return null;
  return config;
}

function formatValue(option) {
  const value = option.value;
  if (value === null || value === undefined) return '—';
  switch (option.type) {
    case 5:
      return value ? 'Sí' : 'No';
    case 6:
      return `<@${value}>`;
    case 7:
      return `<@&${value}>`;
    case 8:
      return `<#${value}>`;
    case 9:
      return option.member ? `<@${value}>` : `<@&${value}>`;
    case 11:
      return option.attachment?.name ?? 'Archivo adjunto';
    case 3:
      return `\`${String(value).replaceAll('`', '´').slice(0, 180)}\``;
    default:
      return String(value);
  }
}

function collectOptionLines(options, depth = 0) {
  const lines = [];
  for (const option of options ?? []) {
    if (option.type === 1 || option.type === 2) {
      lines.push(`**${option.name}**`);
      lines.push(...collectOptionLines(option.options, depth + 1));
      continue;
    }
    const label = option.name.replaceAll('_', ' ');
    lines.push(`${'  '.repeat(depth)}• **${label}:** ${formatValue(option)}`);
  }
  return lines;
}

function actionLine(command, interaction) {
  const sub = subcommandOf(interaction);
  return sub ? `/${command.data.name} ${sub}` : `/${command.data.name}`;
}

/**
 * Construye el embed y los botones de confirmación.
 */
export function buildConfirmationPayload(command, interaction, config = {}) {
  const sub = subcommandOf(interaction);
  const emoji = ACTION_EMOJI[sub] ?? EMOJI.pending;
  const danger =
    config.danger === true ||
    (Array.isArray(config.dangerSubcommands) && config.dangerSubcommands.includes(sub));
  const lines = collectOptionLines(interaction.options.data);
  const fields = [
    {
      name: `${EMOJI.arrowRight} Acción`,
      value: `\`${actionLine(command, interaction)}\``,
      inline: true,
    },
    {
      name: `${EMOJI.user} Solicitado por`,
      value: `<@${interaction.user.id}>`,
      inline: true,
    },
  ];
  if (lines.length > 0) {
    fields.push({
      name: `${EMOJI.list} Parámetros`,
      value: lines.join('\n').slice(0, 1024),
      inline: false,
    });
  }
  fields.push({
    name: `${EMOJI.pending} Validez`,
    value: 'La confirmación caduca en **5 minutos**. Solo quien ejecutó el comando puede confirmar.',
    inline: false,
  });

  const id = randomUUID();
  sessions.set(id, {
    id,
    commandName: command.data.name,
    options: interaction.options,
    userId: interaction.user.id,
    guildId: interaction.guildId ?? null,
    channelId: interaction.channelId ?? null,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  pruneSessions();

  return {
    embeds: [
      baseEmbed({
        title: `${emoji} Confirmar ${danger ? 'acción destructiva' : 'acción'}`,
        description:
          config.description ??
          `Revisa los datos antes de continuar. **${actionLine(command, interaction)}** se ejecutará inmediatamente al confirmar.`,
        color: danger ? COLORS.danger : COLORS.warning,
        fields,
        footer: 'SecurityMoon • Confirmación segura',
      }),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sm:confirm:${id}:yes`)
          .setLabel(config.confirmLabel ?? 'Confirmar')
          .setEmoji(EMOJI.confirm)
          .setStyle(danger ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`sm:confirm:${id}:no`)
          .setLabel(config.cancelLabel ?? 'Cancelar')
          .setEmoji(EMOJI.cancel)
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
    flags: MessageFlags.Ephemeral,
  };
}

function expiredPayload(commandName) {
  return {
    embeds: [
      warningEmbed(
        'Confirmación caducada',
        `La solicitud para \`/${commandName}\` ya no es válida. Ejecuta el comando de nuevo si quieres continuar.`,
      ),
    ],
    components: [],
  };
}

function cancelledPayload(commandName) {
  return {
    embeds: [
      baseEmbed({
        title: `${EMOJI.cancel} Acción cancelada`,
        description: `No se ejecutó \`/${commandName}\`. No se modificó nada.`,
        color: COLORS.muted,
        footer: 'SecurityMoon • Sin cambios',
      }),
    ],
    components: [],
  };
}

/**
 * Crea una interacción compatible con los comandos, pero vinculada al botón
 * de confirmación. Así el comando reutiliza su lógica normal.
 */
function createConfirmedInteraction(interaction, session) {
  const state = { responded: false };
  const overrides = {
    options: session.options,
    commandName: session.commandName,
    confirmed: true,
    __confirmed: true,
    __confirmationState: state,
    reply: async (payload) => {
      state.responded = true;
      return interaction.editReply(payload);
    },
    deferReply: async () => null,
    editReply: async (payload) => {
      state.responded = true;
      return interaction.editReply(payload);
    },
    update: async (payload) => {
      state.responded = true;
      return interaction.editReply(payload);
    },
    followUp: async (payload) => {
      state.responded = true;
      return interaction.followUp(payload);
    },
  };

  return new Proxy(interaction, {
    get(target, property) {
      if (Object.hasOwn(overrides, property)) return overrides[property];
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
    has(target, property) {
      return Object.hasOwn(overrides, property) || property in target;
    },
  });
}

function checkPermissions(command, interaction) {
  if (Array.isArray(command.permissions) && command.permissions.length > 0) {
    if (!interaction.memberPermissions?.has(command.permissions)) {
      throw new PermissionError('Ya no tienes los permisos necesarios para ejecutar este comando.');
    }
  }
  if (Array.isArray(command.botPermissions) && command.botPermissions.length > 0) {
    if (!interaction.appPermissions?.has(command.botPermissions)) {
      throw new PermissionError('SecurityMoon ya no tiene todos los permisos necesarios en este servidor.');
    }
  }
}

/**
 * Procesa los botones de confirmación. Devuelve true si gestionó la interacción.
 */
export async function handleConfirmationInteraction(interaction) {
  if (!interaction.isButton()) return false;
  const [, , id, action] = (interaction.customId ?? '').split(':');
  const session = sessions.get(id);

  if (!session) {
    await interaction
      .reply({
        embeds: [
          warningEmbed(
            'Confirmación no disponible',
            'Esta solicitud ya se usó o caducó. Ejecuta el comando de nuevo.',
          ),
        ],
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
    return true;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(id);
    await interaction.update(expiredPayload(session.commandName)).catch(() => {});
    return true;
  }

  if (interaction.user.id !== session.userId) {
    await interaction
      .reply({
        embeds: [
          warningEmbed(
            'Confirmación protegida',
            `Solo <@${session.userId}> puede confirmar esta acción. Ejecuta \`/${session.commandName}\` tú mismo si necesitas hacerlo.`,
          ),
        ],
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
    return true;
  }

  sessions.delete(id);

  if (action !== 'yes') {
    await interaction.update(cancelledPayload(session.commandName)).catch(() => {});
    return true;
  }

  const client = interaction.client;
  const command = client.commands.get(session.commandName);
  if (!command) {
    await interaction
      .update({
        embeds: [
          warningEmbed(
            'Comando no disponible',
            'El comando ya no existe en esta versión de SecurityMoon. Actualiza los comandos con `npm run deploy`.',
          ),
        ],
        components: [],
      })
      .catch(() => {});
    return true;
  }

  await interaction.deferUpdate().catch(() => {});

  try {
    checkPermissions(command, interaction);
    await interaction
      .editReply({
        embeds: [
          baseEmbed({
            title: `${EMOJI.pending} Ejecutando ${command.data.name}…`,
            description: 'La acción fue confirmada. Estamos aplicando los cambios.',
            color: COLORS.info,
            footer: 'SecurityMoon • Confirmación aceptada',
          }),
        ],
        components: [],
      })
      .catch(() => {});
    const proxy = createConfirmedInteraction(interaction, session);
    await command.execute(proxy);
    const state = proxy.__confirmationState;
    if (!state?.responded) {
      await interaction
        .editReply({
          embeds: [
            baseEmbed({
              title: `${EMOJI.success} Acción completada`,
              description: `\`/${command.data.name}\` se ejecutó correctamente.`,
              color: COLORS.success,
              footer: 'SecurityMoon • Confirmación completada',
            }),
          ],
          components: [],
        })
        .catch(() => {});
    }
    if (interaction.inGuild()) {
      client.stats.increment(interaction.guildId, 'commandsUsed');
    }
    client.logger.debug('Comando confirmado y ejecutado', {
      command: command.data.name,
      userId: interaction.user.id,
      guildId: interaction.guildId,
    });
  } catch (error) {
    client.logger.error('Error al ejecutar un comando confirmado', {
      command: command.data.name,
      userId: interaction.user.id,
      guildId: interaction.guildId,
      error,
    });
    try {
      const proxy = createConfirmedInteraction(interaction, session);
      await replyError(proxy, error);
    } catch {
      // La interacción pudo caducar mientras se ejecutaba el comando.
    }
  }
  return true;
}

/** Limpia sesiones caducadas; se llama de forma perezosa al crear nuevas. */
export function clearConfirmations() {
  sessions.clear();
}

export { SESSION_TTL_MS };

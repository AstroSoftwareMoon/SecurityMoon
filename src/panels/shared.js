// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { UserError } from '../utils/errors.js';
import { errorEmbed } from '../utils/embeds.js';

export const PANEL_FLAGS = MessageFlags.Ephemeral;

export function panelButton(customId, label, style = ButtonStyle.Secondary, { emoji = null, disabled = false } = {}) {
  const button = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style).setDisabled(disabled);
  if (emoji) button.setEmoji(emoji);
  return button;
}

export function linkButton(label, url, { emoji = null } = {}) {
  const button = new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url);
  if (emoji) button.setEmoji(emoji);
  return button;
}

export function actionRow(...components) {
  return new ActionRowBuilder().addComponents(...components);
}

export function hasPanelPermission(interaction) {
  return Boolean(
    interaction.inGuild() &&
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild),
  );
}

export async function denyPanel(interaction, message = 'Necesitas el permiso **Gestionar servidor** para usar este panel.') {
  const payload = {
    embeds: [errorEmbed('Permisos insuficientes', message)],
    flags: PANEL_FLAGS,
  };
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(payload);
    }
    return await interaction.reply(payload);
  } catch {
    return null;
  }
}

function field(fields, name) {
  return fields.fields.getTextInputValue(name).trim();
}

export function parseInteger(fields, name, { min, max, fallback = null, label = name } = {}) {
  const raw = field(fields, name);
  if (!raw) {
    if (fallback !== null) return fallback;
    throw new UserError(`El campo "${label}" es obligatorio.`);
  }
  if (!/^-?\d+$/.test(raw)) {
    throw new UserError(`El campo "${label}" debe ser un número entero.`);
  }
  const value = Number.parseInt(raw, 10);
  if (value < min || value > max) {
    throw new UserError(`El campo "${label}" debe estar entre ${min} y ${max}.`);
  }
  return value;
}

export function parseBoolean(fields, name, { fallback = null, label = name } = {}) {
  const raw = field(fields, name).toLowerCase();
  if (!raw) {
    if (fallback !== null) return fallback;
    throw new UserError(`El campo "${label}" es obligatorio.`);
  }
  if (['si', 'sí', 'true', '1', 'yes', 'y', 'activado', 'activo'].includes(raw)) return true;
  if (['no', 'false', '0', 'n', 'desactivado', 'inactivo'].includes(raw)) return false;
  throw new UserError(`El campo "${label}" debe ser "sí" o "no".`);
}

/**
 * Lee varios booleanos separados por comas, por ejemplo "sí,no".
 */
export function parseBooleanList(fields, name, count, { label = name } = {}) {
  const raw = field(fields, name);
  const parts = raw.split(',').map((part) => part.trim().toLowerCase()).filter(Boolean);
  if (parts.length !== count) {
    throw new UserError(`El campo "${label}" necesita ${count} valores "sí" o "no" separados por comas.`);
  }
  return parts.map((part) => {
    if (['si', 'sí', 'true', '1', 'yes', 'y', 'activado', 'activo'].includes(part)) return true;
    if (['no', 'false', '0', 'n', 'desactivado', 'inactivo'].includes(part)) return false;
    throw new UserError(`El campo "${label}" solo admite "sí" o "no" en cada valor.`);
  });
}

export function parseChoice(fields, name, choices, { fallback = null, label = name } = {}) {
  const raw = field(fields, name).toLowerCase();
  if (!raw) {
    if (fallback !== null) return fallback;
    throw new UserError(`El campo "${label}" es obligatorio.`);
  }
  if (!choices.includes(raw)) {
    throw new UserError(`El campo "${label}" debe ser uno de: ${choices.join(', ')}.`);
  }
  return raw;
}

export function parseOptionalText(fields, name, { maxLength = 300, fallback = null } = {}) {
  const raw = field(fields, name);
  return raw ? raw.slice(0, maxLength) : fallback;
}

/**
 * Lee una lista separada por comas y valida cada entero contra su rango.
 * Ejemplo: "3, 6" con specs [{min:1,max:25},{min:1,max:25}].
 */
export function parseIntegerList(fields, name, specs, { label = name } = {}) {
  const raw = field(fields, name);
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length !== specs.length) {
    throw new UserError(
      `El campo "${label}" necesita ${specs.length} valores separados por comas.`,
    );
  }
  return parts.map((part, index) => {
    if (!/^-?\d+$/.test(part)) {
      throw new UserError(`El valor ${index + 1} de "${label}" debe ser un número entero.`);
    }
    const value = Number.parseInt(part, 10);
    const spec = specs[index];
    if (value < spec.min || value > spec.max) {
      throw new UserError(
        `El valor ${index + 1} de "${label}" debe estar entre ${spec.min} y ${spec.max}.`,
      );
    }
    return value;
  });
}

/**
 * Responde a un modal. Si el modal se abrió desde un componente del panel,
 * intenta actualizar el mensaje original; si no, envía una respuesta efímera.
 */
export async function respondFromModal(interaction, payload) {
  const full = { ...payload, flags: PANEL_FLAGS };
  try {
    if (typeof interaction.isFromMessage === 'function' && interaction.isFromMessage()) {
      return await interaction.update(payload);
    }
  } catch {
    // Continúa con una respuesta nueva.
  }
  try {
    return await interaction.reply(full);
  } catch {
    return null;
  }
}

export function parseSnowflake(value, label = 'ID') {
  const clean = String(value ?? '').trim();
  if (!/^\d{16,20}$/.test(clean)) {
    throw new UserError(`El ${label} no parece un ID válido de Discord.`);
  }
  return clean;
}

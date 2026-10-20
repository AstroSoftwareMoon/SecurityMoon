// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { ChannelType } from 'discord.js';
import { UserError } from './errors.js';
import { isSnowflake, isValidDomain, normalizeDomain } from '../storage/validation.js';

export function requireGuild(interaction) {
  if (!interaction.inGuild() || !interaction.guild) {
    throw new UserError('Este comando solo se puede usar dentro de un servidor.');
  }
  return interaction.guild;
}

export function sanitizeReason(value, { maxLength = 1000, fallback = 'Sin motivo especificado' } = {}) {
  if (typeof value !== 'string') return fallback;
  // Elimina caracteres de control no imprimibles del texto del usuario.
  // eslint-disable-next-line no-control-regex
  const clean = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  return clean ? clean.slice(0, maxLength) : fallback;
}

export function parseSnowflakeList(input, { max = 50 } = {}) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new UserError('Introduce al menos un ID de usuario.');
  }
  const ids = input
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (ids.length > max) {
    throw new UserError(`Puedes introducir como máximo ${max} IDs.`);
  }
  for (const id of ids) {
    if (!isSnowflake(id)) throw new UserError(`El ID "${id}" no es válido.`);
  }
  return [...new Set(ids)];
}

export function parseDomain(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new UserError('Introduce un dominio, por ejemplo ejemplo.com.');
  }
  const normalized = normalizeDomain(input);
  if (!isValidDomain(normalized)) {
    throw new UserError('El dominio no es válido. Usa solo el dominio, sin protocolo ni rutas.');
  }
  return normalized;
}

export function parseTextChannel(channel) {
  if (!channel) throw new UserError('El canal indicado no existe.');
  if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
    throw new UserError('Selecciona un canal de texto o de anuncios.');
  }
  return channel;
}

export function parseInteger(value, { min, max, label = 'valor' }) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new UserError(`${label} debe ser un número entero entre ${min} y ${max}.`);
  }
  return value;
}

export function parseBooleanText(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['si', 'sí', 'true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['no', 'false', '0', 'n'].includes(normalized)) return false;
  throw new UserError('Responde "sí" o "no".');
}

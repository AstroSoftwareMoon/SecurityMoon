// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

/**
 * Utilidades de tiempo y duración.
 */

const UNIT_MS = Object.freeze({
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
});

const DURATION_PATTERN = /^(\d{1,4})\s*(s|m|h|d|w)$/i;

/**
 * Convierte una duración como "10m", "2h" o "1d" a milisegundos.
 * @param {string} input
 * @returns {number}
 */
export function parseDuration(input) {
  if (typeof input !== 'string') {
    throw new Error('La duración debe ser texto, por ejemplo 10m.');
  }
  const value = input.trim().toLowerCase();
  const match = value.match(DURATION_PATTERN);
  if (!match) {
    throw new Error('Duración inválida. Usa formatos como 30s, 10m, 2h o 1d.');
  }
  const amount = Number.parseInt(match[1], 10);
  if (amount <= 0) {
    throw new Error('La duración debe ser mayor que cero.');
  }
  return amount * UNIT_MS[match[2]];
}

/**
 * Convierte segundos a milisegundos, validando el rango.
 * @param {number} seconds
 * @param {number} min
 * @param {number} max
 */
export function secondsRange(seconds, min, max) {
  if (!Number.isInteger(seconds) || seconds < min || seconds > max) {
    throw new Error(`El valor debe ser un número entero entre ${min} y ${max}.`);
  }
  return seconds;
}

/**
 * Formatea una duración en milisegundos a un texto corto.
 * @param {number} ms
 */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  const units = [
    ['d', UNIT_MS.d],
    ['h', UNIT_MS.h],
    ['m', UNIT_MS.m],
    ['s', UNIT_MS.s],
  ];
  const parts = [];
  let remaining = Math.floor(ms);
  for (const [label, size] of units) {
    const amount = Math.floor(remaining / size);
    if (amount > 0) {
      parts.push(`${amount}${label}`);
      remaining -= amount * size;
    }
    if (parts.length === 2) break;
  }
  return parts.join(' ') || '0s';
}

/** Marca temporal de Discord para fechas. */
export function discordTimestamp(date, style = 'f') {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return 'desconocido';
  return `<t:${Math.floor(value.getTime() / 1000)}:${style}>`;
}

/** Fecha ISO actual. */
export function nowIso() {
  return new Date().toISOString();
}

/** Comprueba si una fecha ISO es válida. */
export function isValidIsoDate(value) {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

/** Milisegundos desde una marca ISO. */
export function msSince(isoDate, now = Date.now()) {
  const time = Date.parse(isoDate);
  return Number.isFinite(time) ? now - time : Number.POSITIVE_INFINITY;
}

/** Formatea una fecha ISO en español. */
export function formatDate(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return 'desconocido';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(value);
}

/** Formatea un uptime en un texto legible. */
export function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

/** Formatea bytes. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

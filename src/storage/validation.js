// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { ValidationError } from '../utils/errors.js';

/**
 * Mini motor de esquemas para validar y normalizar documentos JSON.
 * Evita dependencias externas y mantiene los datos predecibles.
 */

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveDefault(spec) {
  if (typeof spec.default === 'function') return spec.default();
  return spec.default;
}

function valueMatches(value, spec) {
  if (value === null) return Boolean(spec.nullable);

  switch (spec.type) {
    case 'string':
      return (
        typeof value === 'string' &&
        value.length >= (spec.minLength ?? 0) &&
        value.length <= (spec.maxLength ?? 10_000) &&
        (!spec.pattern || spec.pattern.test(value))
      );
    case 'snowflake':
      return typeof value === 'string' && /^\d{16,20}$/.test(value);
    case 'date':
      return typeof value === 'string' && Number.isFinite(Date.parse(value));
    case 'integer':
      return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= (spec.min ?? Number.MIN_SAFE_INTEGER) &&
        value <= (spec.max ?? Number.MAX_SAFE_INTEGER)
      );
    case 'number':
      return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= (spec.min ?? Number.NEGATIVE_INFINITY) &&
        value <= (spec.max ?? Number.POSITIVE_INFINITY)
      );
    case 'boolean':
      return typeof value === 'boolean';
    case 'enum':
      return spec.values.includes(value);
    case 'array':
      return Array.isArray(value);
    case 'object':
      return isPlainObject(value);
    default:
      return false;
  }
}

function normalizePrimitive(value, spec) {
  if (valueMatches(value, spec)) return value;
  return resolveDefault(spec);
}

function normalizeArray(input, spec) {
  if (!Array.isArray(input)) return resolveDefault(spec) ?? [];
  const normalized = [];
  for (const item of input) {
    if (normalized.length >= (spec.maxItems ?? 1000)) break;
    let value;
    if (spec.items.type === 'object') {
      value = normalizeWithShape(item, spec.items.shape);
    } else if (spec.items.type === 'array') {
      value = normalizeArray(item, spec.items);
    } else {
      value = normalizePrimitive(item, spec.items);
      if (!valueMatches(value, spec.items)) continue;
    }
    if (spec.itemFilter && !spec.itemFilter(value)) continue;
    normalized.push(value);
  }
  if (spec.unique) {
    const seen = new Set();
    return normalized.filter((item) => {
      const key = spec.uniqueBy ? item?.[spec.uniqueBy] : item;
      const serialized = typeof key === 'string' ? key : JSON.stringify(key);
      if (seen.has(serialized)) return false;
      seen.add(serialized);
      return true;
    });
  }
  return normalized;
}

function normalizeValue(input, spec) {
  if (spec.type === 'object') return normalizeWithShape(input, spec.shape);
  if (spec.type === 'array') return normalizeArray(input, spec);
  return normalizePrimitive(input, spec);
}

/**
 * Rellena valores ausentes o inválidos con los predeterminados del esquema.
 * También elimina claves desconocidas para no persistir datos arbitrarios.
 * @param {unknown} input
 * @param {Record<string, object>} shape
 */
export function normalizeWithShape(input, shape) {
  const source = isPlainObject(input) ? input : {};
  const output = {};
  for (const [key, spec] of Object.entries(shape)) {
    output[key] = normalizeValue(source[key], spec);
  }
  return output;
}

function assertValue(value, spec, path) {
  if (value === null) {
    if (spec.nullable) return;
    throw new ValidationError(`${path} no puede ser nulo.`);
  }
  if (!valueMatches(value, spec)) {
    throw new ValidationError(`${path} no tiene un valor válido.`);
  }
  if (spec.type === 'array') {
    if (value.length > (spec.maxItems ?? 1000)) {
      throw new ValidationError(`${path} supera el límite de elementos.`);
    }
    value.forEach((item, index) => {
      if (spec.items.type === 'object') {
        assertWithShape(item, spec.items.shape, `${path}[${index}]`);
      } else {
        assertValue(item, spec.items, `${path}[${index}]`);
      }
    });
  }
  if (spec.type === 'object') {
    assertWithShape(value, spec.shape, path);
  }
}

/**
 * Lanza ValidationError si el documento no cumple el esquema.
 * @param {unknown} data
 * @param {Record<string, object>} shape
 * @param {string} path
 */
export function assertWithShape(data, shape, path = 'documento') {
  if (!isPlainObject(data)) {
    throw new ValidationError(`${path} debe ser un objeto JSON.`);
  }
  for (const [key, spec] of Object.entries(shape)) {
    if (!(key in data)) {
      throw new ValidationError(`${path}.${key} es obligatorio.`);
    }
    assertValue(data[key], spec, `${path}.${key}`);
  }
}

/**
 * Genera un documento con todos los valores predeterminados.
 * @param {Record<string, object>} shape
 */
export function defaultsFromShape(shape) {
  return normalizeWithShape({}, shape);
}

/** Comprueba si una cadena es un snowflake de Discord. */
export function isSnowflake(value) {
  return typeof value === 'string' && /^\d{16,20}$/.test(value);
}

/**
 * Valida un dominio o nombre de host sin protocolo.
 * @param {string} value
 */
export function isValidDomain(value) {
  if (typeof value !== 'string') return false;
  const domain = value.trim().toLowerCase().replace(/\.$/, '');
  if (domain.length < 3 || domain.length > 253) return false;
  if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.includes('/') || domain.includes(':') || domain.includes('@')) return false;
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain);
}

/** Normaliza un dominio para comparaciones. */
export function normalizeDomain(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/^www\./, '')
    .replace(/\.$/, '');
}

/** Valida que un objeto sea JSON serializable y no demasiado grande. */
export function assertSerializable(value, maxBytes = 10 * 1024 * 1024) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch (error) {
    throw new ValidationError('El documento no se puede serializar como JSON.', { cause: error });
  }
  if (typeof serialized !== 'string') {
    throw new ValidationError('El documento no se puede serializar como JSON.');
  }
  if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
    throw new ValidationError('El documento supera el tamaño máximo permitido.');
  }
  return serialized;
}

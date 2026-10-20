// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_LANGUAGE, LOG_LEVELS, SUPPORTED_LANGUAGES } from './constants.js';
import { ConfigError } from './utils/errors.js';

export const CONFIG_DEFAULTS = Object.freeze({
  token: '',
  clientId: '',
  defaultLanguage: DEFAULT_LANGUAGE,
  prefix: '/',
  logging: { level: 'info' },
  promotions: { enabled: false, intervalHours: 24 },
});

const PLACEHOLDER_TOKEN = 'PON_AQUI_EL_TOKEN';
const PLACEHOLDER_CLIENT_ID = 'ID_DE_LA_APLICACION';

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeConfig(raw) {
  const source = isPlainObject(raw) ? raw : {};
  const logging = isPlainObject(source.logging) ? source.logging : {};
  const promotions = isPlainObject(source.promotions) ? source.promotions : {};
  return {
    token: typeof source.token === 'string' ? source.token.trim() : '',
    clientId: typeof source.clientId === 'string' ? source.clientId.trim() : '',
    defaultLanguage:
      typeof source.defaultLanguage === 'string'
        ? source.defaultLanguage
        : CONFIG_DEFAULTS.defaultLanguage,
    prefix: typeof source.prefix === 'string' ? source.prefix : CONFIG_DEFAULTS.prefix,
    logging: {
      level: typeof logging.level === 'string' ? logging.level : CONFIG_DEFAULTS.logging.level,
    },
    promotions: {
      enabled:
        typeof promotions.enabled === 'boolean'
          ? promotions.enabled
          : CONFIG_DEFAULTS.promotions.enabled,
      intervalHours:
        typeof promotions.intervalHours === 'number'
          ? promotions.intervalHours
          : CONFIG_DEFAULTS.promotions.intervalHours,
    },
  };
}

/**
 * Valida la configuración y devuelve una lista de errores seguros.
 * Nunca incluye el token en los mensajes.
 */
export function validateConfig(raw, { validateCredentials = true } = {}) {
  const config = sanitizeConfig(raw);
  const errors = [];

  if (typeof config.token !== 'string') {
    errors.push('token debe ser una cadena de texto.');
  } else if (validateCredentials) {
    if (!config.token) {
      errors.push('Falta el token del bot. Copia config.json.example a config.json y completa "token" o define DISCORD_TOKEN.');
    } else if (config.token === PLACEHOLDER_TOKEN) {
      errors.push('El token sigue siendo el marcador de ejemplo. Configura un token real o define DISCORD_TOKEN.');
    } else if (config.token.length < 50) {
      errors.push('El token del bot no parece válido (longitud insuficiente). No se muestra por seguridad.');
    }
  }

  if (typeof config.clientId !== 'string') {
    errors.push('clientId debe ser una cadena de texto.');
  } else if (validateCredentials) {
    if (!config.clientId || config.clientId === PLACEHOLDER_CLIENT_ID) {
      errors.push('Falta clientId. Usa el ID de la aplicación de Discord en config.json.');
    } else if (!/^\d{16,20}$/.test(config.clientId)) {
      errors.push('clientId debe ser un ID numérico de Discord (16-20 dígitos).');
    }
  }

  if (!SUPPORTED_LANGUAGES.includes(config.defaultLanguage)) {
    errors.push(`defaultLanguage debe ser uno de: ${SUPPORTED_LANGUAGES.join(', ')}.`);
  }

  if (config.prefix !== '/') {
    errors.push('prefix debe ser "/" porque SecurityMoon usa comandos slash.');
  }

  if (!LOG_LEVELS.includes(config.logging.level)) {
    errors.push(`logging.level debe ser uno de: ${LOG_LEVELS.join(', ')}.`);
  }

  if (typeof config.promotions.enabled !== 'boolean') {
    errors.push('promotions.enabled debe ser true o false.');
  }

  if (
    !Number.isInteger(config.promotions.intervalHours) ||
    config.promotions.intervalHours < 24 ||
    config.promotions.intervalHours > 720
  ) {
    errors.push('promotions.intervalHours debe ser un entero entre 24 y 720.');
  }

  return { config, errors };
}

/**
 * Carga config.json, aplica DISCORD_TOKEN/DISCORD_CLIENT_ID y valida.
 */
export async function loadConfig({
  cwd = process.cwd(),
  env = process.env,
  validateCredentials = true,
} = {}) {
  const configPath = path.join(cwd, 'config.json');
  let raw = {};
  try {
    const content = await readFile(configPath, 'utf8');
    try {
      raw = JSON.parse(content);
    } catch (error) {
      throw new ConfigError(
        'config.json no contiene JSON válido. Revisa la sintaxis (comas, comillas y llaves).',
        { cause: error },
      );
    }
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    if (error.code === 'ENOENT') {
      if (validateCredentials) {
        throw new ConfigError(
          'No se encontró config.json. Copia config.json.example a config.json y completa las credenciales.',
        );
      }
    } else {
      throw new ConfigError('No se pudo leer config.json. Comprueba sus permisos.', { cause: error });
    }
  }

  if (!isPlainObject(raw)) {
    throw new ConfigError('config.json debe contener un objeto JSON en la raíz.');
  }

  if (typeof env.DISCORD_TOKEN === 'string' && env.DISCORD_TOKEN.trim()) {
    raw = { ...raw, token: env.DISCORD_TOKEN.trim() };
  }
  if (typeof env.DISCORD_CLIENT_ID === 'string' && env.DISCORD_CLIENT_ID.trim()) {
    raw = { ...raw, clientId: env.DISCORD_CLIENT_ID.trim() };
  }

  const { config, errors } = validateConfig(raw, { validateCredentials });
  if (errors.length > 0) {
    throw new ConfigError(`Configuración inválida:\n- ${errors.join('\n- ')}`);
  }
  return config;
}

/** Devuelve una copia segura de la configuración para diagnósticos. */
export function safeConfigSummary(config) {
  return {
    clientId: config.clientId,
    defaultLanguage: config.defaultLanguage,
    prefix: config.prefix,
    logging: { ...config.logging },
    promotions: { ...config.promotions },
    tokenConfigured: Boolean(config.token),
  };
}

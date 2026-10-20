// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

/**
 * Errores tipados de SecurityMoon.
 * Los mensajes de usuario nunca deben incluir secretos ni rutas privadas.
 */

export class AppError extends Error {
  constructor(message, { code = 'APP_ERROR', userMessage = null, cause = null } = {}) {
    super(message, { cause });
    this.name = new.target.name;
    this.code = code;
    this.userMessage = userMessage;
  }
}

export class ConfigError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'CONFIG_ERROR', ...options });
  }
}

export class ValidationError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'VALIDATION_ERROR', userMessage: message, ...options });
  }
}

export class StorageError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'STORAGE_ERROR', ...options });
  }
}

export class PermissionError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'PERMISSION_ERROR', userMessage: message, ...options });
  }
}

export class UserError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'USER_ERROR', userMessage: message, ...options });
  }
}

export class NotFoundError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'NOT_FOUND', userMessage: message, ...options });
  }
}

/**
 * Devuelve un texto seguro para mostrar al usuario.
 * @param {unknown} error
 * @param {string} fallback
 */
export function getUserMessage(error, fallback = 'Ha ocurrido un error inesperado. Inténtalo de nuevo más tarde.') {
  if (error instanceof AppError && error.userMessage) {
    return error.userMessage;
  }
  return fallback;
}

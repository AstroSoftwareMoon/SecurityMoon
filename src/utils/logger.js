// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { appendFile, mkdir, readdir, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

const LEVEL_WEIGHT = Object.freeze({ error: 0, warn: 1, info: 2, debug: 3 });
const SENSITIVE_KEY = /token|secret|password|authorization|api[_-]?key|webhook/i;
const DISCORD_TOKEN = /[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{20,}/g;
const WEBHOOK_URL = /https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/gi;

/**
 * Registro estructurado con rotación de archivos.
 * Escribe líneas JSON (NDJSON) en logs/security.json para no reescribir
 * todo el archivo en cada entrada.
 */
export class Logger {
  constructor({
    level = 'info',
    directory = 'logs',
    fileName = 'security.json',
    maxBytes = 5 * 1024 * 1024,
    maxFiles = 5,
    console = true,
    secrets = [],
  } = {}) {
    this.level = LEVEL_WEIGHT[level] === undefined ? LEVEL_WEIGHT.info : LEVEL_WEIGHT[level];
    this.levelName = LEVEL_WEIGHT[level] === undefined ? 'info' : level;
    this.directory = path.resolve(directory);
    this.fileName = fileName;
    this.maxBytes = maxBytes;
    this.maxFiles = Math.max(2, maxFiles);
    this.console = console;
    this.secrets = secrets.filter((secret) => typeof secret === 'string' && secret.length > 6);
    this.size = 0;
    this.initialized = false;
    this.queue = Promise.resolve();
  }

  get filePath() {
    return path.join(this.directory, this.fileName);
  }

  async init() {
    if (this.initialized) return;
    await mkdir(this.directory, { recursive: true });
    try {
      const info = await stat(this.filePath);
      this.size = info.size;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.size = 0;
    }
    this.initialized = true;
  }

  redactString(value) {
    let result = String(value)
      .replace(DISCORD_TOKEN, '[REDACTED_TOKEN]')
      .replace(WEBHOOK_URL, '[REDACTED_WEBHOOK]');
    for (const secret of this.secrets) {
      result = result.split(secret).join('[REDACTED]');
    }
    return result;
  }

  sanitize(value, depth = 0, seen = new WeakSet()) {
    if (depth > 5) return '[TRUNCADO]';
    if (typeof value === 'string') {
      const clean = this.redactString(value);
      return clean.length > 4000 ? `${clean.slice(0, 4000)}…` : clean;
    }
    if (typeof value === 'bigint') return value.toString();
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Error) {
      return {
        name: value.name,
        message: this.redactString(value.message),
        stack: value.stack ? this.redactString(value.stack) : undefined,
      };
    }
    if (seen.has(value)) return '[CIRCULAR]';
    seen.add(value);
    if (Array.isArray(value)) {
      return value.slice(0, 50).map((item) => this.sanitize(item, depth + 1, seen));
    }
    const output = {};
    for (const [key, item] of Object.entries(value).slice(0, 50)) {
      if (SENSITIVE_KEY.test(key)) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = this.sanitize(item, depth + 1, seen);
      }
    }
    return output;
  }

  log(level, message, context = null) {
    const weight = LEVEL_WEIGHT[level] ?? LEVEL_WEIGHT.info;
    if (weight > this.level) return Promise.resolve();
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.redactString(message),
    };
    if (context !== null && context !== undefined) {
      entry.context = this.sanitize(context);
    }
    const line = `${JSON.stringify(entry)}\n`;
    if (this.console) {
      const suffix = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
      stream.write(`[${entry.timestamp}] [${level.toUpperCase()}] ${entry.message}${suffix}\n`);
    }
    this.queue = this.queue
      .then(() => this.writeLine(line))
      .catch((error) => {
        if (this.console) {
          process.stderr.write(`[LOGGER] No se pudo escribir el registro: ${error.message}\n`);
        }
      });
    return this.queue;
  }

  async writeLine(line) {
    if (!this.initialized) await this.init();
    const bytes = Buffer.byteLength(line, 'utf8');
    if (this.size + bytes > this.maxBytes) {
      await this.rotate();
    }
    await appendFile(this.filePath, line, { encoding: 'utf8', mode: 0o600 });
    this.size += bytes;
  }

  async rotate() {
    try {
      const info = await stat(this.filePath);
      if (info.size === 0) return;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotated = path.join(this.directory, `security-${stamp}-${process.pid}.json`);
      await rename(this.filePath, rotated);
      this.size = 0;
      await this.prune();
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.size = 0;
    }
  }

  async prune() {
    const entries = await readdir(this.directory).catch(() => []);
    const files = entries
      .filter((name) => /^security-.*\.json$/.test(name))
      .sort()
      .reverse();
    for (const extra of files.slice(Math.max(0, this.maxFiles - 1))) {
      await unlink(path.join(this.directory, extra)).catch(() => {});
    }
  }

  debug(message, context) {
    return this.log('debug', message, context);
  }

  info(message, context) {
    return this.log('info', message, context);
  }

  warn(message, context) {
    return this.log('warn', message, context);
  }

  error(message, context) {
    return this.log('error', message, context);
  }

  async flush() {
    await this.queue;
  }
}

/** Logger silencioso para pruebas unitarias. */
export function createNullLogger() {
  const noop = async () => {};
  return {
    init: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    flush: noop,
    redactString: (value) => String(value),
    sanitize: (value) => value,
    log: noop,
  };
}

/** Crea un logger con la configuración del proyecto. */
export function createLogger({ level, directory, secrets }) {
  return new Logger({ level, directory, secrets });
}

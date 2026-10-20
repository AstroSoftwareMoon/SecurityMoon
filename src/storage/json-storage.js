// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { mkdir, open, readFile, readdir, rename, stat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { StorageError, ValidationError } from '../utils/errors.js';
import { assertSerializable } from './validation.js';

const SAFE_RELATIVE_PATH = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.json$/;

function clone(value) {
  return structuredClone(value);
}

/**
 * Almacenamiento JSON con:
 * - escrituras atómicas (temporal + fsync + rename)
 * - control de concurrencia por archivo
 * - copias de seguridad previas
 * - recuperación de archivos corruptos
 */
export class JsonStorage {
  constructor({
    rootDir,
    logger = null,
    backupManager = null,
    maxFileSizeBytes = 10 * 1024 * 1024,
  } = {}) {
    if (!rootDir) throw new Error('JsonStorage requiere rootDir.');
    this.rootDir = path.resolve(rootDir);
    this.logger = logger;
    this.backupManager = backupManager;
    this.maxFileSizeBytes = maxFileSizeBytes;
    this.queues = new Map();
  }

  async init(subdirectories = []) {
    await mkdir(this.rootDir, { recursive: true });
    await Promise.all(
      subdirectories.map((directory) => mkdir(path.join(this.rootDir, directory), { recursive: true })),
    );
    await this.backupManager?.init();
  }

  safePath(relativePath) {
    if (
      typeof relativePath !== 'string' ||
      !SAFE_RELATIVE_PATH.test(relativePath) ||
      relativePath.includes('..') ||
      relativePath.includes('\\')
    ) {
      throw new StorageError('Ruta de almacenamiento no permitida.');
    }
    const fullPath = path.resolve(this.rootDir, relativePath);
    if (!fullPath.startsWith(`${this.rootDir}${path.sep}`)) {
      throw new StorageError('La ruta escapa del directorio de datos.');
    }
    return fullPath;
  }

  _enqueue(key, operation) {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const next = previous.then(operation, operation);
    this.queues.set(key, next);
    return next.finally(() => {
      if (this.queues.get(key) === next) {
        this.queues.delete(key);
      }
    });
  }

  async _readFile(relativePath, defaults, validate) {
    const filePath = this.safePath(relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });

    let raw;
    try {
      const info = await stat(filePath);
      if (info.size > this.maxFileSizeBytes) {
        throw new StorageError('El archivo JSON supera el tamaño máximo permitido.', {
          code: 'FILE_TOO_LARGE',
        });
      }
      raw = await readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        const data = clone(defaults);
        await this._writeFile(relativePath, data, { validate, backup: false });
        return data;
      }
      if (error instanceof StorageError) {
        await this._handleCorruption(relativePath, defaults, validate, error);
        return this._readAfterCorruption(relativePath, defaults, validate);
      }
      if (['EACCES', 'EPERM', 'EISDIR', 'ENOTDIR'].includes(error.code)) {
        throw new StorageError('No se pudo leer un archivo de datos.', { cause: error });
      }
      throw new StorageError('Error de lectura del almacenamiento JSON.', { cause: error });
    }

    let data;
    try {
      data = JSON.parse(raw);
      if (validate) {
        const result = validate(data);
        if (result === false) {
          throw new ValidationError('El documento no pasó la validación.');
        }
      }
    } catch (error) {
      this.logger?.error('Archivo JSON inválido o corrupto', {
        file: relativePath,
        error: error.message,
      });
      await this._handleCorruption(relativePath, defaults, validate, error);
      return this._readAfterCorruption(relativePath, defaults, validate);
    }
    return data;
  }

  async _readAfterCorruption(relativePath, defaults, validate) {
    const backupRaw = await this.backupManager?.readLatest(relativePath);
    if (backupRaw) {
      try {
        const restored = JSON.parse(backupRaw);
        if (validate) {
          const result = validate(restored);
          if (result === false) throw new ValidationError('La copia no pasó la validación.');
        }
        await this._writeFile(relativePath, restored, { validate, backup: false });
        this.logger?.warn('Datos restaurados desde copia de seguridad', { file: relativePath });
        return restored;
      } catch (error) {
        this.logger?.warn('La copia de seguridad tampoco es válida; se usarán valores predeterminados', {
          file: relativePath,
          error: error.message,
        });
      }
    }

    const data = clone(defaults);
    await this._writeFile(relativePath, data, { validate, backup: false });
    this.logger?.warn('Se recreó el archivo de datos con valores predeterminados', {
      file: relativePath,
    });
    return data;
  }

  async _handleCorruption(relativePath, _defaults, _validate, error) {
    const filePath = this.safePath(relativePath);
    const quarantine = `${filePath}.corrupt-${Date.now()}.json`;
    try {
      await rename(filePath, quarantine);
      this.logger?.warn('Archivo dañado aislado para revisión manual', {
        file: relativePath,
        quarantine: path.basename(quarantine),
        error: error.message,
      });
      await this._pruneQuarantine(filePath);
    } catch (renameError) {
      if (renameError.code !== 'ENOENT') {
        throw new StorageError('No se pudo aislar un archivo de datos dañado.', {
          cause: renameError,
        });
      }
    }
  }

  async _pruneQuarantine(filePath) {
    const directory = path.dirname(filePath);
    const base = path.basename(filePath);
    const entries = await readdir(directory).catch(() => []);
    const quarantined = entries
      .filter((name) => name.startsWith(`${base}.corrupt-`) && name.endsWith('.json'))
      .sort()
      .reverse();
    for (const extra of quarantined.slice(5)) {
      await unlink(path.join(directory, extra)).catch(() => {});
    }
  }

  async _writeFile(relativePath, data, { validate, backup = true } = {}) {
    const filePath = this.safePath(relativePath);
    if (validate) {
      const result = validate(data);
      if (result === false) {
        throw new ValidationError('El documento no pasó la validación antes de guardarse.');
      }
    }
    const serialized = `${assertSerializable(data, this.maxFileSizeBytes)}\n`;
    const bytes = Buffer.byteLength(serialized, 'utf8');
    if (bytes > this.maxFileSizeBytes) {
      throw new StorageError('El documento supera el tamaño máximo permitido.');
    }

    await mkdir(path.dirname(filePath), { recursive: true });

    if (backup && this.backupManager) {
      const exists = await stat(filePath).then(
        (info) => info.isFile(),
        () => false,
      );
      if (exists) {
        await this.backupManager.backup(relativePath, filePath, { reason: 'pre-write' });
      }
    }

    const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    let handle;
    try {
      handle = await open(temporary, 'w', 0o600);
      await handle.writeFile(serialized, 'utf8');
      await handle.sync();
      await handle.close();
      handle = null;
      await rename(temporary, filePath);
      await this._syncDirectory(path.dirname(filePath));
      return data;
    } catch (error) {
      if (handle) {
        await handle.close().catch(() => {});
      }
      await unlink(temporary).catch(() => {});
      throw new StorageError('No se pudo guardar el archivo de datos de forma atómica.', {
        cause: error,
      });
    }
  }

  async _syncDirectory(directory) {
    try {
      const handle = await open(directory, 'r');
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
    } catch {
      // fsync de directorio no está disponible en todos los sistemas.
    }
  }

  /**
   * Lee un documento. Si no existe, lo crea con los valores predeterminados.
   */
  async read(relativePath, defaults, { validate } = {}) {
    this.safePath(relativePath);
    return this._enqueue(relativePath, () =>
      this._readFile(relativePath, clone(defaults), validate),
    );
  }

  /**
   * Guarda un documento de forma atómica.
   */
  async write(relativePath, data, { validate, backup = false } = {}) {
    this.safePath(relativePath);
    return this._enqueue(relativePath, () =>
      this._writeFile(relativePath, clone(data), { validate, backup }),
    );
  }

  /**
   * Lectura + transformación + escritura bajo el mismo bloqueo.
   * Si el documento no cambia, no se reescribe.
   */
  async update(relativePath, defaults, mutator, { validate, backup = false } = {}) {
    this.safePath(relativePath);
    return this._enqueue(relativePath, async () => {
      const current = await this._readFile(relativePath, clone(defaults), validate);
      const draft = clone(current);
      const mutated = await mutator(draft);
      const next = mutated === undefined ? draft : mutated;
      const currentSerialized = JSON.stringify(current);
      const nextSerialized = JSON.stringify(next);
      if (currentSerialized === nextSerialized) {
        return current;
      }
      await this._writeFile(relativePath, next, { validate, backup });
      return clone(next);
    });
  }

  /** Lee un archivo sin crearlo; devuelve null si no existe. */
  async tryReadRaw(relativePath) {
    const filePath = this.safePath(relativePath);
    try {
      return await readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw new StorageError('No se pudo leer el archivo solicitado.', { cause: error });
    }
  }
}

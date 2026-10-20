// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import path from 'node:path';
import { nowIso } from '../utils/time.js';
import { isSnowflake } from './validation.js';
import { ValidationError } from '../utils/errors.js';
import {
  assertDocument,
  defaultGuildSettings,
  normalizeDocument,
} from './schemas.js';

const KIND_BACKUP_DEFAULTS = Object.freeze({
  guilds: true,
  warnings: true,
  incidents: true,
  moderation: true,
  trusted: true,
  filters: true,
  stats: false,
});

/**
 * Acceso a un tipo de documento por servidor.
 * Cada guild tiene su propio archivo aislado.
 */
export class GuildDocumentStore {
  constructor(storage, kind) {
    if (!KIND_BACKUP_DEFAULTS[kind] && KIND_BACKUP_DEFAULTS[kind] !== false) {
      throw new Error(`Tipo de documento no soportado: ${kind}`);
    }
    this.storage = storage;
    this.kind = kind;
    this.backup = KIND_BACKUP_DEFAULTS[kind];
  }

  static assertGuildId(guildId) {
    if (!isSnowflake(guildId)) {
      throw new ValidationError('El ID del servidor no es válido.');
    }
  }

  relativePath(guildId) {
    GuildDocumentStore.assertGuildId(guildId);
    return `${this.kind}/${guildId}.json`;
  }

  defaults(guildId) {
    if (this.kind === 'guilds') {
      const fresh = defaultGuildSettings(guildId);
      fresh.updatedAt = nowIso();
      return fresh;
    }
    return normalizeDocument(this.kind, {}, guildId);
  }

  validator(guildId) {
    return (document) => {
      assertDocument(this.kind, document);
      if (document.guildId !== guildId) {
        throw new ValidationError('El documento pertenece a otro servidor.');
      }
      return true;
    };
  }

  async get(guildId) {
    const relative = this.relativePath(guildId);
    const defaults = this.defaults(guildId);
    return this.storage.update(
      relative,
      defaults,
      (document) => normalizeDocument(this.kind, document, guildId),
      { validate: this.validator(guildId), backup: false },
    );
  }

  async save(guildId, document, { backup = this.backup } = {}) {
    const relative = this.relativePath(guildId);
    const normalized = normalizeDocument(this.kind, document, guildId);
    normalized.updatedAt = nowIso();
    await this.storage.write(relative, normalized, {
      validate: this.validator(guildId),
      backup,
    });
    return normalized;
  }

  async update(guildId, mutator, { backup = this.backup } = {}) {
    const relative = this.relativePath(guildId);
    const defaults = this.defaults(guildId);
    return this.storage.update(
      relative,
      defaults,
      async (document) => {
        const normalized = normalizeDocument(this.kind, document, guildId);
        const mutation = await mutator(normalized);
        const next = normalizeDocument(this.kind, mutation === undefined ? normalized : mutation, guildId);
        next.updatedAt = nowIso();
        return next;
      },
      { validate: this.validator(guildId), backup },
    );
  }

  async clear(guildId, { preserveCreatedAt = true } = {}) {
    const previous = preserveCreatedAt ? await this.get(guildId) : null;
    const fresh = this.defaults(guildId);
    if (previous?.createdAt) fresh.createdAt = previous.createdAt;
    if (previous?.since) fresh.since = nowIso();
    fresh.updatedAt = nowIso();
    await this.save(guildId, fresh, { backup: true });
    return fresh;
  }

  async exists(guildId) {
    const raw = await this.storage.tryReadRaw(this.relativePath(guildId));
    return raw !== null;
  }

  filePath(guildId) {
    return path.join(this.storage.rootDir, this.relativePath(guildId));
  }
}

/** Crea todos los almacenes por servidor. */
export function createStores(storage) {
  const stores = {
    guilds: new GuildDocumentStore(storage, 'guilds'),
    warnings: new GuildDocumentStore(storage, 'warnings'),
    incidents: new GuildDocumentStore(storage, 'incidents'),
    moderation: new GuildDocumentStore(storage, 'moderation'),
    trusted: new GuildDocumentStore(storage, 'trusted'),
    filters: new GuildDocumentStore(storage, 'filters'),
    stats: new GuildDocumentStore(storage, 'stats'),
  };
  stores.all = Object.values(stores).filter((store) => store instanceof GuildDocumentStore);
  return stores;
}

/** Crea los archivos de un servidor si faltan, sin sobrescribir datos existentes. */
export async function ensureGuildDocuments(stores, guildId) {
  await Promise.all(stores.all.map((store) => store.get(guildId)));
}

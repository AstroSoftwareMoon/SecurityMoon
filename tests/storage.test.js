// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JsonStorage } from '../src/storage/json-storage.js';
import { BackupManager } from '../src/storage/backup-manager.js';
import { createStores, ensureGuildDocuments, GuildDocumentStore } from '../src/storage/stores.js';
import { createNullLogger } from '../src/utils/logger.js';
import { StorageError, ValidationError } from '../src/utils/errors.js';

const GUILD_A = '111111111111111111';
const GUILD_B = '222222222222222222';

async function createStorage() {
  const root = await mkdtemp(path.join(tmpdir(), 'securitymoon-storage-'));
  const logger = createNullLogger();
  const backupManager = new BackupManager({
    backupRoot: path.join(root, 'data', 'backups'),
    logger,
    maxBackups: 3,
  });
  const storage = new JsonStorage({
    rootDir: path.join(root, 'data'),
    logger,
    backupManager,
  });
  await storage.init(['guilds', 'warnings', 'incidents', 'backups']);
  return {
    root,
    storage,
    backupManager,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

test('las actualizaciones concurrentes no pierden escrituras', async () => {
  const { storage, cleanup } = await createStorage();
  try {
    const file = 'guilds/333333333333333333.json';
    await storage.write(file, { counter: 0 });
    await Promise.all(
      Array.from({ length: 20 }, () =>
        storage.update(file, { counter: 0 }, (document) => {
          document.counter += 1;
          return document;
        }),
      ),
    );
    const result = await storage.read(file, { counter: 0 });
    assert.equal(result.counter, 20);
  } finally {
    await cleanup();
  }
});

test('un archivo inexistente se crea con los valores predeterminados', async () => {
  const { storage, cleanup } = await createStorage();
  try {
    const result = await storage.read('guilds/444444444444444444.json', { enabled: true, items: [] });
    assert.deepEqual(result, { enabled: true, items: [] });
  } finally {
    await cleanup();
  }
});

test('un archivo corrupto se recupera desde la última copia de seguridad', async () => {
  const { storage, root, cleanup } = await createStorage();
  try {
    const file = 'guilds/555555555555555555.json';
    await storage.write(file, { version: 1, data: 'primera' });
    await storage.write(file, { version: 2, data: 'segunda' }, { backup: true });
    await writeFile(path.join(root, 'data', file), '{ esto no es json', 'utf8');

    const recovered = await storage.read(file, { version: 0, data: 'default' });
    assert.equal(recovered.version, 1);
    assert.equal(recovered.data, 'primera');

    const onDisk = JSON.parse(await readFile(path.join(root, 'data', file), 'utf8'));
    assert.equal(onDisk.version, 1);
  } finally {
    await cleanup();
  }
});

test('un archivo corrupto sin copia válida vuelve a los valores predeterminados', async () => {
  const { storage, root, cleanup } = await createStorage();
  try {
    const file = 'guilds/666666666666666666.json';
    await writeFile(path.join(root, 'data', file), 'no-json', 'utf8');
    const recovered = await storage.read(file, { version: 0, ok: true });
    assert.deepEqual(recovered, { version: 0, ok: true });
  } finally {
    await cleanup();
  }
});

test('las rutas no permitidas se rechazan', async () => {
  const { storage, cleanup } = await createStorage();
  try {
    await assert.rejects(() => storage.read('../fuera.json', {}), StorageError);
    await assert.rejects(() => storage.read('guilds/../../fuera.json', {}), StorageError);
    await assert.rejects(() => storage.read('guilds\\windows.json', {}), StorageError);
  } finally {
    await cleanup();
  }
});

test('los documentos de cada servidor están aislados', async () => {
  const { storage, cleanup } = await createStorage();
  try {
    const stores = createStores(storage);
    const settingsA = await stores.guilds.get(GUILD_A);
    settingsA.protectionLevel = 'extreme';
    await stores.guilds.save(GUILD_A, settingsA);

    const loadedA = await stores.guilds.get(GUILD_A);
    const loadedB = await stores.guilds.get(GUILD_B);
    assert.equal(loadedA.protectionLevel, 'extreme');
    assert.equal(loadedB.protectionLevel, 'medium');
    assert.equal(loadedA.guildId, GUILD_A);
    assert.equal(loadedB.guildId, GUILD_B);
  } finally {
    await cleanup();
  }
});

test('ensureGuildDocuments crea todos los documentos del servidor', async () => {
  const { storage, cleanup } = await createStorage();
  try {
    const stores = createStores(storage);
    await ensureGuildDocuments(stores, GUILD_A);
    for (const store of stores.all) {
      const raw = await storage.tryReadRaw(store.relativePath(GUILD_A));
      assert.ok(raw, `Falta el documento ${store.kind}`);
      const parsed = JSON.parse(raw);
      assert.equal(parsed.guildId, GUILD_A);
    }
  } finally {
    await cleanup();
  }
});

test('el almacén rechaza IDs de servidor inválidos', async () => {
  const { storage, cleanup } = await createStorage();
  try {
    const stores = createStores(storage);
    await assert.rejects(() => stores.guilds.get('no-es-un-id'), ValidationError);
    assert.throws(() => GuildDocumentStore.assertGuildId('123'), ValidationError);
  } finally {
    await cleanup();
  }
});

test('los documentos normalizados descartan claves desconocidas', async () => {
  const { storage, cleanup } = await createStorage();
  try {
    const stores = createStores(storage);
    await stores.guilds.update(GUILD_A, (document) => {
      document.claveArbitraria = 'peligrosa';
      document.modules.antiRaid.joinThreshold = 9999;
      return document;
    });
    const settings = await stores.guilds.get(GUILD_A);
    assert.equal(settings.claveArbitraria, undefined);
    assert.equal(settings.modules.antiRaid.joinThreshold, 8);
  } finally {
    await cleanup();
  }
});

test('clear conserva createdAt y vacía los datos del documento', async () => {
  const { storage, cleanup } = await createStorage();
  try {
    const stores = createStores(storage);
    const created = await stores.warnings.get(GUILD_A);
    await stores.warnings.update(GUILD_A, (document) => {
      document.warnings.push({
        id: 1,
        userId: GUILD_B,
        moderatorId: GUILD_A,
        reason: 'Prueba',
      });
      document.nextId = 2;
      return document;
    });
    const cleared = await stores.warnings.clear(GUILD_A);
    assert.equal(cleared.warnings.length, 0);
    assert.equal(cleared.nextId, 1);
    if (created.createdAt) assert.equal(cleared.createdAt, created.createdAt);
  } finally {
    await cleanup();
  }
});

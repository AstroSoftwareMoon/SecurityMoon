// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadConfig, safeConfigSummary, validateConfig } from '../src/config.js';
import { ConfigError } from '../src/utils/errors.js';

const TOKEN = 'A'.repeat(30) + '.' + 'B'.repeat(10) + '.' + 'C'.repeat(30);
const CLIENT_ID = '123456789012345678';

function baseConfig(overrides = {}) {
  return {
    token: TOKEN,
    clientId: CLIENT_ID,
    defaultLanguage: 'es',
    prefix: '/',
    logging: { level: 'info' },
    promotions: { enabled: false, intervalHours: 24 },
    ...overrides,
  };
}

test('validateConfig acepta una configuración válida', () => {
  const { config, errors } = validateConfig(baseConfig());
  assert.deepEqual(errors, []);
  assert.equal(config.clientId, CLIENT_ID);
  assert.equal(config.promotions.enabled, false);
});

test('validateConfig rechaza tokens y clientId de ejemplo sin filtrar el token', () => {
  const raw = baseConfig({ token: 'PON_AQUI_EL_TOKEN', clientId: 'ID_DE_LA_APLICACION' });
  const { errors } = validateConfig(raw);
  const joined = errors.join(' ');
  assert.match(joined, /token/i);
  assert.match(joined, /clientId/);
  assert.ok(!joined.includes(raw.token));
});

test('validateConfig exige un intervalo de promociones de al menos 24 horas', () => {
  const { errors } = validateConfig(baseConfig({ promotions: { enabled: true, intervalHours: 12 } }));
  assert.ok(errors.some((error) => error.includes('intervalHours')));
});

test('validateConfig rechaza niveles de registro desconocidos', () => {
  const { errors } = validateConfig(baseConfig({ logging: { level: 'verbose' } }));
  assert.ok(errors.some((error) => error.includes('logging.level')));
});

test('safeConfigSummary nunca incluye el token', () => {
  const { config } = validateConfig(baseConfig());
  const summary = safeConfigSummary(config);
  assert.equal(summary.tokenConfigured, true);
  assert.ok(!JSON.stringify(summary).includes(TOKEN));
});

test('loadConfig aplica DISCORD_TOKEN y DISCORD_CLIENT_ID del entorno', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'securitymoon-config-'));
  try {
    await writeFile(
      path.join(cwd, 'config.json'),
      JSON.stringify(baseConfig({ token: 'PON_AQUI_EL_TOKEN', clientId: 'ID_DE_LA_APLICACION' })),
      'utf8',
    );
    const config = await loadConfig({
      cwd,
      env: { DISCORD_TOKEN: TOKEN, DISCORD_CLIENT_ID: CLIENT_ID },
    });
    assert.equal(config.token, TOKEN);
    assert.equal(config.clientId, CLIENT_ID);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('loadConfig lanza un error claro si falta config.json', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'securitymoon-config-'));
  try {
    await assert.rejects(
      () => loadConfig({ cwd, env: {} }),
      (error) => error instanceof ConfigError && /config\.json/.test(error.message),
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('loadConfig rechaza JSON inválido sin exponer contenido', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'securitymoon-config-'));
  try {
    await writeFile(path.join(cwd, 'config.json'), '{ token: roto }', 'utf8');
    await assert.rejects(
      () => loadConfig({ cwd, env: {} }),
      (error) => error instanceof ConfigError && /JSON válido/.test(error.message),
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

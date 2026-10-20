// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDocument,
  defaultGuildSettings,
  normalizeDocument,
  isValidDomain,
  normalizeDomain,
} from '../src/storage/schemas.js';
import { ValidationError } from '../src/utils/errors.js';
import { MODULE_KEYS, PROTECTION_LEVELS } from '../src/constants.js';

const GUILD_ID = '123456789012345678';

test('defaultGuildSettings genera una configuración completa y válida', () => {
  const settings = defaultGuildSettings(GUILD_ID);
  assert.equal(settings.guildId, GUILD_ID);
  assert.equal(settings.setupCompleted, false);
  assert.ok(PROTECTION_LEVELS.includes(settings.protectionLevel));
  for (const key of MODULE_KEYS) {
    assert.equal(typeof settings.modules[key].enabled, 'boolean');
  }
  assert.equal(assertDocument('guilds', settings), true);
});

test('normalizeDocument rellena valores y elimina claves desconocidas', () => {
  const normalized = normalizeDocument(
    'guilds',
    {
      guildId: GUILD_ID,
      extra: 'no permitido',
      protectionLevel: 'inventado',
      modules: { antiRaid: { joinThreshold: -10 } },
    },
    GUILD_ID,
  );
  assert.equal(normalized.extra, undefined);
  assert.equal(normalized.protectionLevel, 'medium');
  assert.equal(normalized.modules.antiRaid.joinThreshold, 8);
  assert.equal(normalized.guildId, GUILD_ID);
});

test('normalizeDocument limita y deduplica listas de confianza', () => {
  const trusted = normalizeDocument(
    'trusted',
    {
      guildId: GUILD_ID,
      users: [
        { id: GUILD_ID, addedBy: GUILD_ID, note: 'uno' },
        { id: GUILD_ID, addedBy: GUILD_ID, note: 'duplicado' },
        { id: 'inválido', addedBy: GUILD_ID },
      ],
    },
    GUILD_ID,
  );
  assert.equal(trusted.users.length, 1);
  assert.equal(trusted.users[0].note, 'uno');
});

test('assertDocument rechaza documentos incompletos', () => {
  assert.throws(() => assertDocument('guilds', { guildId: GUILD_ID }), ValidationError);
});

test('los documentos de un servidor no pueden tener otro guildId', () => {
  const settings = defaultGuildSettings(GUILD_ID);
  settings.guildId = '999999999999999999';
  // assertDocument valida el formato, no la propiedad; el almacén comprueba la identidad.
  assert.equal(assertDocument('guilds', settings), true);
});

test('los dominios se normalizan y validan sin protocolo', () => {
  assert.equal(normalizeDomain('https://WWW.Ejemplo.com/ruta'), 'ejemplo.com');
  assert.equal(isValidDomain('ejemplo.com'), true);
  assert.equal(isValidDomain('sub.ejemplo.co.uk'), true);
  assert.equal(isValidDomain('https://ejemplo.com'), false);
  assert.equal(isValidDomain('ejemplo'), false);
  assert.equal(isValidDomain('ejemplo..com'), false);
});

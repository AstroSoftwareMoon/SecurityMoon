// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Logger } from '../src/utils/logger.js';

test('el logger redacta secretos y tokens en archivo y contexto', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'securitymoon-logger-'));
  const secret = 'secreto-super-privado-123';
  const token = `${'A'.repeat(30)}.${'B'.repeat(10)}.${'C'.repeat(30)}`;
  const logger = new Logger({
    level: 'debug',
    directory: root,
    console: false,
    secrets: [secret],
  });
  try {
    await logger.init();
    await logger.info(`Token=${token} y secreto=${secret}`, {
      authorization: 'Bearer abc',
      token: secret,
      webhook: 'https://discord.com/api/webhooks/123456789012345678/abcdef',
    });
    await logger.flush();

    const content = await readFile(logger.filePath, 'utf8');
    assert.ok(!content.includes(secret));
    assert.ok(!content.includes(token));
    assert.ok(!content.includes('abcdef'));
    assert.match(content, /\[REDACTED/);
    const entry = JSON.parse(content.trim());
    assert.equal(entry.level, 'info');
    assert.equal(entry.context.authorization, '[REDACTED]');
    assert.equal(entry.context.token, '[REDACTED]');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('el logger respeta el nivel configurado', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'securitymoon-logger-'));
  const logger = new Logger({ level: 'warn', directory: root, console: false });
  try {
    await logger.init();
    await logger.debug('no debería guardarse');
    await logger.info('tampoco');
    await logger.warn('sí debe guardarse');
    await logger.flush();
    const content = await readFile(logger.filePath, 'utf8');
    assert.ok(!content.includes('no debería guardarse'));
    assert.ok(!content.includes('tampoco'));
    assert.ok(content.includes('sí debe guardarse'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

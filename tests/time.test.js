// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  discordTimestamp,
  formatBytes,
  formatDate,
  formatDuration,
  formatUptime,
  isValidIsoDate,
  msSince,
  nowIso,
  parseDuration,
} from '../src/utils/time.js';

test('parseDuration convierte formatos simples', () => {
  assert.equal(parseDuration('30s'), 30_000);
  assert.equal(parseDuration('10m'), 600_000);
  assert.equal(parseDuration('2h'), 7_200_000);
  assert.equal(parseDuration('1d'), 86_400_000);
  assert.equal(parseDuration('1w'), 604_800_000);
});

test('parseDuration rechaza entradas inválidas', () => {
  assert.throws(() => parseDuration('10'), /inválida/);
  assert.throws(() => parseDuration('0m'), /mayor que cero/);
  assert.throws(() => parseDuration(null), /texto/);
});

test('formatDuration produce textos cortos', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(90_000), '1m 30s');
  assert.equal(formatDuration(3_661_000), '1h 1m');
});

test('formatUptime incluye días, horas, minutos y segundos', () => {
  assert.equal(formatUptime(90_061_000), '1d 1h 1m 1s');
});

test('discordTimestamp genera una marca válida', () => {
  const output = discordTimestamp('2024-01-01T00:00:00.000Z', 'R');
  assert.match(output, /^<t:\d+:R>$/);
  assert.equal(discordTimestamp('fecha inválida'), 'desconocido');
});

test('las utilidades ISO validan y comparan fechas', () => {
  const iso = nowIso();
  assert.equal(isValidIsoDate(iso), true);
  assert.equal(isValidIsoDate('no'), false);
  assert.ok(msSince(iso, Date.parse(iso) + 1000) >= 1000);
});

test('formatBytes usa unidades legibles', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatBytes(1024 * 1024), '1.0 MB');
});

test('formatDate devuelve un texto para fechas válidas', () => {
  assert.notEqual(formatDate('2024-01-01T12:00:00.000Z'), 'desconocido');
  assert.equal(formatDate('no'), 'desconocido');
});

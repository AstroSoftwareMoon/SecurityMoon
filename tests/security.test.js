// Soporte: https://discord.gg/eBszxvAuhN

import test from 'node:test';
import assert from 'node:assert/strict';
import { PermissionsBitField, PermissionFlagsBits } from 'discord.js';
import {
  analyzeContent,
  analyzeLink,
  extractLinks,
} from '../src/security/anti-phishing.js';
import {
  createMessageEntry,
  escalateAction,
  evaluateSpam,
} from '../src/security/anti-spam.js';
import { diffDangerousPermissions } from '../src/security/anti-nuke.js';
import { defaultGuildSettings } from '../src/storage/schemas.js';
import { dangerousPermissionNames } from '../src/utils/permissions.js';

const GUILD_ID = '123456789012345678';
const filters = { whitelist: { domains: [] }, blacklist: { domains: [] } };

test('extractLinks detecta enlaces e invitaciones', () => {
  const links = extractLinks('Mira https://example.com/ruta y discord.gg/abc123');
  assert.equal(links.length, 2);
  assert.equal(links[0].host, 'example.com');
  assert.equal(links[1].isInvite, true);
});

test('extractLinks ignora correos y texto sin dominio', () => {
  assert.deepEqual(extractLinks('hola@ejemplo.com y palabras sueltas'), []);
});

test('un enlace oficial de GitHub no se marca como sospechoso', () => {
  const result = analyzeContent('Código en https://github.com/AstroSoftwareMoon/SecurityMoon', {
    filters,
    config: { suspiciousScoreThreshold: 3, blockInvites: true },
  });
  assert.equal(result.suspicious, false);
  assert.equal(result.score, 0);
});

test('un dominio de imitación con palabras de regalo se marca como sospechoso', () => {
  const result = analyzeContent('Regalo gratis https://discord-nitro-gift.xyz/claim', {
    filters,
    config: { suspiciousScoreThreshold: 3, blockInvites: true },
  });
  assert.equal(result.suspicious, true);
  assert.ok(result.score >= 3);
  assert.ok(result.reasons.length > 0);
});

test('la lista negra bloquea un dominio con puntuación máxima', () => {
  const customFilters = {
    whitelist: { domains: [] },
    blacklist: { domains: [{ value: 'malicioso.example' }] },
  };
  const result = analyzeContent('https://sub.malicioso.example/login', {
    filters: customFilters,
    config: { suspiciousScoreThreshold: 5 },
  });
  assert.equal(result.blacklisted, true);
  assert.equal(result.suspicious, true);
  assert.equal(result.score, 100);
});

test('la lista blanca exime un dominio del análisis', () => {
  const customFilters = {
    whitelist: { domains: [{ value: 'mi-servidor.com' }] },
    blacklist: { domains: [] },
  };
  const result = analyzeContent('https://login.mi-servidor.com/verify', {
    filters: customFilters,
    config: { suspiciousScoreThreshold: 1 },
  });
  assert.equal(result.suspicious, false);
  assert.equal(result.score, 0);
});

test('blockInvites incrementa la puntuación de una invitación', () => {
  const link = extractLinks('https://discord.gg/abcdef')[0];
  const blocked = analyzeLink(link, {
    filters,
    config: { blockInvites: true, suspiciousScoreThreshold: 3 },
  });
  const allowed = analyzeLink(link, {
    filters,
    config: { blockInvites: false, suspiciousScoreThreshold: 3 },
  });
  assert.ok(blocked.score > allowed.score);
  assert.ok(blocked.reasons.some((reason) => reason.includes('Invitación')));
});

test('las URL con IP se consideran sospechosas', () => {
  const result = analyzeContent('http://192.168.1.20/login', {
    filters,
    config: { suspiciousScoreThreshold: 3 },
  });
  assert.equal(result.suspicious, true);
  assert.ok(result.reasons.some((reason) => reason.includes('dirección IP')));
});

test('createMessageEntry calcula métricas sin acceder a la red', () => {
  const entry = createMessageEntry({
    id: '123456789012345678',
    content: 'HOLA',
    createdTimestamp: 1000,
    mentions: { users: { size: 1 }, roles: { size: 0 } },
  });
  assert.equal(entry.normalized, 'hola');
  assert.equal(entry.mentions, 1);
  assert.equal(entry.links, 0);
  assert.equal(entry.emojis, 0);
  assert.equal(entry.capsRatio, 1);

  const rich = createMessageEntry({
    id: '123456789012345678',
    content: '<:emoji:123456789012345678> https://example.com',
    createdTimestamp: 1000,
    mentions: { users: { size: 0 }, roles: { size: 0 } },
  });
  assert.equal(rich.emojis, 1);
  assert.equal(rich.links, 1);
});

test('evaluateSpam detecta flood, duplicados y menciones', () => {
  const config = defaultGuildSettings(GUILD_ID).modules.antiSpam;
  const now = Date.now();
  const entries = Array.from({ length: config.messageThreshold }, () => ({
    id: '123456789012345678',
    content: 'hola',
    normalized: 'hola',
    timestamp: now - 500,
    mentions: config.mentionThreshold,
    links: 0,
    emojis: 0,
    capsRatio: 0,
    length: 4,
  }));
  const result = evaluateSpam(entries, config, now);
  assert.equal(result.violating, true);
  assert.ok(result.reasons.some((reason) => reason.code === 'rate'));
  assert.ok(result.reasons.some((reason) => reason.code === 'duplicate'));
  assert.ok(result.reasons.some((reason) => reason.code === 'mentions'));
});

test('evaluateSpam no marca mensajes aislados', () => {
  const config = defaultGuildSettings(GUILD_ID).modules.antiSpam;
  const result = evaluateSpam(
    [
      {
        id: '123456789012345678',
        content: 'hola',
        normalized: 'hola',
        timestamp: Date.now(),
        mentions: 0,
        links: 0,
        emojis: 0,
        capsRatio: 0,
        length: 4,
      },
    ],
    config,
  );
  assert.equal(result.violating, false);
});

test('escalateAction asciende y se detiene en el máximo', () => {
  assert.equal(escalateAction('warn', 1, true), 'warn');
  assert.equal(escalateAction('warn', 2, true), 'timeout');
  assert.equal(escalateAction('warn', 3, true), 'kick');
  assert.equal(escalateAction('warn', 99, true), 'ban');
  assert.equal(escalateAction('warn', 99, false), 'warn');
});

test('diffDangerousPermissions solo devuelve permisos añadidos', () => {
  const added = diffDangerousPermissions(0n, PermissionFlagsBits.Administrator | PermissionFlagsBits.KickMembers);
  assert.deepEqual(added.sort(), ['Administrator', 'KickMembers']);
  const removed = diffDangerousPermissions(PermissionFlagsBits.Administrator, 0n);
  assert.deepEqual(removed, []);
});

test('dangerousPermissionNames enumera permisos de riesgo', () => {
  const permissions = new PermissionsBitField([
    'Administrator',
    'ManageRoles',
    'ViewChannel',
  ]);
  const names = dangerousPermissionNames(permissions);
  assert.ok(names.includes('Administrator'));
  assert.ok(names.includes('ManageRoles'));
  assert.ok(!names.includes('ViewChannel'));
});

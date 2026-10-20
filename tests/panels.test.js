// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import test from 'node:test';
import assert from 'node:assert/strict';
import { Collection, GuildVerificationLevel, PermissionsBitField } from 'discord.js';
import { fileURLToPath } from 'node:url';
import { loadCommands } from '../src/utils/command-loader.js';
import { defaultGuildSettings, normalizeDocument } from '../src/storage/schemas.js';
import { openSecurityPanel, handleSecurityPanelInteraction } from '../src/panels/security-panel.js';
import { startSetup, handleSetupInteraction } from '../src/panels/setup-wizard.js';
import { openHelpPanel } from '../src/panels/help-panel.js';

const GUILD_ID = '123456789012345678';
const USER_ID = '987654321098765432';
const commands = await loadCommands(fileURLToPath(new URL('../src/commands', import.meta.url)));

function createMocks() {
  const settings = defaultGuildSettings(GUILD_ID);
  const trusted = normalizeDocument('trusted', {}, GUILD_ID);
  const filters = normalizeDocument('filters', {}, GUILD_ID);
  const incidents = normalizeDocument('incidents', {}, GUILD_ID);
  const logger = { info() {}, warn() {}, error() {}, debug() {} };

  const me = {
    permissions: new PermissionsBitField(Object.values(PermissionsBitField.Flags)),
    roles: { highest: { position: 100, comparePositionTo: () => 1 } },
  };
  const everyone = {
    id: GUILD_ID,
    name: '@everyone',
    permissions: new PermissionsBitField([]),
  };
  const guild = {
    id: GUILD_ID,
    name: 'Servidor de prueba',
    ownerId: '111111111111111111',
    verificationLevel: GuildVerificationLevel.Medium,
    memberCount: 10,
    roles: { everyone, cache: new Collection() },
    members: {
      me,
      cache: new Collection(),
      fetch: async () => null,
    },
    channels: {
      cache: new Collection(),
      fetch: async () => null,
    },
  };

  const stores = {
    guilds: {
      get: async () => settings,
      update: async (_id, mutator) => mutator(settings),
      save: async (_id, document) => document,
    },
    trusted: {
      get: async () => trusted,
      update: async (_id, mutator) => mutator(trusted),
    },
    filters: {
      get: async () => filters,
      update: async (_id, mutator) => mutator(filters),
    },
    incidents: {
      get: async () => incidents,
      update: async (_id, mutator) => mutator(incidents),
    },
  };

  const client = {
    commands,
    stores,
    logger,
    config: { promotions: { enabled: false, intervalHours: 24 } },
    stats: { increment() {}, flush: async () => {} },
    warnings: { add: async () => ({ id: 1 }) },
    incidents: {
      record: async () => ({ incident: { id: 1 } }),
      list: async () => [],
      get: async () => null,
      clear: async () => incidents,
    },
    security: {
      emergency: {
        activate: async () => ({ result: 'activado' }),
        deactivate: async () => ({ result: 'desactivado' }),
      },
    },
  };

  const interaction = {
    client,
    guild,
    user: { id: USER_ID, tag: 'Usuario#0001' },
    guildId: GUILD_ID,
    memberPermissions: new PermissionsBitField(['ManageGuild']),
    replied: false,
    deferred: false,
    payload: null,
    inGuild: () => true,
    isButton: () => false,
    isAnySelectMenu: () => false,
    isModalSubmit: () => false,
    reply: async (payload) => {
      interaction.payload = payload;
      interaction.replied = true;
      return payload;
    },
    update: async (payload) => {
      interaction.payload = payload;
      return payload;
    },
    followUp: async (payload) => {
      interaction.payload = payload;
      return payload;
    },
    showModal: async (modal) => {
      interaction.modal = modal;
      return modal;
    },
  };
  return { interaction, settings, stores, client };
}

test('el panel de seguridad renderiza la vista general', async () => {
  const { interaction } = createMocks();
  await openSecurityPanel(interaction);
  assert.ok(interaction.payload.embeds[0].data.title.includes('Centro de seguridad'));
  assert.ok(interaction.payload.components.length >= 2);
});

test('las vistas de módulos, ajustes, listas y ayuda se renderizan', async () => {
  for (const view of ['modules', 'settings', 'lists', 'help', 'trusted', 'diagnostics', 'incidents']) {
    const { interaction } = createMocks();
    interaction.isButton = () => true;
    interaction.customId = `sm:panel:view:${view}`;
    await handleSecurityPanelInteraction(interaction);
    assert.ok(interaction.payload.embeds[0], `La vista ${view} no generó embed`);
    assert.ok(interaction.payload.components.length > 0, `La vista ${view} no generó componentes`);
  }
});

test('el panel permite abrir el detalle de un módulo', async () => {
  const { interaction } = createMocks();
  interaction.isButton = () => true;
  interaction.customId = 'sm:panel:module:antiRaid';
  await handleSecurityPanelInteraction(interaction);
  assert.ok(interaction.payload.embeds[0].data.title.includes('Anti-Raid'));
});

test('el asistente de configuración empieza en el paso 1 y avanza con el nivel', async () => {
  const { interaction } = createMocks();
  await startSetup(interaction);
  assert.ok(interaction.payload.embeds[0].data.title.includes('Paso 1 de 10'));

  interaction.isButton = () => true;
  interaction.customId = 'sm:setup:start';
  await handleSetupInteraction(interaction);
  assert.ok(interaction.payload.embeds[0].data.title.includes('Paso 2 de 10'));

  interaction.isButton = () => false;
  interaction.isAnySelectMenu = () => true;
  interaction.customId = 'sm:setup:select:preset';
  interaction.values = ['high'];
  await handleSetupInteraction(interaction);
  assert.ok(interaction.payload.embeds[0].data.title.includes('Paso 3 de 10'));
});

test('el panel de ayuda renderiza el inicio', async () => {
  const { interaction } = createMocks();
  await openHelpPanel(interaction);
  assert.ok(interaction.payload.embeds[0].data.title.includes('Ayuda'));
  assert.ok(interaction.payload.components.length >= 2);
});

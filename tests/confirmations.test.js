// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import test from 'node:test';
import assert from 'node:assert/strict';
import { PermissionsBitField } from 'discord.js';
import {
  buildConfirmationPayload,
  getConfirmationConfig,
  handleConfirmationInteraction,
} from '../src/utils/confirmations.js';

function createCommand(overrides = {}) {
  return {
    data: {
      name: 'ban',
      description: '🔨 Banea a un usuario.',
    },
    permissions: [],
    botPermissions: [],
    async execute() {},
    ...overrides,
  };
}

function createInteraction({ command, subcommand = null, options = [], userId = '111111111111111111' } = {}) {
  const commands = new Map([[command.data.name, command]]);
  const interaction = {
    client: {
      commands,
      logger: { debug() {}, error() {}, info() {}, warn() {} },
      stats: { increment() {} },
    },
    user: { id: userId, tag: 'Moderador#0001' },
    guildId: '222222222222222222',
    channelId: '333333333333333333',
    memberPermissions: new PermissionsBitField(['BanMembers']),
    appPermissions: new PermissionsBitField(['BanMembers']),
    replied: false,
    deferred: false,
    payload: null,
    inGuild: () => true,
    isButton: () => false,
    options: {
      data: subcommand
        ? [{ name: subcommand, type: 1, options }]
        : options,
      getSubcommand: () => subcommand,
      getString: () => null,
    },
    async reply(payload) {
      interaction.payload = payload;
      interaction.replied = true;
      return payload;
    },
    async update(payload) {
      interaction.payload = payload;
      return payload;
    },
    async deferUpdate() {
      interaction.deferred = true;
    },
    async editReply(payload) {
      interaction.payload = payload;
      return payload;
    },
    async followUp(payload) {
      interaction.payload = payload;
      return payload;
    },
  };
  return interaction;
}

test('getConfirmationConfig respeta subcomandos y funciones', () => {
  const interaction = createInteraction({ command: createCommand(), subcommand: 'status' });
  assert.equal(
    getConfirmationConfig(
      { confirmation: { subcommands: ['enable', 'disable'] } },
      interaction,
    ),
    null,
  );
  assert.deepEqual(
    getConfirmationConfig(
      { confirmation: { subcommands: ['enable', 'status'] } },
      interaction,
    ),
    { subcommands: ['enable', 'status'] },
  );

  const command = {
    confirmation(interactionValue) {
      return interactionValue.options.getSubcommand() === 'clear' ? { danger: true } : null;
    },
  };
  assert.deepEqual(getConfirmationConfig(command, interaction), null);
});

test('buildConfirmationPayload incluye botones, emojis y parámetros', () => {
  const command = createCommand();
  const interaction = createInteraction({
    command,
    options: [
      { name: 'user', type: 6, value: '999999999999999999' },
      { name: 'reason', type: 3, value: 'Spam repetido' },
    ],
  });
  const payload = buildConfirmationPayload(command, interaction, { danger: true });

  assert.match(payload.embeds[0].data.title, /Confirmar acción destructiva/);
  assert.match(payload.embeds[0].data.description, /\/ban/);
  assert.equal(payload.components.length, 1);
  const buttons = payload.components[0].components;
  assert.equal(buttons.length, 2);
  assert.match(buttons[0].data.custom_id, /^sm:confirm:[a-f0-9-]+:yes$/);
  assert.match(buttons[1].data.custom_id, /^sm:confirm:[a-f0-9-]+:no$/);
  assert.equal(buttons[0].data.style, 4);
  assert.equal(buttons[0].data.emoji.name, '✅');
  assert.equal(buttons[1].data.emoji.name, '❌');

  const parameters = payload.embeds[0].data.fields.find((field) => field.name.includes('Parámetros'));
  assert.match(parameters.value, /<@999999999999999999>/);
  assert.match(parameters.value, /Spam repetido/);
});

test('el botón de confirmar ejecuta el comando con las opciones originales', async () => {
  let executed = false;
  const command = createCommand({
    async execute(interaction) {
      executed = true;
      const user = interaction.options.data.find((option) => option.name === 'user');
      await interaction.reply({
        embeds: [
          {
            title: '✅ Hecho',
            description: `Usuario ${user.value}`,
          },
        ],
      });
    },
  });
  const original = createInteraction({
    command,
    options: [{ name: 'user', type: 6, value: '999999999999999999' }],
  });
  const payload = buildConfirmationPayload(command, original, { danger: true });
  const customId = payload.components[0].components[0].data.custom_id;

  const button = createInteraction({ command, userId: original.user.id });
  button.isButton = () => true;
  button.customId = customId;

  const handled = await handleConfirmationInteraction(button);
  assert.equal(handled, true);
  assert.equal(executed, true);
  const resultEmbed = button.payload.embeds[0];
  assert.match(resultEmbed.description ?? resultEmbed.data?.description, /999999999999999999/);
});

test('cancelar no ejecuta el comando y limpia los botones', async () => {
  let executed = false;
  const command = createCommand({ async execute() { executed = true; } });
  const original = createInteraction({ command });
  const payload = buildConfirmationPayload(command, original, {});
  const customId = payload.components[0].components[1].data.custom_id;

  const button = createInteraction({ command, userId: original.user.id });
  button.isButton = () => true;
  button.customId = customId;

  await handleConfirmationInteraction(button);
  assert.equal(executed, false);
  assert.match(button.payload.embeds[0].data.title, /Acción cancelada/);
  assert.deepEqual(button.payload.components, []);
});

test('solo el autor original puede confirmar', async () => {
  let executed = false;
  const command = createCommand({ async execute() { executed = true; } });
  const original = createInteraction({ command });
  const payload = buildConfirmationPayload(command, original, {});
  const customId = payload.components[0].components[0].data.custom_id;

  const button = createInteraction({ command, userId: '444444444444444444' });
  button.isButton = () => true;
  button.customId = customId;

  await handleConfirmationInteraction(button);
  assert.equal(executed, false);
  assert.match(button.payload.embeds[0].data.title, /Confirmación protegida/);
});

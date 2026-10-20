import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadCommands, commandData } from '../src/utils/command-loader.js';
import { COMMAND_HELP, HELP_CATEGORIES, buildUsage } from '../src/utils/help-metadata.js';
import { COMMAND_EMOJI, PROJECT } from '../src/constants.js';
import { baseEmbed } from '../src/utils/embeds.js';

const commands = await loadCommands(fileURLToPath(new URL('../src/commands', import.meta.url)));
const commandsDir = fileURLToPath(new URL('../src/commands', import.meta.url));

test('se cargan exactamente 51 comandos slash sin duplicados', () => {
  assert.equal(commands.size, 51);
  const names = [...commands.keys()];
  assert.equal(new Set(names).size, names.length);
});

test('todos los comandos tienen datos, descripción, categoría y execute', () => {
  for (const [name, command] of commands) {
    const json = command.data.toJSON();
    assert.equal(json.name, name);
    assert.match(name, /^[\w-]{1,32}$/);
    assert.ok(json.description && json.description.length > 5, `${name} no tiene descripción`);
    assert.ok(Object.hasOwn(HELP_CATEGORIES, command.category), `${name} tiene categoría desconocida`);
    assert.equal(typeof command.execute, 'function');
    assert.ok(Array.isArray(command.permissions), `${name} no declara permissions`);
    assert.ok(Number.isFinite(command.cooldown), `${name} no declara cooldown`);
  }
});

test('commandData devuelve todos los comandos ordenados por nombre', () => {
  const data = commandData(commands);
  assert.equal(data.length, 51);
  const names = data.map((command) => command.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test('la ayuda cubre exactamente los mismos comandos', () => {
  const helpNames = Object.keys(COMMAND_HELP).sort();
  const commandNames = [...commands.keys()].sort();
  assert.deepEqual(helpNames, commandNames);
  for (const name of commandNames) {
    assert.ok(COMMAND_HELP[name].permissions, `${name} no documenta permisos`);
    assert.ok(COMMAND_HELP[name].example, `${name} no documenta un ejemplo`);
  }
});

test('las categorías de ayuda corresponden a carpetas reales', () => {
  const categories = new Set([...commands.values()].map((command) => command.category));
  for (const category of categories) {
    assert.ok(Object.hasOwn(HELP_CATEGORIES, category), `Categoría sin metadatos: ${category}`);
  }
  assert.equal(Object.keys(HELP_CATEGORIES).length, categories.size);
});

test('buildUsage genera una línea de uso legible', () => {
  const help = commands.get('help');
  assert.equal(buildUsage(help.data.toJSON()), '/help [category]');
  const ban = commands.get('ban');
  assert.match(buildUsage(ban.data.toJSON()), /^\/ban /);
});

test('los enlaces oficiales son los del proyecto', () => {
  assert.equal(PROJECT.github, 'https://github.com/AstroSoftwareMoon/');
  assert.equal(PROJECT.repository, 'https://github.com/AstroSoftwareMoon/SecurityMoon');
  assert.equal(PROJECT.discord, 'https://discord.gg/eBszxvAuhN');
  assert.equal(PROJECT.creator, 'AstroSoftwareMoon');
  assert.equal(PROJECT.license, 'MIT');
});

test('la carpeta de comandos existe y se leyó correctamente', () => {
  assert.ok(commandsDir.endsWith('commands'));
});

test('todos los comandos tienen emoji en su descripción', () => {
  for (const [name, command] of commands) {
    const emoji = COMMAND_EMOJI[name];
    assert.ok(emoji, `${name} no tiene emoji asignado`);
    assert.ok(
      command.data.description.startsWith(emoji),
      `${name} no muestra su emoji en la descripción`,
    );
  }
});

test('los comandos de acción declaran confirmación por botones', () => {
  const actionCommands = [...commands.values()].filter((command) => command.confirmation);
  assert.ok(
    actionCommands.length >= 20,
    `Solo ${actionCommands.length} comandos tienen confirmación`,
  );
  assert.ok(commands.get('ban').confirmation, 'ban no tiene confirmación');
  assert.ok(commands.get('hackban').confirmation, 'hackban no tiene confirmación');
  assert.ok(commands.get('config').confirmation, 'config no tiene confirmación');
  assert.ok(commands.get('incident').confirmation, 'incident no tiene confirmación');
  assert.equal(commands.get('ping').confirmation, undefined);
});

test('baseEmbed añade emojis a títulos de campos habituales', () => {
  const embed = baseEmbed({
    title: '🌙 Prueba',
    fields: [{ name: 'Usuario', value: 'alguien', inline: true }],
  });
  assert.match(embed.data.fields[0].name, /^👤 Usuario/);
  assert.match(embed.data.footer.text, /SecurityMoon/);
});

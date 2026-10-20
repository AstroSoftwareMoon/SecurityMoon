// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Collection } from 'discord.js';
import { ACTION_EMOJI, COMMAND_EMOJI, OPTION_EMOJI, OPTION_TYPE_EMOJI } from '../constants.js';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Añade un emoji a los subcomandos conocidos sin tocar sus opciones.
 * Los builders de discord.js conservan la descripción como propiedad.
 */
function decorateSubcommands(options) {
  for (const option of options ?? []) {
    if (!Array.isArray(option.options)) continue;
    const emoji = ACTION_EMOJI[option.name];
    if (emoji && option.description && !option.description.startsWith(emoji)) {
      option.description = `${emoji} ${option.description}`.slice(0, 100);
    }
    decorateSubcommands(option.options);
  }
}

/**
 * Añade emojis a las descripciones de las opciones, sin tocar sus nombres
 * ni sus valores. Los subcomandos ya se decoran por separado.
 */
function decorateOptions(options) {
  for (const option of options ?? []) {
    if (Array.isArray(option.options)) {
      decorateOptions(option.options);
      continue;
    }
    if (!option.description || /^\p{Extended_Pictographic}/u.test(option.description)) continue;
    const emoji = OPTION_EMOJI[option.name] ?? OPTION_TYPE_EMOJI[option.type];
    if (emoji) option.description = `${emoji} ${option.description}`.slice(0, 100);
  }
}

/**
 * Carga comandos slash desde una carpeta, usando la subcarpeta como categoría.
 */
export async function loadCommands(commandsDir) {
  const commands = new Collection();
  const files = (await walk(commandsDir)).sort();
  for (const file of files) {
    const module = await import(pathToFileURL(file).href);
    const exported = module.default;
    const list = Array.isArray(exported) ? exported : [exported];
    for (const command of list) {
      if (!command || typeof command !== 'object') {
        throw new Error(`El archivo de comando no exporta un comando válido: ${file}`);
      }
      if (!command.data || typeof command.data.toJSON !== 'function') {
        throw new Error(`El comando no tiene un SlashCommandBuilder válido: ${file}`);
      }
      if (typeof command.execute !== 'function') {
        throw new Error(`El comando no tiene una función execute: ${file}`);
      }
      const json = command.data.toJSON();
      if (!/^[\w-]{1,32}$/.test(json.name)) {
        throw new Error(`Nombre de comando inválido: ${json.name}`);
      }
      if (commands.has(json.name)) {
        throw new Error(`Comando duplicado: ${json.name}`);
      }
      const emoji = COMMAND_EMOJI[json.name];
      if (emoji && !json.description.startsWith(emoji)) {
        command.data.setDescription(`${emoji} ${json.description}`.slice(0, 100));
      }
      decorateSubcommands(command.data.options);
      decorateOptions(command.data.options);
      const relative = path.relative(commandsDir, file);
      command.category = relative.split(path.sep)[0];
      commands.set(json.name, command);
    }
  }
  return commands;
}

/** Devuelve los datos JSON de todos los comandos, ordenados por nombre. */
export function commandData(commands) {
  return commands
    .map((command) => command.data.toJSON())
    .sort((a, b) => a.name.localeCompare(b.name));
}

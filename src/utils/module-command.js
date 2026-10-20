// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags } from 'discord.js';
import { moduleDetailEmbed } from './security-view.js';
import { defaultGuildSettings } from '../storage/schemas.js';
import { UserError } from './errors.js';

export async function getModuleContext(interaction, key) {
  const settings = await interaction.client.stores.guilds.get(interaction.guild.id);
  return { settings, config: settings.modules[key] };
}

export async function replyModuleStatus(interaction, key) {
  const { settings } = await getModuleContext(interaction, key);
  return interaction.reply({
    embeds: [moduleDetailEmbed(key, { settings })],
    flags: MessageFlags.Ephemeral,
  });
}

export async function setModuleEnabled(interaction, key, enabled) {
  const settings = await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
    document.modules[key].enabled = enabled;
    return document;
  });
  interaction.client.logger.info('Módulo de seguridad modificado', {
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    module: key,
    enabled,
  });
  return interaction.reply({
    embeds: [
      moduleDetailEmbed(key, { settings }).setDescription(
        `${enabled ? '✅ Módulo activado.' : '⛔ Módulo desactivado.'}\n\n${moduleDetailEmbed(key, { settings }).data.description ?? ''}`,
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function updateModuleSettings(interaction, key, changes, { message = null } = {}) {
  if (Object.keys(changes).length === 0) {
    throw new UserError('No indicaste ningún ajuste para modificar.');
  }
  const settings = await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
    for (const [property, value] of Object.entries(changes)) {
      const current = document.modules[key][property];
      if (value && typeof value === 'object' && !Array.isArray(value) && current && typeof current === 'object') {
        Object.assign(document.modules[key][property], value);
      } else {
        document.modules[key][property] = value;
      }
    }
    return document;
  });
  interaction.client.logger.info('Ajustes de módulo actualizados', {
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    module: key,
    changes,
  });
  const embed = moduleDetailEmbed(key, { settings });
  if (message) embed.setDescription(`${message}\n\n${moduleDetailEmbed(key, { settings }).data.description ?? ''}`);
  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export async function resetModuleSettings(interaction, key) {
  const defaults = defaultGuildSettings(interaction.guild.id).modules[key];
  const settings = await interaction.client.stores.guilds.update(interaction.guild.id, (document) => {
    document.modules[key] = defaults;
    return document;
  });
  return interaction.reply({
    embeds: [
      moduleDetailEmbed(key, { settings }).setDescription(
        `♻️ Configuración del módulo restablecida.\n\n${moduleDetailEmbed(key, { settings }).data.description ?? ''}`,
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Recoge opciones enteras/booleanas presentes en la interacción.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {Record<string, {name:string,type:'integer'|'boolean'}>} mapping
 */
export function collectChanges(interaction, mapping) {
  const changes = {};
  for (const [key, spec] of Object.entries(mapping)) {
    const value =
      spec.type === 'boolean'
        ? interaction.options.getBoolean(spec.name)
        : interaction.options.getInteger(spec.name);
    if (value !== null && value !== undefined) changes[key] = value;
  }
  return changes;
}

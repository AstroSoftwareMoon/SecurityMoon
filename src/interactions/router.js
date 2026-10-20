// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags } from 'discord.js';
import { PermissionError } from '../utils/errors.js';
import { replyError } from '../utils/responses.js';
import {
  buildConfirmationPayload,
  getConfirmationConfig,
  handleConfirmationInteraction,
} from '../utils/confirmations.js';
import { handleSecurityPanelInteraction } from '../panels/security-panel.js';
import { handleSetupInteraction } from '../panels/setup-wizard.js';
import { handleHelpInteraction } from '../panels/help-panel.js';

const UNKNOWN_COMPONENT =
  'Este componente no pertenece a la versión actual de SecurityMoon. Ejecuta el comando de nuevo.';

async function replyEphemeral(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.replied || interaction.deferred) return await interaction.followUp(payload);
    return await interaction.reply(payload);
  } catch {
    return null;
  }
}

async function handleCommand(interaction) {
  const client = interaction.client;
  const command = client.commands.get(interaction.commandName);
  if (!command) {
    return replyEphemeral(interaction, 'Ese comando ya no está disponible. Prueba de nuevo tras actualizar los comandos.');
  }

  if (command.guildOnly !== false && !interaction.inGuild()) {
    return replyEphemeral(interaction, 'Este comando solo se puede usar dentro de un servidor.');
  }

  if (Array.isArray(command.permissions) && command.permissions.length > 0) {
    if (!interaction.memberPermissions?.has(command.permissions)) {
      return replyError(
        interaction,
        new PermissionError('No tienes los permisos necesarios para ejecutar este comando.'),
      );
    }
  }

  if (Array.isArray(command.botPermissions) && command.botPermissions.length > 0) {
    if (!interaction.appPermissions?.has(command.botPermissions)) {
      return replyError(
        interaction,
        new PermissionError('SecurityMoon no tiene todos los permisos necesarios en este servidor.'),
      );
    }
  }

  const cooldownKey = `${interaction.user.id}:${command.data.name}`;
  const cooldownMs = Number.isFinite(command.cooldown) ? command.cooldown : 2500;
  const cooldown = client.cooldowns.check(cooldownKey, cooldownMs);
  if (cooldown.limited) {
    return replyEphemeral(
      interaction,
      `⏳ Espera ${(cooldown.remainingMs / 1000).toFixed(1)}s antes de volver a usar \`/${command.data.name}\`.`,
    );
  }

  const confirmation = getConfirmationConfig(command, interaction);
  if (confirmation) {
    try {
      return await interaction.reply(buildConfirmationPayload(command, interaction, confirmation));
    } catch (error) {
      client.logger.error('No se pudo mostrar la confirmación del comando', {
        command: command.data.name,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        error,
      });
      return replyError(interaction, error);
    }
  }

  try {
    await command.execute(interaction);
    if (interaction.inGuild()) {
      client.stats.increment(interaction.guild.id, 'commandsUsed');
    }
    client.logger.debug('Comando ejecutado', {
      command: command.data.name,
      userId: interaction.user.id,
      guildId: interaction.guildId,
    });
  } catch (error) {
    client.logger.error('Error al ejecutar un comando', {
      command: command.data.name,
      userId: interaction.user.id,
      guildId: interaction.guildId,
      error,
    });
    await replyError(interaction, error);
  }
  return null;
}

async function handleComponent(interaction) {
  const customId = interaction.customId ?? '';
  if (customId.startsWith('sm:confirm:')) {
    return handleConfirmationInteraction(interaction);
  }
  if (customId.startsWith('sm:panel:') || customId.startsWith('sm:modal:')) {
    return handleSecurityPanelInteraction(interaction);
  }
  if (customId.startsWith('sm:setup:')) {
    return handleSetupInteraction(interaction);
  }
  if (customId.startsWith('sm:help:')) {
    return handleHelpInteraction(interaction);
  }
  return replyEphemeral(interaction, UNKNOWN_COMPONENT);
}

async function handleModal(interaction) {
  const customId = interaction.customId ?? '';
  if (customId.startsWith('sm:modal:')) {
    return handleSecurityPanelInteraction(interaction);
  }
  if (customId.startsWith('sm:setup:')) {
    return handleSetupInteraction(interaction);
  }
  if (customId.startsWith('sm:help:')) {
    return handleHelpInteraction(interaction);
  }
  return replyEphemeral(interaction, UNKNOWN_COMPONENT);
}

/**
 * Punto de entrada único para interacciones de Discord.
 */
export async function handleInteraction(interaction) {
  const client = interaction.client;
  try {
    if (interaction.isChatInputCommand()) return await handleCommand(interaction);
    if (interaction.isButton() || interaction.isAnySelectMenu()) return await handleComponent(interaction);
    if (interaction.isModalSubmit()) return await handleModal(interaction);
    return null;
  } catch (error) {
    client.logger.error('Error no controlado en una interacción', {
      type: interaction.type,
      customId: interaction.customId ?? null,
      userId: interaction.user?.id ?? null,
      guildId: interaction.guildId ?? null,
      error,
    });
    try {
      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply({
          content: 'Ha ocurrido un error inesperado. Inténtalo de nuevo o revisa los registros del bot.',
          flags: MessageFlags.Ephemeral,
        });
      }
      if (!interaction.isRepliable?.()) return null;
      return await interaction.followUp({
        content: 'Ha ocurrido un error inesperado al procesar la interacción.',
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      return null;
    }
  }
}

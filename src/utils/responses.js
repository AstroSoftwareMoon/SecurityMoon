// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags } from 'discord.js';
import { errorEmbed } from './embeds.js';
import { getUserMessage } from './errors.js';

const UNKNOWN_INTERACTION = 10062;
const ALREADY_ACKNOWLEDGED = 40060;

function isInteractionGone(error) {
  return error?.code === UNKNOWN_INTERACTION || error?.code === ALREADY_ACKNOWLEDGED;
}

/**
 * Responde de forma segura, evitando errores por interacciones caducadas.
 */
export async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred) return await interaction.editReply(payload);
    if (interaction.replied) return await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
    return await interaction.reply(payload);
  } catch (error) {
    if (!isInteractionGone(error)) throw error;
    return null;
  }
}

export async function safeEphemeral(interaction, payload) {
  return safeReply(interaction, { ...payload, flags: MessageFlags.Ephemeral });
}

export async function safeUpdate(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    }
    return await interaction.update(payload);
  } catch (error) {
    if (!isInteractionGone(error)) throw error;
    return null;
  }
}

export async function safeFollowUp(interaction, payload) {
  try {
    return await interaction.followUp(payload);
  } catch (error) {
    if (!isInteractionGone(error)) throw error;
    return null;
  }
}

export async function replyError(interaction, error, fallback) {
  const message = getUserMessage(error, fallback);
  return safeReply(interaction, {
    embeds: [errorEmbed('Acción no completada', message)],
    flags: MessageFlags.Ephemeral,
  });
}

export async function replyExpired(interaction) {
  try {
    return await interaction.reply({
      content: 'Esta interacción ha caducado. Ejecuta el comando de nuevo.',
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    if (!isInteractionGone(error)) throw error;
    return null;
  }
}

export { isInteractionGone };

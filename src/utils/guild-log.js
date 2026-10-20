// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { ChannelType, PermissionFlagsBits } from 'discord.js';

/**
 * Envía un embed a un canal configurado, comprobando permisos y sin
 * propagar errores de red a los manejadores de seguridad.
 */
export async function sendGuildEmbed(client, guild, channelId, embed) {
  if (!channelId) return false;
  let channel = guild.channels.cache.get(channelId);
  if (!channel) {
    channel = await guild.channels.fetch(channelId).catch(() => null);
  }
  if (!channel) return false;
  if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) return false;

  const permissions = channel.permissionsFor(guild.members.me);
  if (
    !permissions?.has(PermissionFlagsBits.ViewChannel) ||
    !permissions.has(PermissionFlagsBits.SendMessages) ||
    !permissions.has(PermissionFlagsBits.EmbedLinks)
  ) {
    client.logger?.warn('No hay permisos para enviar al canal configurado', {
      guildId: guild.id,
      channelId,
    });
    return false;
  }

  try {
    await channel.send({ embeds: [embed] });
    return true;
  } catch (error) {
    client.logger?.warn('No se pudo enviar el mensaje al canal configurado', {
      guildId: guild.id,
      channelId,
      error: error.message,
    });
    return false;
  }
}

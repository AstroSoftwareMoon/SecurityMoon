// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';
import { ensureGuildDocuments } from '../storage/stores.js';

export const name = Events.GuildCreate;
export const once = false;

export async function execute(client, guild) {
  await ensureGuildDocuments(client.stores, guild.id);
  client.logger.info('SecurityMoon añadido a un servidor', {
    guildId: guild.id,
    guildName: guild.name,
    members: guild.memberCount,
  });
}

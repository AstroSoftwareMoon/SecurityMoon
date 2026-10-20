// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { ActivityType, Events } from 'discord.js';
import { VERSION } from '../utils/version.js';
import { commandData } from '../utils/command-loader.js';
import { registerGlobalCommands } from '../utils/command-registration.js';
import { ensureGuildDocuments } from '../storage/stores.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  client.startedAt = Date.now();
  try {
    const commands = commandData(client.commands);
    const registeredCommands = await registerGlobalCommands({
      token: client.config.token,
      clientId: client.config.clientId,
      body: commands,
    });
    client.logger.info('Comandos slash globales actualizados en Discord', {
      count: Array.isArray(registeredCommands) ? registeredCommands.length : commands.length,
    });
  } catch (error) {
    client.logger.error('No se pudieron actualizar los comandos slash en Discord', { error });
  }

  client.logger.info('SecurityMoon conectado', {
    user: client.user.tag,
    userId: client.user.id,
    guilds: client.guilds.cache.size,
    version: VERSION,
    node: process.version,
  });

  await Promise.all(
    [...client.guilds.cache.values()].map((guild) =>
      ensureGuildDocuments(client.stores, guild.id).catch((error) => {
        client.logger.warn('No se pudieron crear los documentos JSON del servidor', {
          guildId: guild.id,
          error: error.message,
        });
      }),
    ),
  );

  client.user.setPresence({
    status: 'online',
    activities: [
      {
        name: `la seguridad de ${client.guilds.cache.size} servidor${client.guilds.cache.size === 1 ? '' : 'es'}`,
        type: ActivityType.Watching,
      },
    ],
  });

  client.stats.start();
  client.promotions.start();
  client.securityCleanupTimer = setInterval(() => {
    client.security.antiNuke.cleanup();
  }, 10 * 60 * 1000);
  client.securityCleanupTimer.unref?.();
}

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import * as ready from './ready.js';
import * as guildCreate from './guild-create.js';
import * as guildMemberAdd from './guild-member-add.js';
import * as guildMemberRemove from './guild-member-remove.js';
import * as guildMemberUpdate from './guild-member-update.js';
import * as messageCreate from './message-create.js';
import * as channelCreate from './channel-create.js';
import * as channelDelete from './channel-delete.js';
import * as channelUpdate from './channel-update.js';
import * as roleCreate from './role-create.js';
import * as roleDelete from './role-delete.js';
import * as roleUpdate from './role-update.js';
import * as guildBanAdd from './guild-ban-add.js';
import * as interactionCreate from './interaction-create.js';
import * as clientErrors from './client-errors.js';

const MODULES = [
  ready,
  guildCreate,
  guildMemberAdd,
  guildMemberRemove,
  guildMemberUpdate,
  messageCreate,
  channelCreate,
  channelDelete,
  channelUpdate,
  roleCreate,
  roleDelete,
  roleUpdate,
  guildBanAdd,
  interactionCreate,
  clientErrors,
];

/**
 * Registra todos los manejadores de eventos con captura de errores.
 */
export function registerEvents(client) {
  for (const module of MODULES) {
    const events = Array.isArray(module.events) ? module.events : [module];
    for (const event of events) {
      if (!event?.name || typeof event.execute !== 'function') continue;
      const handler = (...args) => {
        Promise.resolve()
          .then(() => event.execute(client, ...args))
          .catch((error) => {
            client.logger.error('Error no controlado en un evento', {
              event: event.name,
              error,
            });
          });
      };
      if (event.once) client.once(event.name, handler);
      else client.on(event.name, handler);
    }
  }
}

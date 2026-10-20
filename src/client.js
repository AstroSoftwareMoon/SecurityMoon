// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import path from 'node:path';
import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} from 'discord.js';
import { DATA_SUBDIRECTORIES } from './constants.js';
import { loadCommands } from './utils/command-loader.js';
import { CooldownManager } from './utils/rate-limit.js';
import { JsonStorage } from './storage/json-storage.js';
import { BackupManager } from './storage/backup-manager.js';
import { createStores } from './storage/stores.js';
import { StatsService } from './services/stats-service.js';
import { WarningService } from './services/warning-service.js';
import { PromotionsService } from './services/promotions-service.js';
import { AntiRaid } from './security/anti-raid.js';
import { AntiNuke } from './security/anti-nuke.js';
import { AntiPhishing } from './security/anti-phishing.js';
import { AntiSpam } from './security/anti-spam.js';
import { EmergencyService } from './security/emergency.js';
import { IncidentManager } from './security/incident-manager.js';
import { registerEvents } from './events/index.js';

/**
 * Crea el cliente de Discord con almacenamiento JSON, servicios y módulos
 * de seguridad listos para usar.
 */
export async function createSecurityClient({ config, logger, cwd = process.cwd() }) {
  if (!config) throw new Error('createSecurityClient requiere la configuración.');
  if (!logger) throw new Error('createSecurityClient requiere un logger.');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [
      Partials.Channel,
      Partials.GuildMember,
      Partials.Message,
      Partials.User,
    ],
    allowedMentions: { parse: ['users'], repliedUser: false },
  });

  client.config = config;
  client.logger = logger;
  client.cwd = cwd;
  client.dataDir = path.join(cwd, 'data');
  client.commands = new Collection();
  client.cooldowns = new CooldownManager();
  client.shuttingDown = false;

  const backupManager = new BackupManager({
    backupRoot: path.join(client.dataDir, 'backups'),
    logger,
    maxBackups: 5,
  });
  const storage = new JsonStorage({
    rootDir: client.dataDir,
    logger,
    backupManager,
  });
  await storage.init(DATA_SUBDIRECTORIES);
  client.storage = storage;
  client.stores = createStores(storage);

  client.stats = new StatsService(client);
  client.warnings = new WarningService(client);
  client.incidents = new IncidentManager(client);

  client.security = {
    antiRaid: new AntiRaid(client),
    antiNuke: new AntiNuke(client),
    antiPhishing: new AntiPhishing(client),
    antiSpam: new AntiSpam(client),
    emergency: new EmergencyService(client),
  };

  client.commands = await loadCommands(path.join(cwd, 'src', 'commands'));
  client.promotions = new PromotionsService(client);
  registerEvents(client);

  return client;
}

/**
 * Cierra servicios, guarda estadísticas pendientes y destruye el cliente.
 */
export async function shutdownSecurityClient(client, { reason = 'apagado' } = {}) {
  if (!client || client.shuttingDown) return;
  client.shuttingDown = true;
  client.logger?.info('Deteniendo SecurityMoon', { reason });

  if (client.securityCleanupTimer) clearInterval(client.securityCleanupTimer);
  client.promotions?.stop();
  client.cooldowns?.stop();
  await client.stats?.stop().catch(() => {});
  await client.logger?.flush().catch(() => {});
  client.destroy();
}

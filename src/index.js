// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import path from 'node:path';
import { loadConfig } from './config.js';
import { createLogger } from './utils/logger.js';
import { VERSION } from './utils/version.js';
import { createSecurityClient, shutdownSecurityClient } from './client.js';

let logger = null;
let client = null;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger?.info('Cierre solicitado', { signal });
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref?.();
  try {
    if (client) await shutdownSecurityClient(client, { reason: signal });
  } catch (error) {
    logger?.error('Error durante el cierre', { error });
  }
  clearTimeout(force);
  process.exit(0);
}

function installProcessHandlers() {
  process.on('SIGINT', () => {
    shutdown('SIGINT').catch(() => process.exit(1));
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch(() => process.exit(1));
  });
  process.on('uncaughtException', (error) => {
    logger?.error('Excepción no controlada', { error });
    shutdown('uncaughtException').catch(() => process.exit(1));
  });
  process.on('unhandledRejection', (reason) => {
    logger?.error('Promesa rechazada sin manejar', {
      error: reason instanceof Error ? reason : { message: String(reason) },
    });
  });
}

async function main() {
  let config;
  try {
    config = await loadConfig();
  } catch (error) {
    // Mensaje seguro: nunca incluye el token ni rutas privadas.
    console.error(`[SecurityMoon] ${error.message}`);
    process.exitCode = 1;
    return;
  }

  logger = createLogger({
    level: config.logging.level,
    directory: path.join(process.cwd(), 'logs'),
    secrets: [config.token],
  });
  await logger.init();
  logger.info('Iniciando SecurityMoon', {
    version: VERSION,
    node: process.version,
    promotions: config.promotions.enabled,
  });

  try {
    client = await createSecurityClient({ config, logger });
  } catch (error) {
    logger.error('No se pudo inicializar SecurityMoon', { error });
    process.exitCode = 1;
    return;
  }

  installProcessHandlers();

  try {
    await client.login(config.token);
  } catch (error) {
    logger.error('No se pudo iniciar sesión en Discord. Comprueba el token y la conexión.', {
      error,
    });
    await shutdownSecurityClient(client, { reason: 'fallo de inicio de sesión' }).catch(() => {});
    process.exitCode = 1;
  }
}

main().catch((error) => {
  logger?.error('Error fatal al iniciar SecurityMoon', { error });
  console.error('[SecurityMoon] Error fatal. Revisa logs/security.json.');
  process.exitCode = 1;
});

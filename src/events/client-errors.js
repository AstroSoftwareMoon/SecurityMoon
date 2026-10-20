// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

export const events = [
  {
    name: 'error',
    once: false,
    execute(client, error) {
      client.logger.error('Error del cliente de Discord', { error });
    },
  },
  {
    name: 'warn',
    once: false,
    execute(client, message) {
      client.logger.warn('Advertencia del cliente de Discord', { message });
    },
  },
  {
    name: 'shardError',
    once: false,
    execute(client, error, shardId) {
      client.logger.error('Error en un shard', { shardId, error });
    },
  },
  {
    name: 'shardDisconnect',
    once: false,
    execute(client, event, shardId) {
      client.logger.warn('Shard desconectado', { shardId, code: event?.code ?? null });
    },
  },
  {
    name: 'shardReconnecting',
    once: false,
    execute(client, shardId) {
      client.logger.warn('Reconectando shard', { shardId });
    },
  },
  {
    name: 'shardReady',
    once: false,
    execute(client, shardId) {
      client.logger.info('Shard listo', { shardId });
    },
  },
  {
    name: 'invalidated',
    once: false,
    execute(client) {
      client.logger.error('La sesión de Discord fue invalidada. Reinicia el bot con un token válido.');
    },
  },
  {
    name: 'rateLimit',
    once: false,
    execute(client, info) {
      client.logger.debug('Límite de velocidad de Discord alcanzado', {
        path: info?.path ?? null,
        method: info?.method ?? null,
        timeout: info?.timeout ?? null,
        limit: info?.limit ?? null,
      });
    },
  },
];

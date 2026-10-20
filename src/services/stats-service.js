// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

/**
 * Acumula contadores en memoria y los persiste periódicamente en JSON.
 * Así los mensajes no generan una escritura de disco por cada evento.
 */
export class StatsService {
  constructor(client, { flushIntervalMs = 30_000 } = {}) {
    this.client = client;
    this.flushIntervalMs = flushIntervalMs;
    this.pending = new Map();
    this.timer = null;
    this.flushing = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.flush().catch((error) => {
        this.client.logger?.warn('No se pudieron guardar las estadísticas', {
          error: error.message,
        });
      });
    }, this.flushIntervalMs);
    this.timer.unref?.();
  }

  increment(guildId, key, amount = 1) {
    if (!guildId || !key) return;
    const current = this.pending.get(guildId) ?? {};
    current[key] = (current[key] ?? 0) + amount;
    this.pending.set(guildId, current);
  }

  async flush() {
    if (this.flushing) return this.flushing;
    this.flushing = this._flush().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  async _flush() {
    const batches = [...this.pending.entries()];
    if (batches.length === 0) return;
    this.pending.clear();
    for (const [guildId, counters] of batches) {
      try {
        await this.client.stores.stats.update(guildId, (document) => {
          for (const [key, amount] of Object.entries(counters)) {
            if (typeof document.counters[key] === 'number') {
              document.counters[key] += amount;
            }
          }
          return document;
        });
      } catch (error) {
        // Reintenta en el siguiente ciclo sin perder los contadores.
        const existing = this.pending.get(guildId) ?? {};
        for (const [key, amount] of Object.entries(counters)) {
          existing[key] = (existing[key] ?? 0) + amount;
        }
        this.pending.set(guildId, existing);
        this.client.logger?.warn('Error al persistir estadísticas; se reintentará', {
          guildId,
          error: error.message,
        });
      }
    }
  }

  async snapshot(guildId) {
    await this.flush();
    const document = await this.client.stores.stats.get(guildId);
    const pending = this.pending.get(guildId) ?? {};
    return {
      ...document,
      counters: { ...document.counters, ...pending },
    };
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.flush();
  }
}

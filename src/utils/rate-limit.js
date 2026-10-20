// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

/**
 * Control de límite de uso de comandos en memoria.
 * No sustituye a los límites de Discord; evita abusos rápidos.
 */
export class CooldownManager {
  constructor({ defaultMs = 2500, cleanupIntervalMs = 60_000 } = {}) {
    this.defaultMs = defaultMs;
    this.entries = new Map();
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
    this.cleanupTimer.unref?.();
  }

  check(key, durationMs = this.defaultMs) {
    const now = Date.now();
    const expiresAt = this.entries.get(key);
    if (expiresAt && expiresAt > now) {
      return { limited: true, remainingMs: expiresAt - now, retryAfter: expiresAt };
    }
    this.entries.set(key, now + durationMs);
    return { limited: false, remainingMs: 0, retryAfter: null };
  }

  cleanup(now = Date.now()) {
    for (const [key, expiresAt] of this.entries) {
      if (expiresAt <= now) this.entries.delete(key);
    }
  }

  clear() {
    this.entries.clear();
  }

  stop() {
    clearInterval(this.cleanupTimer);
  }
}

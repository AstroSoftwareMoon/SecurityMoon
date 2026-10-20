// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { nowIso } from '../utils/time.js';

/**
 * Servicio de advertencias persistentes por servidor.
 */
export class WarningService {
  constructor(client) {
    this.client = client;
  }

  async add(guild, { userId, moderatorId, reason }) {
    const settings = await this.client.stores.guilds.get(guild.id);
    let created = null;
    await this.client.stores.warnings.update(guild.id, (document) => {
      const id = document.nextId;
      created = {
        id,
        userId,
        moderatorId,
        reason,
        createdAt: nowIso(),
        active: true,
        removedBy: null,
        removedAt: null,
      };
      document.warnings.push(created);
      document.nextId = id + 1;
      const cutoff = Date.now() - settings.retention.warningsDays * 86_400_000;
      document.warnings = document.warnings
        .filter((entry) => Date.parse(entry.createdAt) >= cutoff)
        .slice(-settings.retention.maxWarnings);
      return document;
    });
    await this.client.stats?.increment(guild.id, 'warnings');
    return created;
  }

  async list(guildId, userId) {
    const document = await this.client.stores.warnings.get(guildId);
    return document.warnings
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => b.id - a.id);
  }

  async active(guildId, userId) {
    const warnings = await this.list(guildId, userId);
    return warnings.filter((entry) => entry.active);
  }

  async count(guildId, userId) {
    return (await this.active(guildId, userId)).length;
  }

  async remove(guildId, warningId, removedBy) {
    let removed = null;
    await this.client.stores.warnings.update(guildId, (document) => {
      const warning = document.warnings.find((entry) => entry.id === warningId && entry.active);
      if (!warning) return document;
      warning.active = false;
      warning.removedBy = removedBy;
      warning.removedAt = nowIso();
      removed = warning;
      return document;
    });
    return removed;
  }
}

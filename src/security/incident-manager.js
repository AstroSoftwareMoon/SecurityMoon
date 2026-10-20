// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { EMOJI, INCIDENT_TYPES, PROJECT, SEVERITIES } from '../constants.js';
import { baseEmbed, severityColor, truncate } from '../utils/embeds.js';
import { discordTimestamp, nowIso } from '../utils/time.js';
import { isSnowflake, isValidDomain } from '../storage/validation.js';
import { sendGuildEmbed } from '../utils/guild-log.js';
import { ValidationError } from '../utils/errors.js';

const TYPE_LABEL = Object.freeze({
  raid: 'Anti-Raid',
  nuke: 'Anti-Nuke',
  phishing: 'Anti-Phishing',
  spam: 'Anti-Spam',
  permission: 'Permisos',
  emergency: 'Emergencia',
  moderation: 'Moderación',
  report: 'Reporte',
  system: 'Sistema',
  manual: 'Manual',
});

/**
 * Crea, almacena, recorta y notifica incidentes de seguridad.
 */
export class IncidentManager {
  constructor(client) {
    this.client = client;
    this.logger = client.logger;
  }

  async record({
    guildId,
    type = 'manual',
    severity = 'medium',
    userId = null,
    actorId = null,
    description,
    action = null,
    result = null,
    channelId = null,
    messageId = null,
    urls = [],
    details = null,
    alert = true,
  }) {
    if (!INCIDENT_TYPES.includes(type)) {
      throw new ValidationError('Tipo de incidente inválido.');
    }
    if (!SEVERITIES.includes(severity)) severity = 'medium';
    if (typeof description !== 'string' || !description.trim()) {
      throw new ValidationError('El incidente necesita una descripción.');
    }

    const safeUrls = Array.isArray(urls)
      ? urls
          .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url) && url.length <= 2048)
          .slice(0, 10)
      : [];

    const createdAt = nowIso();
    const settings = await this.client.stores.guilds.get(guildId).catch(() => null);
    let incident = null;
    const document = await this.client.stores.incidents.update(guildId, (draft) => {
      const id = draft.nextId;
      incident = {
        id,
        type,
        severity,
        userId: isSnowflake(userId) ? userId : null,
        actorId: isSnowflake(actorId) ? actorId : null,
        description: truncate(description, 2000),
        action: action ? truncate(String(action), 300) : null,
        result: result ? truncate(String(result), 500) : null,
        channelId: isSnowflake(channelId) ? channelId : null,
        messageId: isSnowflake(messageId) ? messageId : null,
        urls: safeUrls,
        details: details ? truncate(String(details), 1500) : null,
        createdAt,
      };
      draft.incidents.push(incident);
      draft.nextId = id + 1;

      const days = settings?.retention?.incidentsDays ?? 90;
      const max = settings?.retention?.maxIncidents ?? 1000;
      const cutoff = Date.now() - days * 86_400_000;
      draft.incidents = draft.incidents
        .filter((entry) => Date.parse(entry.createdAt) >= cutoff)
        .slice(-max);
      return draft;
    });

    await this.client.stats?.increment(guildId, 'incidents');
    this.logger?.warn('Incidente de seguridad', {
      guildId,
      incidentId: incident.id,
      type,
      severity,
      actorId: incident.actorId,
      action: incident.action,
      result: incident.result,
    });

    if (alert) {
      await this.notify(guildId, incident).catch(() => {});
    }
    return { incident, document };
  }

  async notify(guildId, incident) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return false;
    const settings = await this.client.stores.guilds.get(guildId);
    const embed = this.buildEmbed(incident);
    return sendGuildEmbed(this.client, guild, settings.channels.alerts, embed);
  }

  buildEmbed(incident) {
    const fields = [
      { name: 'Tipo', value: TYPE_LABEL[incident.type] ?? incident.type, inline: true },
      { name: 'Gravedad', value: incident.severity, inline: true },
      { name: 'Incidente', value: `#${incident.id}`, inline: true },
      { name: 'Descripción', value: truncate(incident.description, 1024), inline: false },
    ];
    if (incident.userId) {
      fields.push({ name: 'Usuario implicado', value: `<@${incident.userId}>`, inline: true });
    }
    if (incident.actorId) {
      fields.push({ name: 'Autor', value: `<@${incident.actorId}>`, inline: true });
    }
    if (incident.action) {
      fields.push({ name: 'Acción aplicada', value: truncate(incident.action, 300), inline: true });
    }
    if (incident.result) {
      fields.push({ name: 'Resultado', value: truncate(incident.result, 500), inline: false });
    }
    if (incident.urls?.length) {
      fields.push({
        name: 'Enlaces observados',
        value: truncate(incident.urls.map((url) => `<${url}>`).join('\n'), 1024),
        inline: false,
      });
    }
    if (incident.details) {
      fields.push({ name: 'Detalles', value: truncate(incident.details, 1024), inline: false });
    }
    return baseEmbed({
      title: `${this.emojiFor(incident.type)} Incidente #${incident.id} — ${TYPE_LABEL[incident.type] ?? incident.type}`,
      description: `Detectado ${discordTimestamp(incident.createdAt, 'R')}.`,
      color: severityColor(incident.severity),
      fields,
      footer: `${PROJECT.name} • ${PROJECT.creator} • IDs y datos almacenados en JSON`,
    });
  }

  emojiFor(type) {
    switch (type) {
      case 'raid':
        return EMOJI.raid;
      case 'nuke':
        return EMOJI.nuke;
      case 'phishing':
        return EMOJI.phishing;
      case 'spam':
        return EMOJI.spam;
      case 'permission':
        return EMOJI.key;
      case 'emergency':
        return EMOJI.emergency;
      default:
        return EMOJI.shield;
    }
  }

  async list(guildId, { limit = 10, type = null } = {}) {
    const document = await this.client.stores.incidents.get(guildId);
    let incidents = document.incidents;
    if (type) incidents = incidents.filter((entry) => entry.type === type);
    return incidents.slice(-Math.max(1, Math.min(100, limit))).reverse();
  }

  async get(guildId, id) {
    const document = await this.client.stores.incidents.get(guildId);
    return document.incidents.find((entry) => entry.id === id) ?? null;
  }

  async clear(guildId) {
    const cleared = await this.client.stores.incidents.clear(guildId);
    this.logger?.info('Incidentes eliminados por un administrador', { guildId });
    return cleared;
  }

  async export(guildId) {
    return this.client.stores.incidents.get(guildId);
  }
}

/** Valida un dominio antes de guardarlo en listas. Reexportado para claridad. */
export function isValidFilterDomain(value) {
  return isValidDomain(value);
}

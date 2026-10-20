// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionFlagsBits } from 'discord.js';
import { PROJECT } from '../constants.js';
import { baseEmbed, truncate } from '../utils/embeds.js';
import { sendGuildEmbed } from '../utils/guild-log.js';
import { discordTimestamp, nowIso } from '../utils/time.js';
import { fetchLatestReleases } from '../utils/project-info.js';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Avisos opcionales de actualizaciones reales del proyecto.
 * Desactivado por defecto; requiere opt-in por servidor y un mínimo de 24 h.
 * Nunca inventa versiones, cifras ni lanzamientos.
 */
export class PromotionsService {
  constructor(client) {
    this.client = client;
    this.timer = null;
    this.running = false;
  }

  start() {
    const config = this.client.config.promotions;
    if (!config.enabled) {
      this.client.logger.debug('Avisos del proyecto desactivados en config.json');
      return;
    }
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.run().catch((error) => {
        this.client.logger.warn('No se pudieron procesar los avisos del proyecto', {
          error: error.message,
        });
      });
    }, CHECK_INTERVAL_MS);
    this.timer.unref?.();
    this.run().catch((error) => {
      this.client.logger.warn('No se pudieron procesar los avisos del proyecto', {
        error: error.message,
      });
    });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  intervalMs() {
    const hours = Math.max(24, Number(this.client.config.promotions.intervalHours) || 24);
    return hours * 60 * 60 * 1000;
  }

  pickChannel(guild, settings) {
    const preferred = settings.channels.alerts
      ? guild.channels.cache.get(settings.channels.alerts)
      : null;
    if (preferred) return preferred;
    const system = guild.systemChannelId ? guild.channels.cache.get(guild.systemChannelId) : null;
    if (system) return system;
    return (
      guild.channels.cache.find((channel) => {
        if (!channel.isTextBased?.()) return false;
        const permissions = channel.permissionsFor(guild.members.me);
        return permissions?.has([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
        ]);
      }) ?? null
    );
  }

  buildEmbed(release) {
    const fields = [
      { name: 'Versión', value: release.name || release.tag || 'Sin título', inline: true },
      { name: 'Etiqueta', value: `\`${release.tag}\``, inline: true },
      {
        name: 'Publicada',
        value: release.publishedAt ? discordTimestamp(release.publishedAt, 'D') : 'Fecha no disponible',
        inline: true,
      },
    ];
    if (release.body) {
      fields.push({ name: 'Novedades', value: truncate(release.body, 1024), inline: false });
    }
    return baseEmbed({
      title: `${PROJECT.name} — Actualización del proyecto`,
      description:
        'Aviso opcional activado por este servidor. Puedes desactivarlo desde el panel de seguridad o con `/config`.',
      color: 0x7c6cf5,
      fields,
      footer: `${PROJECT.name} • ${PROJECT.creator} • Avisos opcionales`,
    });
  }

  async run() {
    if (this.running) return;
    if (!this.client.config.promotions.enabled) return;
    this.running = true;
    try {
      const now = Date.now();
      const interval = this.intervalMs();
      const candidates = [];
      for (const guild of this.client.guilds.cache.values()) {
        try {
          const settings = await this.client.stores.guilds.get(guild.id);
          if (!settings.notifications.projectUpdates) continue;
          const last = Date.parse(settings.notifications.lastPromotionAt ?? '') || 0;
          if (now - last < interval) continue;
          candidates.push({ guild, settings });
        } catch (error) {
          this.client.logger.warn('No se pudo leer la configuración para avisos', {
            guildId: guild.id,
            error: error.message,
          });
        }
      }
      if (candidates.length === 0) return;

      const releases = await fetchLatestReleases();
      if (!releases.available || releases.releases.length === 0) {
        this.client.logger.debug('No hay lanzamientos reales disponibles para anunciar');
        return;
      }
      const release = releases.releases[0];
      const embed = this.buildEmbed(release);

      for (const { guild, settings } of candidates) {
        const channel = this.pickChannel(guild, settings);
        if (!channel) continue;
        const sent = await sendGuildEmbed(this.client, guild, channel.id, embed);
        if (!sent) continue;
        await this.client.stores.guilds.update(guild.id, (document) => {
          document.notifications.lastPromotionAt = nowIso();
          return document;
        });
        this.client.logger.info('Aviso de actualización enviado', {
          guildId: guild.id,
          channelId: channel.id,
          release: release.tag,
        });
      }
    } finally {
      this.running = false;
    }
  }
}

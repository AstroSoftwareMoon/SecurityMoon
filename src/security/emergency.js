// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { PermissionFlagsBits, GuildVerificationLevel } from 'discord.js';
import { nowIso } from '../utils/time.js';

/**
 * Modo emergencia persistente. Activa protecciones estrictas y eleva la
 * verificación del servidor; al desactivarlo intenta restaurar el nivel previo.
 */
export class EmergencyService {
  constructor(client) {
    this.client = client;
    this.logger = client.logger;
  }

  async activate(guild, { activatedBy = null, reason = null, automated = false } = {}) {
    const settings = await this.client.stores.guilds.get(guild.id);
    if (settings.emergency.active) {
      return { already: true, settings, result: 'El modo emergencia ya estaba activo.' };
    }

    const previous = guild.verificationLevel;
    let verificationResult = 'El nivel de verificación no se modificó.';
    if (guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild) && previous < GuildVerificationLevel.High) {
      try {
        await guild.setGuildVerificationLevel(
          GuildVerificationLevel.High,
          'SecurityMoon: modo emergencia',
        );
        verificationResult = `Verificación elevada de ${previous} a ${GuildVerificationLevel.High}.`;
      } catch (error) {
        verificationResult = `No se pudo elevar la verificación: ${error.message}`;
      }
    }

    const updated = await this.client.stores.guilds.update(guild.id, (document) => {
      document.emergency = {
        active: true,
        activatedAt: nowIso(),
        activatedBy,
        reason: reason ? String(reason).slice(0, 500) : automated ? 'Activación automática' : null,
        previousGuildVerificationLevel: previous,
      };
      return document;
    });

    await this.client.incidents.record({
      guildId: guild.id,
      type: 'emergency',
      severity: 'critical',
      actorId: activatedBy,
      description: automated
        ? 'Modo emergencia activado automáticamente por una detección de seguridad.'
        : 'Modo emergencia activado por un administrador.',
      action: 'Umbrales estrictos y verificación elevada',
      result: verificationResult,
      alert: true,
    });

    this.logger?.warn('Modo emergencia activado', {
      guildId: guild.id,
      activatedBy,
      automated,
    });
    return { already: false, settings: updated, result: verificationResult, previous };
  }

  async deactivate(guild, { deactivatedBy = null, reason = null } = {}) {
    const settings = await this.client.stores.guilds.get(guild.id);
    if (!settings.emergency.active) {
      return { already: false, settings, result: 'El modo emergencia no estaba activo.' };
    }

    let verificationResult = 'El nivel de verificación no se modificó.';
    const previous = settings.emergency.previousGuildVerificationLevel;
    if (
      previous !== null &&
      previous !== undefined &&
      guild.verificationLevel === GuildVerificationLevel.High &&
      guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)
    ) {
      try {
        await guild.setGuildVerificationLevel(previous, 'SecurityMoon: fin del modo emergencia');
        verificationResult = `Verificación restaurada al nivel ${previous}.`;
      } catch (error) {
        verificationResult = `No se pudo restaurar la verificación: ${error.message}`;
      }
    }

    const updated = await this.client.stores.guilds.update(guild.id, (document) => {
      document.emergency = {
        active: false,
        activatedAt: null,
        activatedBy: null,
        reason: null,
        previousGuildVerificationLevel: null,
      };
      return document;
    });

    await this.client.incidents.record({
      guildId: guild.id,
      type: 'emergency',
      severity: 'medium',
      actorId: deactivatedBy,
      description: 'Modo emergencia desactivado.',
      action: 'Restauración de protecciones normales',
      result: reason
        ? `${verificationResult} Motivo: ${String(reason).slice(0, 300)}`
        : verificationResult,
      alert: true,
    });

    this.logger?.info('Modo emergencia desactivado', { guildId: guild.id, deactivatedBy });
    return { already: true, settings: updated, result: verificationResult };
  }

  async isActive(guildId) {
    const settings = await this.client.stores.guilds.get(guildId);
    return settings.emergency.active;
  }
}

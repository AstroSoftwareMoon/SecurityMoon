// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { applySanction } from './actions.js';
import { isTrustedMember } from '../utils/permissions.js';
import { truncate } from '../utils/embeds.js';

const RAID_MEMORY_MS = 15 * 60 * 1000;
const ESCALATION = Object.freeze(['alert', 'timeout', 'kick', 'ban']);

function escalateRaidAction(baseAction, level) {
  if (level < 2 || baseAction === 'lockdown') return baseAction;
  const index = ESCALATION.indexOf(baseAction);
  if (index === -1) return baseAction;
  return ESCALATION[Math.min(ESCALATION.length - 1, index + 1)];
}

/**
 * Detector de entradas masivas con contención progresiva.
 */
export class AntiRaid {
  constructor(client) {
    this.client = client;
    this.logger = client.logger;
    this.states = new Map();
  }

  getState(guildId) {
    let state = this.states.get(guildId);
    if (!state) {
      state = {
        joins: [],
        raidUntil: 0,
        action: 'alert',
        level: 0,
        lastTrigger: 0,
        lastSubIncident: 0,
      };
      this.states.set(guildId, state);
    }
    return state;
  }

  async handleMemberJoin(member) {
    const guild = member.guild;
    const settings = await this.client.stores.guilds.get(guild.id);
    const config = settings.modules.antiRaid;
    if (!config.enabled) return false;
    if (member.user.bot && config.ignoreBots) return false;

    const trusted = await this.client.stores.trusted.get(guild.id);
    if (isTrustedMember(member, trusted)) return false;

    const state = this.getState(guild.id);
    const now = Date.now();
    const emergency = settings.emergency.active;
    const intervalSeconds = emergency
      ? Math.min(30, config.joinIntervalSeconds)
      : config.joinIntervalSeconds;
    const threshold = emergency ? Math.min(3, config.joinThreshold) : config.joinThreshold;

    state.joins = state.joins.filter((timestamp) => now - timestamp <= intervalSeconds * 1000);
    state.joins.push(now);

    const accountAgeDays = (now - member.user.createdTimestamp) / 86_400_000;
    const youngAccount = config.minAccountAgeDays > 0 && accountAgeDays < config.minAccountAgeDays;
    const reason = `SecurityMoon Anti-Raid: ${state.joins.length} entradas en ${intervalSeconds}s`;

    if (now < state.raidUntil) {
      if (state.action === 'alert' || state.action === 'lockdown') return true;
      const result = await applySanction({
        guild,
        member,
        userId: member.id,
        action: state.action === 'ban' ? 'ban' : state.action,
        reason,
      });
      if (now - state.lastSubIncident > 60_000) {
        state.lastSubIncident = now;
        await this.client.incidents.record({
          guildId: guild.id,
          type: 'raid',
          severity: 'high',
          userId: member.id,
          actorId: member.id,
          description: `Entrada durante un raid activo (${state.joins.length} entradas en ${intervalSeconds}s).`,
          action: state.action,
          result: result.result,
          alert: false,
        });
      }
      return true;
    }

    if (state.joins.length < threshold) return false;

    state.level = now - state.lastTrigger <= RAID_MEMORY_MS ? state.level + 1 : 1;
    state.lastTrigger = now;
    state.raidUntil = now + config.raidCooldownSeconds * 1000;
    state.action = escalateRaidAction(config.action, state.level);

    let action = state.action;
    if (action === 'alert' && youngAccount) {
      action = 'timeout';
    }

    const result = await applySanction({
      guild,
      member,
      userId: member.id,
      action,
      reason,
      timeoutMs: 600_000,
    });

    if (config.autoEmergency && state.level >= 2 && !settings.emergency.active) {
      await this.client.security.emergency
        .activate(guild, {
          automated: true,
          reason: `Raid recurrente: ${state.joins.length} entradas en ${intervalSeconds}s`,
        })
        .catch(() => {});
    }

    await this.client.stats?.increment(guild.id, 'raidsDetected');
    await this.client.incidents.record({
      guildId: guild.id,
      type: 'raid',
      severity: state.level >= 2 ? 'critical' : 'high',
      userId: member.id,
      actorId: member.id,
      description: truncate(
        `Se detectaron ${state.joins.length} entradas en ${intervalSeconds}s (umbral ${threshold}). Nivel de raid ${state.level}.${youngAccount ? ' La cuenta más reciente es nueva.' : ''}`,
        2000,
      ),
      action,
      result: result.result,
      alert: true,
    });

    this.logger?.warn('Raid detectado', {
      guildId: guild.id,
      joins: state.joins.length,
      intervalSeconds,
      level: state.level,
      action,
    });
    return true;
  }
}

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { applySanction, deleteRecentMessages } from './actions.js';
import { extractLinks } from './anti-phishing.js';
import { isExcludedChannel, isTrustedMember } from '../utils/permissions.js';
import { truncate } from '../utils/embeds.js';

const ESCALATION = Object.freeze(['warn', 'timeout', 'kick', 'ban']);
const VIOLATION_WINDOW_MS = 10 * 60 * 1000;

function normalizeContent(content) {
  return String(content ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

function countEmoji(content) {
  const unicode = (String(content).match(/\p{Extended_Pictographic}/gu) ?? []).length;
  const custom = (String(content).match(/<a?:\w{2,32}:\d{16,20}>/g) ?? []).length;
  return unicode + custom;
}

function capsRatio(content) {
  const letters = String(content).match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return 0;
  const upper = letters.filter((letter) => letter === letter.toUpperCase() && letter !== letter.toLowerCase()).length;
  return upper / letters.length;
}

export function createMessageEntry(message) {
  const content = message.content ?? '';
  return {
    id: message.id,
    content,
    normalized: normalizeContent(content),
    timestamp: message.createdTimestamp,
    mentions: (message.mentions?.users?.size ?? 0) + (message.mentions?.roles?.size ?? 0),
    links: extractLinks(content).length,
    emojis: countEmoji(content),
    capsRatio: capsRatio(content),
    length: content.length,
  };
}

/**
 * Evalúa el historial reciente de un usuario y devuelve los motivos.
 * Función pura para poder probarla sin Discord.
 */
export function evaluateSpam(entries, config, now = Date.now()) {
  const reasons = [];
  const add = (code, label) => {
    if (!reasons.some((reason) => reason.code === code)) reasons.push({ code, label });
  };
  const window = (seconds) => entries.filter((entry) => now - entry.timestamp <= seconds * 1000);

  const recent = window(config.messageWindowSeconds);
  if (recent.length >= config.messageThreshold) {
    add('rate', `${recent.length} mensajes en ${config.messageWindowSeconds}s`);
  }

  const duplicates = window(config.duplicateWindowSeconds).filter((entry) => entry.normalized);
  const groups = new Map();
  for (const entry of duplicates) {
    const group = groups.get(entry.normalized) ?? [];
    group.push(entry);
    groups.set(entry.normalized, group);
  }
  const largestGroup = Math.max(0, ...[...groups.values()].map((group) => group.length));
  if (largestGroup >= config.duplicateThreshold) {
    add('duplicate', `${largestGroup} mensajes repetidos`);
  }

  const maxMentions = Math.max(0, ...window(config.messageWindowSeconds).map((entry) => entry.mentions));
  if (maxMentions >= config.mentionThreshold) {
    add('mentions', `${maxMentions} menciones en un mensaje`);
  }

  const maxLinks = Math.max(0, ...window(config.messageWindowSeconds).map((entry) => entry.links));
  if (maxLinks >= config.linkThreshold) {
    add('links', `${maxLinks} enlaces en un mensaje`);
  }

  const maxEmoji = Math.max(0, ...window(config.messageWindowSeconds).map((entry) => entry.emojis));
  if (maxEmoji >= config.emojiThreshold) {
    add('emoji', `${maxEmoji} emojis en un mensaje`);
  }

  const hasCaps = window(config.messageWindowSeconds).some(
    (entry) => entry.length >= config.capsMinLength && entry.capsRatio >= config.capsRatio,
  );
  if (hasCaps) add('caps', 'Uso excesivo de mayúsculas');

  return {
    violating: reasons.length > 0,
    reasons,
    metrics: {
      messages: recent.length,
      duplicates: largestGroup,
      mentions: maxMentions,
      links: maxLinks,
      emojis: maxEmoji,
      caps: hasCaps,
    },
  };
}

export function escalateAction(baseAction, violationCount, enabled = true) {
  if (!enabled) return baseAction;
  const baseIndex = Math.max(0, ESCALATION.indexOf(baseAction));
  const index = Math.min(ESCALATION.length - 1, baseIndex + Math.max(0, violationCount - 1));
  return ESCALATION[index];
}

/**
 * Módulo Anti-Spam con historial en memoria por usuario.
 */
export class AntiSpam {
  constructor(client) {
    this.client = client;
    this.logger = client.logger;
    this.history = new Map();
    this.violations = new Map();
    this.cooldowns = new Map();
    this.alertCooldown = new Map();
  }

  key(guildId, userId) {
    return `${guildId}:${userId}`;
  }

  pruneHistory(entries, config, now) {
    const maxAge = Math.max(config.messageWindowSeconds, config.duplicateWindowSeconds) * 1000 * 2;
    return entries.filter((entry) => now - entry.timestamp <= maxAge).slice(-50);
  }

  async handleMessage(message) {
    if (!message.inGuild() || message.author?.bot || message.webhookId) return false;
    if (!message.content?.trim()) return false;

    const settings = await this.client.stores.guilds.get(message.guild.id);
    const config = settings.modules.antiSpam;
    if (!config.enabled) return false;
    if (isExcludedChannel(message.channelId, settings)) return false;
    const trusted = await this.client.stores.trusted.get(message.guild.id);
    if (isTrustedMember(message.member, trusted)) return false;

    const now = Date.now();
    const key = this.key(message.guild.id, message.author.id);
    if ((this.cooldowns.get(key) ?? 0) > now) return false;

    const entries = this.pruneHistory(this.history.get(key) ?? [], config, now);
    entries.push(createMessageEntry(message));
    this.history.set(key, entries);
    if (this.history.size > 5000) this.sweep(now, settings);

    const evaluation = evaluateSpam(entries, config, now);
    if (!evaluation.violating) return false;

    const violations = (this.violations.get(key) ?? []).filter(
      (timestamp) => now - timestamp <= VIOLATION_WINDOW_MS,
    );
    violations.push(now);
    this.violations.set(key, violations);

    const action = escalateAction(config.action, violations.length, config.escalate);
    const reasonsText = evaluation.reasons.map((reason) => reason.label).join(' · ');
    const member =
      message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));

    let deletionResult = 'No se eliminaron mensajes.';
    if (config.deleteMessages) {
      const deletion = await deleteRecentMessages(message.channel, message.author.id, {
        limit: 25,
        maxAgeMs: 60_000,
      });
      deletionResult = deletion.result;
    }

    let sanctionResult = 'Sin sanción.';
    if (action === 'warn') {
      const warning = await this.client.warnings.add(message.guild, {
        userId: message.author.id,
        moderatorId: this.client.user.id,
        reason: truncate(`Spam detectado: ${reasonsText}`, 1000),
      });
      sanctionResult = `Advertencia #${warning.id} registrada.`;
    } else {
      sanctionResult = await applySanction({
        guild: message.guild,
        member,
        userId: message.author.id,
        action,
        reason: `SecurityMoon Anti-Spam: ${truncate(reasonsText, 400)}`,
        timeoutMs: config.timeoutSeconds * 1000,
      }).then((result) => result.result);
    }

    if (settings.moderation.dmOnSanction) {
      await message.author
        .send({
          content: `⚠️ SecurityMoon detectó spam en **${message.guild.name}**.\nMotivos: ${reasonsText}\nAcción: ${action}.`,
        })
        .catch(() => {});
    }

    this.cooldowns.set(key, now + 15_000);
    const shouldAlert = now - (this.alertCooldown.get(key) ?? 0) > 30_000;
    if (shouldAlert) this.alertCooldown.set(key, now);

    await this.client.incidents.record({
      guildId: message.guild.id,
      type: 'spam',
      severity: ['kick', 'ban'].includes(action) ? 'high' : 'medium',
      userId: message.author.id,
      actorId: message.author.id,
      description: `Spam detectado: ${reasonsText}`,
      action: `${action}; ${deletionResult}`,
      result: sanctionResult,
      channelId: message.channelId,
      messageId: message.id,
      alert: shouldAlert,
    });

    await this.client.stats?.increment(message.guild.id, 'spamBlocked');
    await this.client.stats?.increment(message.guild.id, 'sanctionsApplied');
    this.logger?.info('Sanción por spam aplicada', {
      guildId: message.guild.id,
      userId: message.author.id,
      action,
      violations: violations.length,
    });
    return true;
  }

  sweep(now, settings) {
    const maxAge = Math.max(
      600,
      settings.modules.antiSpam.messageWindowSeconds,
      settings.modules.antiSpam.duplicateWindowSeconds,
    ) * 2000;
    for (const [key, entries] of this.history) {
      if (entries.length === 0 || now - entries.at(-1).timestamp > maxAge) {
        this.history.delete(key);
      }
    }
    for (const [key, timestamps] of this.violations) {
      if (timestamps.every((timestamp) => now - timestamp > VIOLATION_WINDOW_MS)) {
        this.violations.delete(key);
      }
    }
    for (const [key, timestamp] of this.cooldowns) {
      if (timestamp <= now) this.cooldowns.delete(key);
    }
  }
}

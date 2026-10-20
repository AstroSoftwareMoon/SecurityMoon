// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { applyTimeout } from './actions.js';
import { isExcludedChannel, isTrustedMember } from '../utils/permissions.js';
import { truncate } from '../utils/embeds.js';

export const BUILTIN_WHITELIST = Object.freeze([
  'discord.com',
  'discord.gg',
  'discordapp.com',
  'discordstatus.com',
  'github.com',
  'githubusercontent.com',
  'youtube.com',
  'twitch.tv',
  'twitter.com',
  'x.com',
  'wikipedia.org',
]);

export const SHORTENERS = Object.freeze([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'is.gd',
  'cutt.ly',
  'shorturl.at',
  'rebrand.ly',
  'ow.ly',
  'buff.ly',
  'rb.gy',
  'tiny.cc',
  'lnkd.in',
  's.id',
  'v.gd',
  'qr.ae',
]);

export const SUSPICIOUS_TLDS = Object.freeze([
  'zip',
  'mov',
  'top',
  'xyz',
  'click',
  'link',
  'live',
  'rest',
  'cam',
  'tk',
  'ml',
  'ga',
  'cf',
  'gq',
  'work',
  'support',
  'fit',
  'icu',
  'buzz',
  'monster',
  'quest',
  'cyou',
]);

export const PHISHING_WORDS = Object.freeze([
  'login',
  'signin',
  'verify',
  'verification',
  'nitro',
  'gift',
  'free',
  'steam',
  'wallet',
  'airdrop',
  'claim',
  'bonus',
  'account',
  'update',
  'password',
  'token',
  'security',
  'recovery',
  'unlock',
  'soporte',
  'regalo',
  'gratis',
]);

export const IMPERSONATED_BRANDS = Object.freeze([
  'discord',
  'steam',
  'steamcommunity',
  'paypal',
  'netflix',
  'spotify',
  'roblox',
  'minecraft',
  'telegram',
  'whatsapp',
  'instagram',
  'facebook',
  'tiktok',
]);

const RISKY_EXTENSIONS = /\.(?:exe|scr|bat|cmd|js|vbs|apk|msi|zip|rar|7z)(?:$|[?#])/i;
const INVITE_HOSTS = new Set(['discord.gg', 'discord.me', 'discord.com', 'discordapp.com']);

function trimToken(token) {
  return token
    .replace(/^[<("'`[]+/, '')
    .replace(/[>"'`\])}.,!?;:]+$/, '');
}

function looksLikeLink(token) {
  if (!token || token.length < 4 || token.length > 2048) return false;
  if (/^https?:\/\//i.test(token) || /^www\./i.test(token)) return true;
  if (!/\.[a-z]{2,24}(?:[/:?#]|$)/i.test(token)) return false;
  if (token.includes('@') && !token.includes('://')) return false;
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,24}(?::\d{1,5})?(?:[/?#].*)?$/i.test(token);
}

export function domainMatches(host, domain) {
  const normalizedHost = String(host ?? '').toLowerCase().replace(/\.$/, '');
  const normalizedDomain = String(domain ?? '').toLowerCase().replace(/^\./, '').replace(/\.$/, '');
  if (!normalizedHost || !normalizedDomain) return false;
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
}

function matchList(host, entries) {
  return entries.find((entry) => {
    const value = typeof entry === 'string' ? entry : entry?.value;
    return domainMatches(host, value);
  }) ?? null;
}

function isInviteLink(host, pathname) {
  if (host === 'discord.gg' || host === 'discord.me') return true;
  return INVITE_HOSTS.has(host) && /^\/invite\//i.test(pathname);
}

/**
 * Extrae enlaces y dominios de un mensaje sin ejecutar peticiones de red.
 */
export function extractLinks(content) {
  if (typeof content !== 'string' || !content) return [];
  const tokens = content.split(/\s+/).map(trimToken).filter(looksLikeLink);
  const seen = new Set();
  const links = [];
  for (const token of tokens) {
    const candidate = /^https?:\/\//i.test(token) ? token : `https://${token}`;
    let url;
    try {
      url = new URL(candidate);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(url.protocol)) continue;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!host.includes('.') || host.length > 253) continue;
    const key = `${host}${url.pathname}${url.search}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      raw: token,
      url: url.href,
      host,
      protocol: url.protocol,
      pathname: url.pathname,
      isInvite: isInviteLink(host, url.pathname),
      hasCredentials: Boolean(url.username || url.password),
    });
  }
  return links;
}

function isIpHost(host) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) ||
    (host.startsWith('[') && host.endsWith(']'));
}

function addReason(reasons, reason) {
  if (!reasons.includes(reason)) reasons.push(reason);
}

/**
 * Analiza un enlace con heurísticas. No realiza peticiones ni afirma
 * que un enlace sea malicioso: solo calcula indicadores sospechosos.
 */
export function analyzeLink(link, { filters, config } = {}) {
  const reasons = [];
  let score = 0;
  const whitelist = [...BUILTIN_WHITELIST, ...(filters?.whitelist?.domains ?? [])];
  const blacklist = filters?.blacklist?.domains ?? [];

  const blacklisted = matchList(link.host, blacklist);
  if (blacklisted) {
    return {
      ...link,
      score: 100,
      reasons: [`El dominio coincide con la lista negra configurada (${blacklisted.value}).`],
      blacklisted: true,
      whitelisted: false,
    };
  }

  if (link.isInvite) {
    if (config?.blockInvites) {
      score += 4;
      addReason(reasons, 'Invitación de Discord bloqueada por la configuración del servidor.');
    }
  } else if (matchList(link.host, whitelist)) {
    return { ...link, score: 0, reasons: [], blacklisted: false, whitelisted: true };
  }

  if (isIpHost(link.host)) {
    score += 3;
    addReason(reasons, 'El enlace usa una dirección IP en lugar de un dominio.');
  }
  if (link.host.includes('xn--')) {
    score += 3;
    addReason(reasons, 'El dominio usa codificación punycode, posible suplantación.');
  }
  if (link.hasCredentials || link.raw.includes('@')) {
    score += 3;
    addReason(reasons, 'El enlace incluye credenciales o un símbolo @ en la URL.');
  }
  if (!link.isInvite && link.protocol === 'http:') {
    score += 1;
    addReason(reasons, 'El enlace no usa HTTPS.');
  }

  const tld = link.host.split('.').at(-1);
  if (SUSPICIOUS_TLDS.includes(tld)) {
    score += 1;
    addReason(reasons, `El dominio usa la extensión .${tld}, frecuente en campañas de abuso.`);
  }
  if (SHORTENERS.includes(link.host)) {
    score += 2;
    addReason(reasons, 'El enlace usa un acortador que oculta el destino real.');
  }

  const hostnameWithoutTld = link.host.split('.').slice(0, -1).join('.');
  const haystack = `${hostnameWithoutTld}${link.pathname}`.toLowerCase();
  if (PHISHING_WORDS.some((word) => haystack.includes(word))) {
    score += 2;
    addReason(reasons, 'El enlace contiene palabras asociadas a páginas de inicio de sesión o regalos.');
  }
  if (
    IMPERSONATED_BRANDS.some((brand) => hostnameWithoutTld.includes(brand)) &&
    !matchList(link.host, whitelist)
  ) {
    score += 2;
    addReason(reasons, 'El dominio parece imitar el nombre de una marca o servicio conocido.');
  }
  if (RISKY_EXTENSIONS.test(link.url)) {
    score += 2;
    addReason(reasons, 'El enlace apunta a un archivo ejecutable o comprimido.');
  }
  if ((link.host.match(/-/g) ?? []).length >= 3) {
    score += 1;
    addReason(reasons, 'El dominio contiene una cantidad inusual de guiones.');
  }
  if (link.host.split('.').length > 4) {
    score += 1;
    addReason(reasons, 'El dominio tiene un número inusual de subdominios.');
  }
  if (link.url.length > 200) {
    score += 1;
    addReason(reasons, 'La URL es inusualmente larga.');
  }
  // Rango intencional para detectar caracteres no ASCII.
  // eslint-disable-next-line no-control-regex
  if (/[^\u0000-\u007F]/.test(link.host)) {
    score += 2;
    addReason(reasons, 'El dominio contiene caracteres no ASCII que pueden confundir.');
  }

  return {
    ...link,
    score: Math.min(score, 99),
    reasons,
    blacklisted: false,
    whitelisted: false,
  };
}

/**
 * Analiza el contenido de un mensaje.
 * @returns {{suspicious:boolean,blacklisted:boolean,score:number,reasons:string[],links:object[],invites:object[]}}
 */
export function analyzeContent(content, { filters, config } = {}) {
  const links = extractLinks(content).map((link) => analyzeLink(link, { filters, config }));
  const scored = links.filter((link) => !link.whitelisted);
  const blacklisted = scored.some((link) => link.blacklisted);
  const invites = links.filter((link) => link.isInvite);
  const score = scored.reduce((maximum, link) => Math.max(maximum, link.score), 0);
  const reasons = [];
  for (const link of scored) {
    for (const reason of link.reasons) addReason(reasons, reason);
  }
  const threshold = config?.suspiciousScoreThreshold ?? 3;
  const suspicious = blacklisted || score >= threshold;
  return {
    suspicious,
    blacklisted,
    score,
    reasons,
    links,
    invites,
    threshold,
  };
}

/**
 * Módulo Anti-Phishing conectado a mensajes de Discord.
 */
export class AntiPhishing {
  constructor(client) {
    this.client = client;
    this.logger = client.logger;
    this.alertCooldowns = new Map();
  }

  async handleMessage(message) {
    if (!message.inGuild() || message.author?.bot || !message.content) return false;
    const settings = await this.client.stores.guilds.get(message.guild.id);
    const config = settings.modules.antiPhishing;
    if (!config.enabled) return false;
    if (isExcludedChannel(message.channelId, settings)) return false;
    const trusted = await this.client.stores.trusted.get(message.guild.id);
    if (isTrustedMember(message.member, trusted)) return false;

    const filters = await this.client.stores.filters.get(message.guild.id);
    const analysis = analyzeContent(message.content, { filters, config });
    if (!analysis.suspicious) return false;

    let actionType = config.action;
    if (analysis.blacklisted) {
      actionType = config.action === 'alert' ? 'delete' : config.action;
    }

    const reasons = truncate(analysis.reasons.join(' '), 800);
    const label = analysis.blacklisted
      ? 'Enlace en lista negra'
      : `Enlace sospechoso (puntuación ${analysis.score}/${analysis.threshold})`;

    let deletionResult = 'No se intentó eliminar el mensaje.';
    if (actionType.startsWith('delete')) {
      try {
        await message.delete();
        deletionResult = 'Mensaje eliminado.';
      } catch (error) {
        deletionResult = `No se pudo eliminar el mensaje: ${error.message}`;
      }
    }

    let sanctionResult = 'Sin sanción adicional.';
    const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (actionType === 'delete_with_warning' || actionType === 'delete_with_timeout') {
      const warning = await this.client.warnings.add(message.guild, {
        userId: message.author.id,
        moderatorId: this.client.user.id,
        reason: truncate(`${label}: ${reasons}`, 1000),
      });
      sanctionResult = `Advertencia #${warning.id} registrada.`;
      if (settings.moderation.dmOnSanction) {
        await message.author
          .send({
            content: `⚠️ Tu mensaje en **${message.guild.name}** fue retirado por un enlace sospechoso.\nMotivo: ${truncate(reasons, 800)}\nAdvertencia: #${warning.id}`,
          })
          .catch(() => {});
      }
    }
    if (actionType === 'delete_with_timeout' && member) {
      const timeout = await applyTimeout(
        message.guild,
        member,
        (config.timeoutSeconds ?? settings.modules.antiSpam.timeoutSeconds ?? 600) * 1000,
        `SecurityMoon: ${label}`,
      );
      sanctionResult = `${sanctionResult} ${timeout.result}`;
    }

    const cooldownKey = `${message.guild.id}:${message.author.id}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey) ?? 0;
    const shouldAlert = Date.now() - lastAlert > 30_000;
    if (shouldAlert) this.alertCooldowns.set(cooldownKey, Date.now());

    await this.client.incidents.record({
      guildId: message.guild.id,
      type: 'phishing',
      severity: analysis.blacklisted ? 'high' : 'medium',
      userId: message.author.id,
      actorId: message.author.id,
      description: `${label}. ${reasons}`,
      action: `${actionType}; ${deletionResult}`,
      result: sanctionResult,
      channelId: message.channelId,
      messageId: message.id,
      urls: analysis.links.map((link) => link.url),
      alert: shouldAlert,
    });

    await this.client.stats?.increment(message.guild.id, 'linksScanned', analysis.links.length);
    await this.client.stats?.increment(message.guild.id, 'phishingBlocked');
    this.logger?.info('Mensaje con enlace sospechoso procesado', {
      guildId: message.guild.id,
      userId: message.author.id,
      score: analysis.score,
      action: actionType,
      alert: shouldAlert,
    });
    return true;
  }
}

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { UserError } from './errors.js';
import { sanitizeReason } from './validators.js';
import { nowIso } from './time.js';
import { baseEmbed, truncate } from './embeds.js';
import { BUILTIN_WHITELIST } from '../security/anti-phishing.js';

const LISTS = Object.freeze({
  blacklist: { opposite: 'whitelist', label: 'lista negra', color: 0xed4245, emoji: '⛔' },
  whitelist: { opposite: 'blacklist', label: 'lista blanca', color: 0x57f287, emoji: '✅' },
});

export async function addDomain(client, guildId, kind, { domain, userId, reason }) {
  const meta = LISTS[kind];
  if (!meta) throw new UserError('Lista de dominios no válida.');
  const filters = await client.stores.filters.get(guildId);
  if (filters[kind].domains.some((entry) => entry.value === domain)) {
    throw new UserError(`El dominio **${domain}** ya está en la ${meta.label}.`);
  }
  const conflict = filters[meta.opposite].domains.some((entry) => entry.value === domain);
  let created = null;

  await client.stores.filters.update(guildId, (document) => {
    created = {
      value: domain,
      addedBy: userId,
      addedAt: nowIso(),
      reason: sanitizeReason(reason, { maxLength: 300, fallback: null }),
    };
    document[kind].domains.push(created);
    if (kind === 'blacklist') {
      document.whitelist.domains = document.whitelist.domains.filter((entry) => entry.value !== domain);
    }
    return document;
  });

  return { entry: created, conflict, label: meta.label };
}

export async function removeDomain(client, guildId, kind, domain) {
  const meta = LISTS[kind];
  if (!meta) throw new UserError('Lista de dominios no válida.');
  let removed = null;
  await client.stores.filters.update(guildId, (document) => {
    const before = document[kind].domains.length;
    document[kind].domains = document[kind].domains.filter((entry) => entry.value !== domain);
    if (document[kind].domains.length === before) return document;
    removed = { value: domain };
    return document;
  });
  if (!removed) throw new UserError(`El dominio **${domain}** no está en la ${meta.label}.`);
  return removed;
}

export async function listDomains(client, guildId, kind) {
  const filters = await client.stores.filters.get(guildId);
  return [...filters[kind].domains].reverse();
}

export function domainListEmbed(kind, entries) {
  const meta = LISTS[kind];
  const shown = entries.slice(0, 25);
  const description =
    shown.length === 0
      ? `No hay dominios en la ${meta.label}.`
      : shown
          .map((entry) => {
            const reason = entry.reason ? ` — ${truncate(entry.reason, 120)}` : '';
            return `• **${entry.value}**${reason}\n  <@${entry.addedBy}> · <t:${Math.floor(Date.parse(entry.addedAt) / 1000)}:d>`;
          })
          .join('\n');
  const fields = [
    { name: 'Total', value: `${entries.length} dominio(s)`, inline: true },
    {
      name: 'Prioridad',
      value:
        kind === 'blacklist'
          ? 'La lista negra tiene prioridad sobre la blanca.'
          : 'Los dominios integrados y la lista blanca evitan falsos positivos.',
      inline: true,
    },
  ];
  if (kind === 'whitelist') {
    fields.push({
      name: 'Dominios integrados',
      value: truncate(BUILTIN_WHITELIST.join(', '), 1024),
      inline: false,
    });
  }
  return baseEmbed({
    title: `${meta.emoji} ${meta.label[0].toUpperCase()}${meta.label.slice(1)}`,
    description: truncate(description, 4096),
    color: meta.color,
    fields,
  });
}

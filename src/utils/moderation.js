// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { COLORS, EMOJI, PROJECT } from '../constants.js';
import { baseEmbed, truncate } from './embeds.js';
import { discordTimestamp, formatDuration, nowIso } from './time.js';
import { sendGuildEmbed } from './guild-log.js';

/**
 * Registra un caso de moderación y lo envía al canal de moderación.
 */
export async function createModerationCase(client, guild, {
  type,
  targetId = null,
  moderatorId,
  reason,
  durationSeconds = null,
  result = null,
  active = true,
}) {
  const createdAt = nowIso();
  const expiresAt =
    durationSeconds && durationSeconds > 0
      ? new Date(Date.now() + durationSeconds * 1000).toISOString()
      : null;
  const settings = await client.stores.guilds.get(guild.id).catch(() => null);
  let caseData = null;

  await client.stores.moderation.update(guild.id, (draft) => {
    const id = draft.nextId;
    caseData = {
      id,
      type,
      targetId,
      moderatorId,
      reason,
      createdAt,
      durationSeconds,
      expiresAt,
      active,
      result,
    };
    draft.cases.push(caseData);
    draft.nextId = id + 1;
    const maxCases = settings?.retention?.maxCases ?? 2000;
    const days = settings?.retention?.casesDays ?? 365;
    const cutoff = Date.now() - days * 86_400_000;
    draft.cases = draft.cases
      .filter((item) => Date.parse(item.createdAt) >= cutoff)
      .slice(-maxCases);
    return draft;
  });

  await client.stats?.increment(guild.id, 'moderationActions');

  if (settings?.moderation?.logActions && settings?.channels?.modlog && caseData) {
    const fields = [
      { name: 'Caso', value: `#${caseData.id}`, inline: true },
      { name: 'Tipo', value: type, inline: true },
      { name: 'Moderador', value: `<@${moderatorId}>`, inline: true },
      { name: 'Objetivo', value: targetId ? `<@${targetId}>` : 'No aplica', inline: true },
      { name: 'Motivo', value: truncate(reason, 1024), inline: false },
    ];
    if (durationSeconds) {
      fields.push({ name: 'Duración', value: formatDuration(durationSeconds * 1000), inline: true });
    }
    if (result) fields.push({ name: 'Resultado', value: truncate(result, 500), inline: false });
    const embed = baseEmbed({
      title: `${EMOJI.logs} Caso de moderación #${caseData.id}`,
      color: COLORS.info,
      fields,
      footer: `${PROJECT.name} • ${PROJECT.creator}`,
    });
    await sendGuildEmbed(client, guild, settings.channels.modlog, embed).catch(() => {});
  }

  return caseData;
}

export function moderationCaseEmbed(caseData) {
  return baseEmbed({
    title: `${EMOJI.logs} Caso #${caseData.id} — ${caseData.type}`,
    color: caseData.active ? COLORS.info : COLORS.muted,
    fields: [
      { name: 'Objetivo', value: caseData.targetId ? `<@${caseData.targetId}>` : 'No aplica', inline: true },
      { name: 'Moderador', value: `<@${caseData.moderatorId}>`, inline: true },
      { name: 'Fecha', value: discordTimestamp(caseData.createdAt), inline: true },
      { name: 'Motivo', value: truncate(caseData.reason, 1024), inline: false },
      ...(caseData.durationSeconds
        ? [
            {
              name: 'Duración',
              value: `${formatDuration(caseData.durationSeconds * 1000)} (hasta ${discordTimestamp(caseData.expiresAt)})`,
              inline: false,
            },
          ]
        : []),
      ...(caseData.result ? [{ name: 'Resultado', value: truncate(caseData.result, 500), inline: false }] : []),
    ],
  });
}

/** Envía un mensaje directo sin romper la acción si el usuario los bloquea. */
export async function tryDirectMessage(client, userId, payload) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(payload);
    return true;
  } catch {
    return false;
  }
}

export async function getActiveWarnings(client, guildId, userId) {
  const document = await client.stores.warnings.get(guildId);
  return document.warnings.filter((entry) => entry.userId === userId && entry.active);
}

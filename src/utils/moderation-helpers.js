// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags } from 'discord.js';
import { EMOJI } from '../constants.js';
import { baseEmbed, successEmbed } from './embeds.js';
import { formatDate, discordTimestamp } from './time.js';
import { UserError } from './errors.js';
import { canModerate } from './permissions.js';
import { sanitizeReason } from './validators.js';

export async function resolveModerationTarget(interaction, { requireMember = false } = {}) {
  const user = interaction.options.getUser('user', true);
  const { targetMember } = canModerate({
    guild: interaction.guild,
    executor: interaction.member,
    targetUser: user,
  });
  if (requireMember && !targetMember) {
    throw new UserError('El usuario indicado no está en el servidor.');
  }
  return { user, targetMember };
}

export async function replyModeration(interaction, { title, description, caseData, extraFields = [] }) {
  const fields = [
    ...(caseData
      ? [
          { name: `${EMOJI.folder} Caso`, value: `#${caseData.id}`, inline: true },
          { name: `${EMOJI.gear} Tipo`, value: caseData.type, inline: true },
        ]
      : []),
    ...extraFields,
  ];
  const payload = {
    embeds: [successEmbed(title, description).addFields(fields.slice(0, 25))],
  };
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

export async function bulkDeleteMessages(channel, messages) {
  if (messages.length === 0) return 0;
  if (messages.length === 1) {
    await messages[0].delete().catch(() => {});
    return 1;
  }
  try {
    const deleted = await channel.bulkDelete(messages, true);
    return deleted.size;
  } catch {
    let deleted = 0;
    for (const message of messages) {
      try {
        await message.delete();
        deleted += 1;
      } catch {
        // Continúa con el resto.
      }
    }
    return deleted;
  }
}

export function moderationReason(interaction, reason) {
  return `SecurityMoon | ${interaction.user.tag} (${interaction.user.id}): ${sanitizeReason(reason)}`;
}

const CASE_EMOJI = Object.freeze({
  ban: '🔨',
  hackban: '🏹',
  unban: '🕊️',
  kick: '👢',
  timeout: '⏳',
  untimeout: '⏱️',
  warn: '⚠️',
  clear: '🧹',
  slowmode: '🐢',
  lock: '🔒',
  unlock: '🔓',
  purge: '🗑️',
});

export function warningEmbedFor(warning) {
  return baseEmbed({
    title: `⚠️ Advertencia #${warning.id}`,
    color: 0xfee75c,
    fields: [
      { name: '👤 Usuario', value: `<@${warning.userId}>`, inline: true },
      { name: '🛡️ Moderador', value: `<@${warning.moderatorId}>`, inline: true },
      { name: '📅 Fecha', value: formatDate(warning.createdAt), inline: true },
      { name: '📝 Motivo', value: warning.reason, inline: false },
      { name: '📡 Estado', value: warning.active ? '✅ Activa' : '⛔ Retirada', inline: true },
    ],
  });
}

export function caseLine(caseData) {
  const target = caseData.targetId ? `<@${caseData.targetId}>` : '—';
  const emoji = CASE_EMOJI[caseData.type] ?? '📋';
  return `${emoji} **#${caseData.id} · ${caseData.type}** — ${target}\n${discordTimestamp(caseData.createdAt, 'R')} · <@${caseData.moderatorId}>\n${caseData.reason.slice(0, 180)}`;
}

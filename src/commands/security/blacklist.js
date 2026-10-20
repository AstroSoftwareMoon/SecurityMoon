// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { addDomain, domainListEmbed, listDomains, removeDomain } from '../../utils/domain-lists.js';
import { parseDomain } from '../../utils/validators.js';
import { baseEmbed, warningEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Gestiona los dominios bloqueados.')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Añade un dominio a la lista negra.')
        .addStringOption((option) =>
          option.setName('domain').setDescription('Dominio, por ejemplo ejemplo.com.').setRequired(true).setMaxLength(253),
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('Motivo o evidencia.').setMaxLength(300),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Quita un dominio de la lista negra.')
        .addStringOption((option) =>
          option.setName('domain').setDescription('Dominio a quitar.').setRequired(true).setMaxLength(253),
        ),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('Muestra la lista negra.')),
  confirmation: { subcommands: ['add', 'remove'] },
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2500,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand(true);
    if (sub === 'add') {
      const domain = parseDomain(interaction.options.getString('domain', true));
      const result = await addDomain(interaction.client, interaction.guild.id, 'blacklist', {
        domain,
        userId: interaction.user.id,
        reason: interaction.options.getString('reason'),
      });
      return interaction.reply({
        embeds: [
          baseEmbed({
            title: '⛔ Dominio añadido a la lista negra',
            description: `**${domain}** será tratado como sospechoso en los mensajes nuevos.`,
            color: 0xed4245,
            fields: [
              ...(result.entry.reason
                ? [{ name: 'Motivo', value: result.entry.reason, inline: false }]
                : []),
              ...(result.conflict
                ? [{ name: 'Nota', value: 'Se retiró de la lista blanca para evitar un conflicto.', inline: false }]
                : []),
            ],
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (sub === 'remove') {
      const domain = parseDomain(interaction.options.getString('domain', true));
      await removeDomain(interaction.client, interaction.guild.id, 'blacklist', domain);
      return interaction.reply({
        embeds: [warningEmbed('Dominio retirado', `**${domain}** ya no está en la lista negra.`)],
        flags: MessageFlags.Ephemeral,
      });
    }
    const entries = await listDomains(interaction.client, interaction.guild.id, 'blacklist');
    return interaction.reply({
      embeds: [domainListEmbed('blacklist', entries)],
      flags: MessageFlags.Ephemeral,
    });
  },
};

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { addDomain, domainListEmbed, listDomains, removeDomain } from '../../utils/domain-lists.js';
import { parseDomain } from '../../utils/validators.js';
import { baseEmbed, warningEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Gestiona los dominios de confianza.')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Añade un dominio a la lista blanca.')
        .addStringOption((option) =>
          option.setName('domain').setDescription('Dominio, por ejemplo ejemplo.com.').setRequired(true).setMaxLength(253),
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('Motivo o nota.').setMaxLength(300),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Quita un dominio de la lista blanca.')
        .addStringOption((option) =>
          option.setName('domain').setDescription('Dominio a quitar.').setRequired(true).setMaxLength(253),
        ),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('Muestra la lista blanca.')),
  confirmation: { subcommands: ['add', 'remove'] },
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2500,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand(true);
    if (sub === 'add') {
      const domain = parseDomain(interaction.options.getString('domain', true));
      const result = await addDomain(interaction.client, interaction.guild.id, 'whitelist', {
        domain,
        userId: interaction.user.id,
        reason: interaction.options.getString('reason'),
      });
      const embed = baseEmbed({
        title: '✅ Dominio añadido a la lista blanca',
        description: `**${domain}** ya se considera de confianza.`,
        color: 0x57f287,
        fields: result.entry.reason
          ? [{ name: 'Nota', value: result.entry.reason, inline: false }]
          : [],
      });
      if (result.conflict) {
        embed.addFields({
          name: '⚠️ Conflicto',
          value: 'Este dominio también está en la lista negra, que tiene prioridad. Quítalo de `/blacklist` si deseas confiar en él.',
        });
      }
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
    if (sub === 'remove') {
      const domain = parseDomain(interaction.options.getString('domain', true));
      await removeDomain(interaction.client, interaction.guild.id, 'whitelist', domain);
      return interaction.reply({
        embeds: [
          warningEmbed('Dominio retirado', `**${domain}** ya no está en la lista blanca.`),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
    const entries = await listDomains(interaction.client, interaction.guild.id, 'whitelist');
    return interaction.reply({
      embeds: [domainListEmbed('whitelist', entries)],
      flags: MessageFlags.Ephemeral,
    });
  },
};

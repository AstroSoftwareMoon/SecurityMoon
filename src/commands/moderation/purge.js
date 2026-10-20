// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase } from '../../utils/moderation.js';
import { bulkDeleteMessages } from '../../utils/moderation-helpers.js';
import { UserError } from '../../utils/errors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Elimina mensajes filtrados por usuario o contenido.')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('Cantidad máxima a revisar/eliminar (1-100).')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    )
    .addUserOption((option) =>
      option.setName('user').setDescription('Eliminar solo mensajes de este usuario.'),
    )
    .addStringOption((option) =>
      option
        .setName('contains')
        .setDescription('Eliminar solo mensajes que contengan este texto (sin distinguir mayúsculas).')
        .setMaxLength(200),
    ),
  confirmation: { danger: true },
  permissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  cooldown: 3000,
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount', true);
    const user = interaction.options.getUser('user');
    const contains = interaction.options.getString('contains')?.trim().toLowerCase() ?? null;
    if (!user && !contains) {
      throw new UserError('Indica al menos un filtro: user o contains.');
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const fetched = await interaction.channel.messages.fetch({ limit: 100 });
    let targets = [...fetched.values()];
    if (user) targets = targets.filter((message) => message.author.id === user.id);
    if (contains) {
      targets = targets.filter((message) => message.content.toLowerCase().includes(contains));
    }
    targets = targets.slice(0, amount);
    if (targets.length === 0) throw new UserError('No se encontraron mensajes con esos filtros.');

    const deleted = await bulkDeleteMessages(interaction.channel, targets);
    await createModerationCase(interaction.client, interaction.guild, {
      type: 'purge',
      targetId: user?.id ?? null,
      moderatorId: interaction.user.id,
      reason: `Purga de mensajes${contains ? ` que contienen "${contains}"` : ''}`,
      result: `${deleted} mensaje(s) eliminado(s) en #${interaction.channel.name}.`,
    });

    return interaction.editReply({
      embeds: [
        {
          color: 0x57f287,
          title: '✅ Purga completada',
          description: `Se eliminaron **${deleted}** mensaje(s) en <#${interaction.channelId}>.`,
        },
      ],
    });
  },
};

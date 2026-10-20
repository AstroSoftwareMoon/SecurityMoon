// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createModerationCase } from '../../utils/moderation.js';
import { bulkDeleteMessages } from '../../utils/moderation-helpers.js';
import { UserError } from '../../utils/errors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Elimina mensajes recientes del canal actual.')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('Cantidad de mensajes a eliminar (1-100).')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    )
    .addUserOption((option) =>
      option.setName('user').setDescription('Eliminar solo mensajes de este usuario.'),
    ),
  confirmation: { danger: true },
  permissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  cooldown: 3000,
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount', true);
    const user = interaction.options.getUser('user');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const fetched = await interaction.channel.messages.fetch({
      limit: user ? 100 : amount,
    });
    let targets = [...fetched.values()];
    if (user) {
      targets = targets.filter((message) => message.author.id === user.id).slice(0, amount);
    }
    if (targets.length === 0) {
      throw new UserError('No se encontraron mensajes que cumplan el criterio.');
    }

    const deleted = await bulkDeleteMessages(interaction.channel, targets);
    await createModerationCase(interaction.client, interaction.guild, {
      type: 'clear',
      targetId: user?.id ?? null,
      moderatorId: interaction.user.id,
      reason: user ? `Limpieza de mensajes de ${user.tag}` : 'Limpieza de mensajes',
      result: `${deleted} mensaje(s) eliminado(s) en #${interaction.channel.name}.`,
    });

    return interaction.editReply({
      embeds: [
        {
          color: 0x57f287,
          title: '✅ Mensajes eliminados',
          description: `Se eliminaron **${deleted}** mensaje(s)${user ? ` de ${user.tag}` : ''} en <#${interaction.channelId}>.`,
        },
      ],
    });
  },
};

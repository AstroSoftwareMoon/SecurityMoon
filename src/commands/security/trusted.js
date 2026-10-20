// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { baseEmbed, warningEmbed } from '../../utils/embeds.js';
import { UserError } from '../../utils/errors.js';
import { nowIso } from '../../utils/time.js';
import { sanitizeReason } from '../../utils/validators.js';
import { truncate } from '../../utils/embeds.js';

function kindFor(subcommand) {
  return subcommand.endsWith('user') ? 'users' : 'roles';
}

export default {
  data: new SlashCommandBuilder()
    .setName('trusted')
    .setDescription('Gestiona usuarios y roles de confianza.')
    .addSubcommand((sub) =>
      sub
        .setName('add-user')
        .setDescription('Añade un usuario de confianza.')
        .addUserOption((option) =>
          option.setName('user').setDescription('Usuario de confianza.').setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('Motivo o nota.').setMaxLength(300),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('add-role')
        .setDescription('Añade un rol de confianza.')
        .addRoleOption((option) =>
          option.setName('role').setDescription('Rol de confianza.').setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('Motivo o nota.').setMaxLength(300),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove-user')
        .setDescription('Quita un usuario de confianza.')
        .addUserOption((option) =>
          option.setName('user').setDescription('Usuario a retirar.').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove-role')
        .setDescription('Quita un rol de confianza.')
        .addRoleOption((option) =>
          option.setName('role').setDescription('Rol a retirar.').setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('Muestra las entradas de confianza.')),
  confirmation: { subcommands: ['add-user', 'add-role', 'remove-user', 'remove-role'] },
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 2500,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand(true);
    const kind = kindFor(sub);

    if (sub === 'list') {
      const trusted = await interaction.client.stores.trusted.get(interaction.guild.id);
      const render = (list) =>
        list.length === 0
          ? 'Ninguno.'
          : list
              .slice(0, 25)
              .map(
                (entry) =>
                  `• <@${entry.id}>${entry.note ? ` — ${truncate(entry.note, 120)}` : ''}\n  Añadido por <@${entry.addedBy}>`,
              )
              .join('\n');
      return interaction.reply({
        embeds: [
          baseEmbed({
            title: '✅ Usuarios y roles de confianza',
            description:
              'Las entradas de confianza quedan excluidas de las sanciones automáticas. Úsalas con moderación.',
            color: 0x57f287,
            fields: [
              { name: `Usuarios (${trusted.users.length})`, value: truncate(render(trusted.users), 1024), inline: false },
              { name: `Roles (${trusted.roles.length})`, value: truncate(render(trusted.roles), 1024), inline: false },
              { name: 'Propietario', value: 'El propietario del servidor siempre está excluido.', inline: false },
            ],
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub.startsWith('add')) {
      const isUser = kind === 'users';
      const target = isUser
        ? interaction.options.getUser('user', true)
        : interaction.options.getRole('role', true);
      const note = sanitizeReason(interaction.options.getString('reason'), {
        maxLength: 300,
        fallback: null,
      });
      let added = null;
      await interaction.client.stores.trusted.update(interaction.guild.id, (document) => {
        if (document[kind].some((entry) => entry.id === target.id)) {
          throw new UserError('Esa entrada ya está en la lista de confianza.');
        }
        added = {
          id: target.id,
          addedBy: interaction.user.id,
          addedAt: nowIso(),
          note,
        };
        document[kind].push(added);
        return document;
      });
      return interaction.reply({
        embeds: [
          baseEmbed({
            title: '✅ Confianza añadida',
            description: `${isUser ? 'Usuario' : 'Rol'} ${target} añadido a la lista de confianza.`,
            color: 0x57f287,
            fields: note ? [{ name: 'Nota', value: note, inline: false }] : [],
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub.startsWith('remove')) {
      const isUser = kind === 'users';
      const target = isUser
        ? interaction.options.getUser('user', true)
        : interaction.options.getRole('role', true);
      let found = false;
      await interaction.client.stores.trusted.update(interaction.guild.id, (document) => {
        const before = document[kind].length;
        document[kind] = document[kind].filter((entry) => entry.id !== target.id);
        found = document[kind].length !== before;
        return document;
      });
      if (!found) throw new UserError('Esa entrada no estaba en la lista de confianza.');
      return interaction.reply({
        embeds: [
          warningEmbed(
            'Confianza retirada',
            `${isUser ? 'Usuario' : 'Rol'} ${target} ya no está exento de las protecciones automáticas.`,
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
    return null;
  },
};

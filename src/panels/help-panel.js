// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { COMMAND_EMOJI, PROJECT } from '../constants.js';
import { baseEmbed, truncate } from '../utils/embeds.js';
import {
  buildUsage,
  COMMAND_HELP,
  describeOptions,
  HELP_CATEGORIES,
} from '../utils/help-metadata.js';
import { actionRow, linkButton, panelButton, PANEL_FLAGS } from './shared.js';

const PAGE_SIZE = 6;

function categoryCommands(client, category) {
  return client.commands
    .filter((command) => command.category === category)
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

function categorySelect(current) {
  return new StringSelectMenuBuilder()
    .setCustomId('sm:help:select:category')
    .setPlaceholder('Selecciona una categoría')
    .addOptions(
      Object.entries(HELP_CATEGORIES).map(([key, category]) => ({
        label: `${category.emoji} ${category.label}`,
        value: key,
        description: truncate(category.description, 100),
        default: key === current,
      })),
    );
}

function linksRow() {
  return actionRow(
    linkButton('Repositorio', PROJECT.repository, { emoji: '🐙' }),
    linkButton('GitHub', PROJECT.github, { emoji: '🐙' }),
    linkButton('Comunidad', PROJECT.discord, { emoji: '💬' }),
  );
}

function homePayload(client) {
  const fields = Object.entries(HELP_CATEGORIES).map(([key, category]) => ({
    name: `${category.emoji} ${category.label}`,
    value: `${category.description}\n**${categoryCommands(client, key).size}** comandos.`,
    inline: false,
  }));
  return {
    embeds: [
      baseEmbed({
        title: '🌙 Ayuda de SecurityMoon',
        description:
          'SecurityMoon es un bot de seguridad y moderación gratuito y de código abierto. Todos los comandos son slash y responden de forma efímera cuando corresponde.\n\n✅ Los comandos que modifican el servidor piden confirmación con botones antes de ejecutarse.',
        color: 0x7c6cf5,
        fields,
        footer: `${PROJECT.name} • ${PROJECT.creator} • ${client.commands.size} comandos`,
      }),
    ],
    components: [
      actionRow(categorySelect(null)),
      actionRow(
        panelButton('sm:help:close', 'Cerrar', ButtonStyle.Secondary, { emoji: '✖️' }),
      ),
      linksRow(),
    ],
  };
}

function categoryPayload(client, categoryKey, requestedPage = 0) {
  if (!HELP_CATEGORIES[categoryKey]) return homePayload(client);
  const category = HELP_CATEGORIES[categoryKey];
  const commands = [...categoryCommands(client, categoryKey).values()];
  const pages = Math.max(1, Math.ceil(commands.length / PAGE_SIZE));
  const page = Math.min(Math.max(0, requestedPage), pages - 1);
  const slice = commands.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const description = slice
    .map((command) => {
      const usage = buildUsage(command.data.toJSON());
      const meta = COMMAND_HELP[command.data.name];
      const permissions = meta?.permissions ? ` · 🔑 Permisos: ${meta.permissions}` : '';
      const emoji = COMMAND_EMOJI[command.data.name] ?? '•';
      return `**${emoji} ${usage}**\n${command.data.description}${permissions}`;
    })
    .join('\n\n');

  const embed = baseEmbed({
    title: `${category.emoji} ${category.label}`,
    description: `Página **${page + 1}/${pages}** · ${commands.length} comandos.\n\n${description || 'No hay comandos en esta categoría.'}`,
    color: 0x7c6cf5,
    footer: 'Usa /help o el menú para cambiar de categoría.',
  });

  const commandOptions = slice.map((command) => ({
    label: `/${command.data.name}`.slice(0, 100),
    value: command.data.name,
    description: truncate(command.data.description, 100),
  }));

  const components = [actionRow(categorySelect(categoryKey))];
  if (commandOptions.length > 0) {
    components.push(
      actionRow(
        new StringSelectMenuBuilder()
          .setCustomId('sm:help:select:command')
          .setPlaceholder('Ver detalle de un comando')
          .addOptions(commandOptions),
      ),
    );
  }
  components.push(
    actionRow(
      panelButton(`sm:help:page:${categoryKey}:${page - 1}`, 'Anterior', ButtonStyle.Secondary, { emoji: '◀️', disabled: page <= 0 }),
      panelButton('sm:help:home', 'Inicio', ButtonStyle.Secondary, { emoji: '🏠' }),
      panelButton(`sm:help:page:${categoryKey}:${page + 1}`, 'Siguiente', ButtonStyle.Secondary, { emoji: '▶️', disabled: page >= pages - 1 }),
      panelButton('sm:help:close', 'Cerrar', ButtonStyle.Secondary, { emoji: '✖️' }),
    ),
  );
  components.push(linksRow());
  return { embeds: [embed], components };
}

function commandPayload(client, name) {
  const command = client.commands.get(name);
  if (!command) return homePayload(client);
  const json = command.data.toJSON();
  const meta = COMMAND_HELP[name] ?? {};
  const categoryKey = command.category;
  const category = HELP_CATEGORIES[categoryKey];
  const fields = [
    { name: '➡️ Uso', value: `\`${buildUsage(json)}\``, inline: false },
    { name: '📝 Descripción', value: json.description ?? 'Sin descripción.', inline: false },
    { name: '🔑 Permisos requeridos', value: meta.permissions ?? 'Ninguno.', inline: true },
    { name: '🗂️ Categoría', value: category ? `${category.emoji} ${category.label}` : categoryKey, inline: true },
    { name: '🎛️ Opciones', value: truncate(describeOptions(json), 1024), inline: false },
  ];
  if (meta.example) fields.push({ name: '💡 Ejemplo', value: `\`${meta.example}\``, inline: false });
  if (meta.notes) fields.push({ name: '📌 Notas', value: meta.notes, inline: false });
  if (typeof command.cooldown === 'number') {
    fields.push({ name: '⏱️ Enfriamiento', value: `${command.cooldown} ms`, inline: true });
  }

  const backId = category ? `sm:help:page:${categoryKey}:0` : 'sm:help:home';
  return {
    embeds: [
      baseEmbed({
        title: `${COMMAND_EMOJI[json.name] ?? '❔'} /${json.name}`,
        description: `Detalle del comando${category ? ` de ${category.label}` : ''}.`,
        color: 0x5865f2,
        fields,
        footer: `${PROJECT.name} • ${PROJECT.creator}`,
      }),
    ],
    components: [
      actionRow(
        panelButton(backId, 'Volver a la categoría', ButtonStyle.Secondary, { emoji: '↩️' }),
        panelButton('sm:help:home', 'Inicio', ButtonStyle.Secondary, { emoji: '🏠' }),
        panelButton('sm:help:close', 'Cerrar', ButtonStyle.Secondary, { emoji: '✖️' }),
      ),
      linksRow(),
    ],
  };
}

function closedPayload() {
  return {
    embeds: [
      baseEmbed({
        title: '🌙 Ayuda cerrada',
        description: 'Puedes abrirla de nuevo con `/help` o consultar el repositorio del proyecto.',
        color: 0x9aa0b5,
      }),
    ],
    components: [linksRow()],
  };
}

export async function openHelpPanel(interaction, category = null) {
  const payload = category && HELP_CATEGORIES[category]
    ? categoryPayload(interaction.client, category, 0)
    : homePayload(interaction.client);
  return interaction.reply({ ...payload, flags: PANEL_FLAGS });
}

export async function handleHelpInteraction(interaction) {
  try {
    if (interaction.isButton()) {
      const parts = interaction.customId.split(':');
      const action = parts[2];
      if (action === 'home') return interaction.update(homePayload(interaction.client));
      if (action === 'close') return interaction.update(closedPayload());
      if (action === 'page') {
        return interaction.update(
          categoryPayload(interaction.client, parts[3], Number.parseInt(parts[4] ?? '0', 10)),
        );
      }
      return interaction.update(homePayload(interaction.client));
    }

    if (interaction.isAnySelectMenu()) {
      const parts = interaction.customId.split(':');
      if (parts[2] === 'select' && parts[3] === 'category') {
        return interaction.update(categoryPayload(interaction.client, interaction.values[0], 0));
      }
      if (parts[2] === 'select' && parts[3] === 'command') {
        return interaction.update(commandPayload(interaction.client, interaction.values[0]));
      }
      return interaction.update(homePayload(interaction.client));
    }
    return null;
  } catch {
    return null;
  }
}

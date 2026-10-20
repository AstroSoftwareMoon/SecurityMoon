// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed, truncate } from '../../utils/embeds.js';
import { discordTimestamp } from '../../utils/time.js';
import {
  fetchLatestReleases,
  parseChangelog,
  readChangelog,
  releasesUrl,
} from '../../utils/project-info.js';
import { VERSION } from '../../utils/version.js';

export default {
  data: new SlashCommandBuilder().setName('updates').setDescription('Muestra las novedades reales del proyecto.'),
  permissions: [],
  cooldown: 5000,
  async execute(interaction) {
    const [changelog, remote] = await Promise.all([readChangelog(), fetchLatestReleases()]);
    const sections = parseChangelog(changelog);
    const local = sections[0];
    const fields = [
      { name: 'Versión instalada', value: VERSION, inline: true },
      {
        name: 'Fuente local',
        value: sections.length > 0 ? `CHANGELOG.md (${sections.length} versión(es))` : 'No disponible',
        inline: true,
      },
      {
        name: 'GitHub Releases',
        value: remote.available
          ? remote.releases.length > 0
            ? `${remote.releases.length} release(s) reciente(s)`
            : 'Sin releases publicadas'
          : `No disponible: ${remote.reason}`,
        inline: true,
      },
    ];

    if (local) {
      fields.push({
        name: `Última versión local: ${local.title}`,
        value: truncate(local.body || 'Sin detalles.', 1024),
        inline: false,
      });
    } else {
      fields.push({
        name: 'Novedades locales',
        value: 'No se encontró CHANGELOG.md o está vacío. No se muestran datos inventados.',
        inline: false,
      });
    }

    if (remote.available && remote.releases.length > 0) {
      for (const release of remote.releases) {
        fields.push({
          name: `${release.prerelease ? '🧪 ' : ''}${release.name} (${release.tag})`,
          value: `${release.publishedAt ? discordTimestamp(release.publishedAt, 'd') : 'Fecha desconocida'}\n${truncate(release.body || 'Sin notas.', 500)}\n[Ver release](${release.url})`,
          inline: false,
        });
      }
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Releases').setEmoji('📦').setStyle(ButtonStyle.Link).setURL(releasesUrl()),
      new ButtonBuilder().setLabel('Repositorio').setEmoji('🐙').setStyle(ButtonStyle.Link).setURL(PROJECT.repository),
      new ButtonBuilder().setLabel('Comunidad').setEmoji('💬').setStyle(ButtonStyle.Link).setURL(PROJECT.discord),
    );

    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '📰 Novedades de SecurityMoon',
          description:
            'Información obtenida del CHANGELOG local y, si hay conexión, de GitHub Releases. Si una fuente no está disponible se indica expresamente.',
          color: 0x7c6cf5,
          fields: fields.slice(0, 25),
          footer: `${PROJECT.name} • ${PROJECT.creator}`,
        }),
      ],
      components: [row],
    });
  },
};

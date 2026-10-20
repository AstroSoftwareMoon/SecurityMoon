// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { SlashCommandBuilder } from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed, projectLinksRow } from '../../utils/embeds.js';
import { VERSION } from '../../utils/version.js';

export default {
  data: new SlashCommandBuilder().setName('about').setDescription('Información sobre SecurityMoon y su creador.'),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: `🌙 ${PROJECT.name}`,
          description:
            'SecurityMoon es un bot de seguridad para Discord, gratuito y de código abierto. Protege servidores frente a raids, spam, phishing, enlaces maliciosos, abusos de permisos y acciones destructivas.\n\nToda la configuración se guarda en archivos JSON y se gestiona desde Discord. No hay dashboard web, bases de datos ni funciones de pago.',
          color: 0x7c6cf5,
          thumbnail: interaction.client.user.displayAvatarURL({ size: 256 }),
          fields: [
            { name: 'Creador', value: PROJECT.creator, inline: true },
            { name: 'Versión instalada', value: VERSION, inline: true },
            { name: 'Licencia', value: PROJECT.license, inline: true },
            { name: 'Repositorio', value: `[${PROJECT.repository}](${PROJECT.repository})`, inline: false },
            { name: 'Comunidad', value: `[Servidor oficial](${PROJECT.discord})`, inline: false },
          ],
          footer: `${PROJECT.name} • ${PROJECT.creator}`,
        }),
      ],
      components: [projectLinksRow()],
    });
  },
};

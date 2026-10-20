// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { SlashCommandBuilder } from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed, projectLinksRow } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder().setName('privacy').setDescription('Información sobre privacidad y datos almacenados.'),
  permissions: [],
  cooldown: 2000,
  async execute(interaction) {
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '🔐 Privacidad y datos',
          description: [
            'SecurityMoon no incluye telemetría, dashboard web ni base de datos externa.',
            '',
            '**Qué se almacena (solo en el servidor donde se ejecuta el bot):**',
            '• IDs de servidor, canales, roles y usuarios implicados en configuraciones o incidentes.',
            '• Advertencias, casos de moderación, incidentes, listas de dominios, entradas de confianza y estadísticas.',
            '• Registros técnicos en `logs/security.json`, con tokens y secretos redactados.',
            '',
            '**Dónde se guarda:** archivos JSON en la carpeta `data/` y `logs/` del host. No se envían a AstroSoftwareMoon ni a terceros.',
            '',
            '**Conservación:** los incidentes, advertencias y casos se recortan según la retención configurada. Los administradores pueden exportar o limpiar datos con `/config data` o `/incident clear`.',
            '',
            '**Terceros:** `/updates` puede consultar la API pública de GitHub Releases. No se envían datos de usuarios en esa consulta.',
            '',
            'Si necesitas eliminar datos, contacta con el administrador del servidor. El proyecto no tiene acceso remoto a tu instancia.',
          ].join('\n'),
          color: 0x7c6cf5,
          footer: `${PROJECT.name} • ${PROJECT.creator}`,
        }),
      ],
      components: [projectLinksRow()],
    });
  },
};

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { SlashCommandBuilder } from 'discord.js';
import { PROJECT } from '../../constants.js';
import { baseEmbed, projectLinksRow } from '../../utils/embeds.js';
import { issuesUrl } from '../../utils/project-info.js';

export default {
  data: new SlashCommandBuilder().setName('support').setDescription('Cómo obtener soporte para SecurityMoon.'),
  permissions: [],
  cooldown: 1500,
  async execute(interaction) {
    return interaction.reply({
      embeds: [
        baseEmbed({
          title: '🛟 Soporte',
          description: [
            'Antes de pedir ayuda, prueba estos pasos:',
            '1. Ejecuta `/help` para consultar comandos y permisos.',
            '2. Ejecuta `/securitycheck` y `/permissions` para diagnosticar el servidor.',
            '3. Revisa los registros del bot en `logs/security.json`.',
            '4. Comprueba que el bot tenga los permisos indicados en `/permissions`.',
            '',
            'Para errores del proyecto, abre un issue en GitHub con pasos de reproducción. Para dudas de uso, usa el servidor oficial de Discord.',
            '',
            'No compartas tokens, contraseñas ni datos privados en issues o mensajes.',
          ].join('\n'),
          color: 0x5865f2,
          fields: [
            { name: 'Issues', value: issuesUrl(), inline: false },
            { name: 'Discord', value: PROJECT.discord, inline: false },
          ],
        }),
      ],
      components: [projectLinksRow()],
    });
  },
};

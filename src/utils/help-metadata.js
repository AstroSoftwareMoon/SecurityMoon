// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { EMOJI } from '../constants.js';

export const HELP_CATEGORIES = Object.freeze({
  moderation: {
    label: 'Moderación',
    emoji: '🔨',
    description: 'Sanciones, advertencias y gestión de mensajes y canales.',
  },
  security: {
    label: 'Seguridad',
    emoji: EMOJI.shield,
    description: 'Sistemas automáticos, panel, listas e incidentes.',
  },
  configuration: {
    label: 'Configuración',
    emoji: EMOJI.settings,
    description: 'Asistente y ajustes generales del servidor.',
  },
  information: {
    label: 'Información',
    emoji: EMOJI.info,
    description: 'Estado del bot, del servidor y de los usuarios.',
  },
  community: {
    label: 'Comunidad',
    emoji: EMOJI.moon,
    description: 'Proyecto, enlaces oficiales, licencia y privacidad.',
  },
});

export const COMMAND_HELP = Object.freeze({
  ban: {
    permissions: 'Banear miembros',
    example: '/ban user:@Usuario reason:Incumplimiento delete_days:1',
    notes: 'No se puede banear al propietario ni a alguien con un rol superior.',
  },
  hackban: {
    permissions: 'Banear miembros',
    example: '/hackban user_id:123456789012345678 reason:Cuentas alternativas delete_days:1',
    notes: 'Banea por ID aunque el usuario no esté en el servidor. No se puede aplicar al propietario ni a un rol superior.',
  },
  unban: {
    permissions: 'Banear miembros',
    example: '/unban user_id:123456789012345678 reason:Apelación aceptada',
  },
  kick: {
    permissions: 'Expulsar miembros',
    example: '/kick user:@Usuario reason:Normas del servidor',
  },
  timeout: {
    permissions: 'Moderar miembros',
    example: '/timeout user:@Usuario duration:10m reason:Flood',
    notes: 'La duración máxima es de 28 días. Formatos: 30s, 10m, 2h, 1d.',
  },
  untimeout: {
    permissions: 'Moderar miembros',
    example: '/untimeout user:@Usuario reason:Revisión completada',
  },
  warn: {
    permissions: 'Moderar miembros',
    example: '/warn user:@Usuario reason:Spam repetido',
  },
  warnings: {
    permissions: 'Moderar miembros',
    example: '/warnings user:@Usuario',
  },
  clear: {
    permissions: 'Gestionar mensajes',
    example: '/clear amount:50 user:@Usuario',
  },
  slowmode: {
    permissions: 'Gestionar canales',
    example: '/slowmode seconds:10 channel:#general',
  },
  lock: {
    permissions: 'Gestionar canales',
    example: '/lock channel:#general reason:Incidente en curso',
  },
  unlock: {
    permissions: 'Gestionar canales',
    example: '/unlock channel:#general',
  },
  purge: {
    permissions: 'Gestionar mensajes',
    example: '/purge amount:50 contains:discord.gg',
  },
  modlog: {
    permissions: 'Gestionar mensajes',
    example: '/modlog user:@Usuario limit:10',
  },
  securitymoon: {
    permissions: 'Gestionar servidor',
    example: '/securitymoon',
    notes: 'Panel interactivo con botones, menús y modales.',
  },
  security: {
    permissions: 'Gestionar servidor',
    example: '/security',
  },
  antiraid: {
    permissions: 'Gestionar servidor',
    example: '/antiraid configure threshold:8 interval:60 action:alert',
  },
  antinuke: {
    permissions: 'Gestionar servidor',
    example: '/antinuke configure channel_delete:3 role_delete:3 action:alert',
  },
  antiphishing: {
    permissions: 'Gestionar servidor',
    example: '/antiphishing configure threshold:3 block_invites:true',
  },
  antispam: {
    permissions: 'Gestionar servidor',
    example: '/antispam configure messages:6 window:10 action:warn',
  },
  whitelist: {
    permissions: 'Gestionar servidor',
    example: '/whitelist add domain:ejemplo.com reason:Dominio oficial',
  },
  blacklist: {
    permissions: 'Gestionar servidor',
    example: '/blacklist add domain:ejemplo-malicioso.com reason:Reportado',
  },
  trusted: {
    permissions: 'Gestionar servidor',
    example: '/trusted add-user user:@Moderador reason:Staff de confianza',
  },
  securitylogs: {
    permissions: 'Gestionar servidor',
    example: '/securitylogs view limit:10',
  },
  incident: {
    permissions: 'Gestionar servidor',
    example: '/incident list limit:10',
  },
  emergency: {
    permissions: 'Administrador',
    example: '/emergency activate reason:Raid en curso',
    notes: 'Activa umbrales estrictos y eleva la verificación del servidor.',
  },
  permissions: {
    permissions: 'Gestionar servidor',
    example: '/permissions',
  },
  securitycheck: {
    permissions: 'Gestionar servidor',
    example: '/securitycheck',
  },
  setup: {
    permissions: 'Gestionar servidor',
    example: '/setup',
    notes: 'Asistente paso a paso. Nada se guarda hasta confirmar.',
  },
  config: {
    permissions: 'Gestionar servidor',
    example: '/config view',
    notes: 'Permite exportar datos y limpiar registros con confirmación por botones.',
  },
  help: {
    permissions: 'Ninguno',
    example: '/help category:security',
  },
  ping: {
    permissions: 'Ninguno',
    example: '/ping',
  },
  botinfo: {
    permissions: 'Ninguno',
    example: '/botinfo',
  },
  serverinfo: {
    permissions: 'Ninguno',
    example: '/serverinfo',
  },
  userinfo: {
    permissions: 'Ninguno',
    example: '/userinfo user:@Usuario',
  },
  avatar: {
    permissions: 'Ninguno',
    example: '/avatar user:@Usuario',
  },
  uptime: {
    permissions: 'Ninguno',
    example: '/uptime',
  },
  status: {
    permissions: 'Ninguno',
    example: '/status',
  },
  stats: {
    permissions: 'Ninguno',
    example: '/stats',
  },
  report: {
    permissions: 'Ninguno',
    example: '/report category:bug details:El panel no responde al botón de ayuda',
    notes: 'El reporte se guarda localmente y no se envía a servicios externos.',
  },
  about: {
    permissions: 'Ninguno',
    example: '/about',
  },
  credits: {
    permissions: 'Ninguno',
    example: '/credits',
  },
  opensource: {
    permissions: 'Ninguno',
    example: '/opensource',
  },
  github: {
    permissions: 'Ninguno',
    example: '/github',
  },
  community: {
    permissions: 'Ninguno',
    example: '/community',
  },
  support: {
    permissions: 'Ninguno',
    example: '/support',
  },
  invite: {
    permissions: 'Ninguno',
    example: '/invite',
  },
  updates: {
    permissions: 'Ninguno',
    example: '/updates',
  },
  changelog: {
    permissions: 'Ninguno',
    example: '/changelog',
  },
  privacy: {
    permissions: 'Ninguno',
    example: '/privacy',
  },
  license: {
    permissions: 'Ninguno',
    example: '/license',
  },
});

/** Genera la línea de uso a partir del builder del comando. */
export function buildUsage(commandJson) {
  const options = (commandJson.options ?? []).filter((option) => option.type !== 1 && option.type !== 2);
  const parts = options.map((option) =>
    option.required ? `<${option.name}>` : `[${option.name}]`,
  );
  const subcommands = (commandJson.options ?? []).filter((option) => option.type === 1 || option.type === 2);
  if (subcommands.length > 0) {
    return `/${commandJson.name} <${subcommands.map((sub) => sub.name).join('|')}>`;
  }
  return `/${commandJson.name}${parts.length ? ` ${parts.join(' ')}` : ''}`;
}

/** Opciones legibles de un comando (incluye subcomandos de primer nivel). */
export function describeOptions(commandJson) {
  const lines = [];
  for (const option of commandJson.options ?? []) {
    if (option.type === 1 || option.type === 2) {
      const type = option.type === 1 ? 'subcomando' : 'grupo';
      lines.push(`\`${option.name}\` (${type}): ${option.description ?? 'Sin descripción'}`);
      for (const child of option.options ?? []) {
        lines.push(`  • \`${child.name}\`: ${child.description ?? 'Sin descripción'}`);
      }
    } else {
      lines.push(`\`${option.name}\`: ${option.description ?? 'Sin descripción'}`);
    }
  }
  return lines.join('\n') || 'Sin opciones.';
}

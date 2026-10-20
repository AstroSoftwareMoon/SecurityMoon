/**
 * Constantes globales de SecurityMoon.
 * Creado por AstroSoftwareMoon.
 */

export const PROJECT = Object.freeze({
  name: 'SecurityMoon',
  creator: 'AstroSoftwareMoon',
  github: 'https://github.com/AstroSoftwareMoon/',
  repository: 'https://github.com/AstroSoftwareMoon/SecurityMoon',
  discord: 'https://discord.gg/eBszxvAuhN',
  license: 'MIT',
});

export const COLORS = Object.freeze({
  brand: 0x7c6cf5,
  moon: 0xf5f3ff,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
  info: 0x5865f2,
  muted: 0x9aa0b5,
  dark: 0x1e1f2b,
});

export const EMOJI = Object.freeze({
  moon: '🌙',
  shield: '🛡️',
  raid: '🚨',
  nuke: '💥',
  phishing: '🎣',
  spam: '💬',
  key: '🔐',
  logs: '📋',
  settings: '⚙️',
  trusted: '🤝',
  blacklist: '⛔',
  whitelist: '✅',
  emergency: '🆘',
  check: '🔍',
  help: '❔',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
  github: '🐙',
  discord: '💬',
  lock: '🔒',
  unlock: '🔓',
  confirm: '✅',
  cancel: '❌',
  pending: '⏳',
  sparkles: '✨',
  hammer: '🔨',
  boot: '👢',
  clock: '⏱️',
  broom: '🧹',
  trash: '🗑️',
  turtle: '🐢',
  scroll: '📜',
  folder: '🗂️',
  construction: '🚧',
  ping: '🏓',
  robot: '🤖',
  home: '🏠',
  user: '👤',
  image: '🖼️',
  status: '📡',
  chart: '📊',
  report: '📨',
  book: '📖',
  support: '🛟',
  invite: '➕',
  news: '📰',
  privacy: '🔐',
  license: '📄',
  compass: '🧭',
  list: '📋',
  export: '📦',
  arrowRight: '➡️',
  arrowLeft: '⬅️',
  refresh: '🔄',
  power: '⚡',
  eyes: '👀',
  wave: '👋',
  crown: '👑',
  gear: '🛠️',
  ruler: '📐',
  bell: '🔔',
  channel: '📣',
  role: '🎭',
  date: '📅',
  link: '🔗',
  globe: '🌐',
  spark: '💫',
  shieldCheck: '✅',
});

/** Emoji para las opciones de los comandos. */
export const OPTION_EMOJI = Object.freeze({
  user: '👤',
  member: '👤',
  role: '🎭',
  channel: '📣',
  reason: '📝',
  amount: '🔢',
  limit: '🔢',
  duration: '⏱️',
  interval: '⏱️',
  cooldown: '⏱️',
  timeout: '⏳',
  timeout_seconds: '⏳',
  window: '🪟',
  duplicate_window: '🪟',
  threshold: '📊',
  messages: '💬',
  duplicates: '♻️',
  mentions: '📣',
  links: '🔗',
  emojis: '😄',
  escalate: '📈',
  delete_messages: '🧹',
  action: '🎯',
  scope: '🗂️',
  source: '🗂️',
  type: '🏷️',
  category: '🏷️',
  id: '🆔',
  user_id: '🆔',
  domain: '🔗',
  contains: '🔍',
  delete_days: '📅',
  seconds: '⏱️',
  min_account_age: '👶',
  auto_emergency: '🚨',
  ignore_bots: '🤖',
  block_invites: '🔗',
  channel_delete: '🗑️',
  role_delete: '🗑️',
  channel_create: '➕',
  role_create: '➕',
  ban: '🔨',
  kick: '👢',
  permission_change: '🔑',
  enabled: '🔘',
  confirm: '✅',
});

/** Emoji por tipo de opción, usado si el nombre no tiene uno específico. */
export const OPTION_TYPE_EMOJI = Object.freeze({
  3: '💬',
  4: '🔢',
  5: '🔘',
  6: '👤',
  7: '📣',
  8: '🎭',
  9: '👥',
  10: '🔢',
  11: '📎',
});

/** Emoji para subcomandos y acciones habituales. */
export const ACTION_EMOJI = Object.freeze({
  status: '👀',
  enable: '⚡',
  disable: '⛔',
  action: '🎯',
  configure: '🛠️',
  reset: '🔄',
  add: '➕',
  remove: '➖',
  list: '📋',
  view: '👀',
  export: '📦',
  clear: '🧹',
  activate: '🆘',
  deactivate: '🌙',
  data: '🗄️',
  'add-user': '➕',
  'add-role': '➕',
  'remove-user': '➖',
  'remove-role': '➖',
});

/**
 * Emoji representativo de cada comando. Se usa en la ayuda, en las
 * confirmaciones y para decorar las descripciones de los comandos slash.
 */
export const COMMAND_EMOJI = Object.freeze({
  ban: '🔨',
  hackban: '🏹',
  unban: '🕊️',
  kick: '👢',
  timeout: '⏳',
  untimeout: '⏱️',
  warn: '⚠️',
  warnings: '📋',
  clear: '🧹',
  purge: '🗑️',
  slowmode: '🐢',
  lock: '🔒',
  unlock: '🔓',
  modlog: '📜',
  securitymoon: '🌙',
  security: '🛡️',
  antiraid: '🚨',
  antinuke: '💥',
  antiphishing: '🎣',
  antispam: '💬',
  whitelist: '✅',
  blacklist: '⛔',
  trusted: '🤝',
  securitylogs: '🗂️',
  incident: '🚧',
  emergency: '🆘',
  permissions: '🔑',
  securitycheck: '🔍',
  config: '⚙️',
  setup: '🧭',
  help: '❔',
  ping: '🏓',
  botinfo: '🤖',
  serverinfo: '🏠',
  userinfo: '👤',
  avatar: '🖼️',
  uptime: '⏱️',
  status: '📡',
  stats: '📊',
  report: '📨',
  about: '🌙',
  credits: '✨',
  opensource: '📖',
  github: '🐙',
  community: '💬',
  support: '🛟',
  invite: '➕',
  updates: '📰',
  changelog: '📜',
  privacy: '🔐',
  license: '📄',
});

/** Módulos de seguridad configurables. */
export const MODULE_KEYS = Object.freeze([
  'antiRaid',
  'antiNuke',
  'antiPhishing',
  'antiSpam',
  'permissionsGuard',
]);

export const MODULES = Object.freeze({
  antiRaid: {
    key: 'antiRaid',
    name: 'Anti-Raid',
    emoji: EMOJI.raid,
    description: 'Detecta entradas masivas y aplica contención progresiva.',
  },
  antiNuke: {
    key: 'antiNuke',
    name: 'Anti-Nuke',
    emoji: EMOJI.nuke,
    description: 'Vigila eliminaciones y cambios administrativos masivos.',
  },
  antiPhishing: {
    key: 'antiPhishing',
    name: 'Anti-Phishing',
    emoji: EMOJI.phishing,
    description: 'Analiza enlaces e invitaciones con heurísticas y listas.',
  },
  antiSpam: {
    key: 'antiSpam',
    name: 'Anti-Spam',
    emoji: EMOJI.spam,
    description: 'Frena mensajes repetidos, menciones masivas y flood.',
  },
  permissionsGuard: {
    key: 'permissionsGuard',
    name: 'Protección de permisos',
    emoji: EMOJI.key,
    description: 'Vigila permisos administrativos y roles peligrosos.',
  },
});

export const RAID_ACTIONS = Object.freeze(['alert', 'timeout', 'kick', 'ban', 'lockdown']);
export const NUKE_ACTIONS = Object.freeze(['alert', 'strip_roles', 'kick', 'ban', 'lockdown']);
export const PHISHING_ACTIONS = Object.freeze([
  'alert',
  'delete',
  'delete_with_warning',
  'delete_with_timeout',
]);
export const SPAM_ACTIONS = Object.freeze(['warn', 'timeout', 'kick', 'ban']);
export const PROTECTION_LEVELS = Object.freeze(['low', 'medium', 'high', 'extreme']);

export const SEVERITIES = Object.freeze(['low', 'medium', 'high', 'critical']);

/** Emoji por tipo de incidente para las vistas de solo lectura. */
export const INCIDENT_EMOJI = Object.freeze({
  raid: '🚨',
  nuke: '💥',
  phishing: '🎣',
  spam: '💬',
  permission: '🔑',
  emergency: '🆘',
  moderation: '🔨',
  report: '📨',
  system: '⚙️',
  manual: '🛠️',
});

/** Emoji por gravedad. */
export const SEVERITY_EMOJI = Object.freeze({
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴',
});

export const INCIDENT_TYPES = Object.freeze([
  'raid',
  'nuke',
  'phishing',
  'spam',
  'permission',
  'emergency',
  'moderation',
  'report',
  'system',
  'manual',
]);

export const CASE_TYPES = Object.freeze([
  'ban',
  'unban',
  'kick',
  'timeout',
  'untimeout',
  'warn',
  'clear',
  'slowmode',
  'lock',
  'unlock',
  'purge',
]);

export const PROTECTION_PRESETS = Object.freeze({
  low: {
    label: 'Baja',
    description: 'Umbrales amplios. Recomendado para comunidades muy activas.',
    emoji: '🌱',
    modules: {
      antiRaid: {
        enabled: true,
        joinThreshold: 15,
        joinIntervalSeconds: 60,
        action: 'alert',
        minAccountAgeDays: 0,
        autoEmergency: false,
      },
      antiNuke: {
        enabled: true,
        thresholds: {
          channelDelete: 5,
          roleDelete: 5,
          channelCreate: 10,
          roleCreate: 10,
          ban: 5,
          kick: 5,
          permissionChange: 3,
        },
        action: 'alert',
      },
      antiPhishing: { enabled: true, action: 'delete', suspiciousScoreThreshold: 4 },
      antiSpam: { enabled: true, messageThreshold: 10, action: 'warn', escalate: false },
    },
  },
  medium: {
    label: 'Media',
    description: 'Equilibrio recomendado entre protección y falsos positivos.',
    emoji: '🌙',
    modules: {
      antiRaid: {
        enabled: true,
        joinThreshold: 8,
        joinIntervalSeconds: 60,
        action: 'alert',
        minAccountAgeDays: 0,
        autoEmergency: false,
      },
      antiNuke: {
        enabled: true,
        thresholds: {
          channelDelete: 3,
          roleDelete: 3,
          channelCreate: 6,
          roleCreate: 6,
          ban: 3,
          kick: 3,
          permissionChange: 2,
        },
        action: 'alert',
      },
      antiPhishing: { enabled: true, action: 'delete_with_warning', suspiciousScoreThreshold: 3 },
      antiSpam: { enabled: true, messageThreshold: 6, action: 'warn', escalate: true },
    },
  },
  high: {
    label: 'Alta',
    description: 'Umbrales estrictos y sanciones activas. Revisa las exclusiones.',
    emoji: '🛡️',
    modules: {
      antiRaid: {
        enabled: true,
        joinThreshold: 5,
        joinIntervalSeconds: 45,
        action: 'timeout',
        minAccountAgeDays: 3,
        autoEmergency: false,
      },
      antiNuke: {
        enabled: true,
        thresholds: {
          channelDelete: 2,
          roleDelete: 2,
          channelCreate: 4,
          roleCreate: 4,
          ban: 2,
          kick: 2,
          permissionChange: 1,
        },
        action: 'strip_roles',
      },
      antiPhishing: { enabled: true, action: 'delete_with_timeout', suspiciousScoreThreshold: 2 },
      antiSpam: { enabled: true, messageThreshold: 5, action: 'timeout', escalate: true },
    },
  },
  extreme: {
    label: 'Extrema',
    description: 'Máxima contención. Puede afectar a usuarios nuevos legítimos.',
    emoji: '🚨',
    modules: {
      antiRaid: {
        enabled: true,
        joinThreshold: 3,
        joinIntervalSeconds: 30,
        action: 'kick',
        minAccountAgeDays: 7,
        autoEmergency: true,
      },
      antiNuke: {
        enabled: true,
        thresholds: {
          channelDelete: 1,
          roleDelete: 1,
          channelCreate: 2,
          roleCreate: 2,
          ban: 1,
          kick: 1,
          permissionChange: 1,
        },
        action: 'kick',
      },
      antiPhishing: { enabled: true, action: 'delete_with_timeout', suspiciousScoreThreshold: 2 },
      antiSpam: { enabled: true, messageThreshold: 4, action: 'timeout', escalate: true },
    },
  },
});

export const DEFAULT_LANGUAGE = 'es';
export const SUPPORTED_LANGUAGES = Object.freeze(['es']);
export const LOG_LEVELS = Object.freeze(['error', 'warn', 'info', 'debug']);

/** Permisos recomendados para la invitación del bot. */
export const INVITE_PERMISSIONS = Object.freeze([
  'ViewChannel',
  'SendMessages',
  'SendMessagesInThreads',
  'EmbedLinks',
  'ReadMessageHistory',
  'ManageMessages',
  'ManageRoles',
  'ManageChannels',
  'KickMembers',
  'BanMembers',
  'ModerateMembers',
  'ViewAuditLog',
  'ManageGuild',
  'AddReactions',
  'UseExternalEmojis',
]);

/** Permisos que se consideran peligrosos si un rol los posee. */
export const DANGEROUS_PERMISSIONS = Object.freeze([
  'Administrator',
  'ManageGuild',
  'ManageRoles',
  'ManageChannels',
  'ManageWebhooks',
  'KickMembers',
  'BanMembers',
  'MentionEveryone',
  'ModerateMembers',
  'ManageMessages',
]);

export const DATA_SUBDIRECTORIES = Object.freeze([
  'guilds',
  'warnings',
  'incidents',
  'moderation',
  'trusted',
  'filters',
  'stats',
  'backups',
]);

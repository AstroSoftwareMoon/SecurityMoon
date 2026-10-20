// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import {
  CASE_TYPES,
  INCIDENT_TYPES,
  PROTECTION_LEVELS,
  RAID_ACTIONS,
  SEVERITIES,
  NUKE_ACTIONS,
  PHISHING_ACTIONS,
  SPAM_ACTIONS,
} from '../constants.js';
import { nowIso } from '../utils/time.js';
import {
  assertWithShape,
  isSnowflake,
  isValidDomain,
  normalizeDomain,
  normalizeWithShape,
} from './validation.js';

const nullableSnowflake = { type: 'snowflake', nullable: true, default: null };
const nullableDate = { type: 'date', nullable: true, default: null };
const nullableString = (maxLength = 500) => ({
  type: 'string',
  nullable: true,
  maxLength,
  default: null,
});

const domainEntryShape = {
  value: {
    type: 'string',
    minLength: 3,
    maxLength: 253,
    default: '',
  },
  addedBy: { type: 'snowflake', default: '000000000000000000' },
  addedAt: { type: 'date', default: nowIso },
  reason: nullableString(300),
};

const trustedEntryShape = {
  id: { type: 'snowflake', default: '000000000000000000' },
  addedBy: { type: 'snowflake', default: '000000000000000000' },
  addedAt: { type: 'date', default: nowIso },
  note: nullableString(300),
};

const domainArray = (maxItems) => ({
  type: 'array',
  items: { type: 'object', shape: domainEntryShape },
  default: [],
  maxItems,
  unique: true,
  uniqueBy: 'value',
  itemFilter: (entry) => isValidDomain(entry.value),
});

const trustedArray = (maxItems) => ({
  type: 'array',
  items: { type: 'object', shape: trustedEntryShape },
  default: [],
  maxItems,
  unique: true,
  uniqueBy: 'id',
  itemFilter: (entry) => isSnowflake(entry.id) && entry.id !== '000000000000000000',
});

const snowflakeArray = (maxItems) => ({
  type: 'array',
  items: { type: 'snowflake' },
  default: [],
  maxItems,
  unique: true,
});

export const GUILD_SETTINGS_SHAPE = {
  schemaVersion: { type: 'integer', min: 1, max: 100, default: 1 },
  guildId: { type: 'snowflake', default: '000000000000000000' },
  language: { type: 'enum', values: ['es'], default: 'es' },
  setupCompleted: { type: 'boolean', default: false },
  protectionLevel: { type: 'enum', values: PROTECTION_LEVELS, default: 'medium' },
  createdAt: { type: 'date', default: nowIso },
  updatedAt: { type: 'date', default: nowIso },
  channels: {
    type: 'object',
    shape: {
      alerts: nullableSnowflake,
      logs: nullableSnowflake,
      modlog: nullableSnowflake,
    },
  },
  emergency: {
    type: 'object',
    shape: {
      active: { type: 'boolean', default: false },
      activatedAt: nullableDate,
      activatedBy: nullableSnowflake,
      reason: nullableString(500),
      previousVerificationLevel: { type: 'integer', min: 0, max: 4, nullable: true, default: null },
    },
  },
  modules: {
    type: 'object',
    shape: {
      antiRaid: {
        type: 'object',
        shape: {
          enabled: { type: 'boolean', default: true },
          joinThreshold: { type: 'integer', min: 2, max: 100, default: 8 },
          joinIntervalSeconds: { type: 'integer', min: 5, max: 600, default: 60 },
          raidCooldownSeconds: { type: 'integer', min: 30, max: 3600, default: 300 },
          action: { type: 'enum', values: RAID_ACTIONS, default: 'alert' },
          minAccountAgeDays: { type: 'integer', min: 0, max: 365, default: 0 },
          autoEmergency: { type: 'boolean', default: false },
          ignoreBots: { type: 'boolean', default: true },
        },
      },
      antiNuke: {
        type: 'object',
        shape: {
          enabled: { type: 'boolean', default: true },
          windowSeconds: { type: 'integer', min: 10, max: 600, default: 60 },
          thresholds: {
            type: 'object',
            shape: {
              channelDelete: { type: 'integer', min: 1, max: 25, default: 3 },
              roleDelete: { type: 'integer', min: 1, max: 25, default: 3 },
              channelCreate: { type: 'integer', min: 1, max: 25, default: 6 },
              roleCreate: { type: 'integer', min: 1, max: 25, default: 6 },
              ban: { type: 'integer', min: 1, max: 25, default: 3 },
              kick: { type: 'integer', min: 1, max: 25, default: 3 },
              permissionChange: { type: 'integer', min: 1, max: 25, default: 2 },
            },
          },
          action: { type: 'enum', values: NUKE_ACTIONS, default: 'alert' },
          trustedBots: snowflakeArray(50),
        },
      },
      antiPhishing: {
        type: 'object',
        shape: {
          enabled: { type: 'boolean', default: true },
          action: { type: 'enum', values: PHISHING_ACTIONS, default: 'delete_with_warning' },
          suspiciousScoreThreshold: { type: 'integer', min: 1, max: 10, default: 3 },
          blockInvites: { type: 'boolean', default: true },
        },
      },
      antiSpam: {
        type: 'object',
        shape: {
          enabled: { type: 'boolean', default: true },
          messageThreshold: { type: 'integer', min: 2, max: 30, default: 6 },
          messageWindowSeconds: { type: 'integer', min: 3, max: 120, default: 10 },
          duplicateThreshold: { type: 'integer', min: 2, max: 15, default: 3 },
          duplicateWindowSeconds: { type: 'integer', min: 5, max: 300, default: 30 },
          mentionThreshold: { type: 'integer', min: 2, max: 30, default: 6 },
          linkThreshold: { type: 'integer', min: 2, max: 15, default: 4 },
          emojiThreshold: { type: 'integer', min: 5, max: 50, default: 15 },
          capsRatio: { type: 'number', min: 0.5, max: 1, default: 0.8 },
          capsMinLength: { type: 'integer', min: 10, max: 200, default: 30 },
          action: { type: 'enum', values: SPAM_ACTIONS, default: 'warn' },
          timeoutSeconds: { type: 'integer', min: 60, max: 2419200, default: 600 },
          escalate: { type: 'boolean', default: true },
          deleteMessages: { type: 'boolean', default: true },
        },
      },
      permissionsGuard: {
        type: 'object',
        shape: {
          enabled: { type: 'boolean', default: true },
          alertOnAdminGrant: { type: 'boolean', default: true },
          alertOnDangerousRole: { type: 'boolean', default: true },
          alertOnMemberAdminRole: { type: 'boolean', default: true },
        },
      },
    },
  },
  exclusions: {
    type: 'object',
    shape: {
      channels: snowflakeArray(100),
    },
  },
  notifications: {
    type: 'object',
    shape: {
      projectUpdates: { type: 'boolean', default: false },
      lastPromotionAt: nullableDate,
    },
  },
  moderation: {
    type: 'object',
    shape: {
      dmOnSanction: { type: 'boolean', default: true },
      defaultTimeoutSeconds: { type: 'integer', min: 60, max: 2419200, default: 600 },
      logActions: { type: 'boolean', default: true },
    },
  },
  retention: {
    type: 'object',
    shape: {
      incidentsDays: { type: 'integer', min: 1, max: 3650, default: 90 },
      maxIncidents: { type: 'integer', min: 50, max: 5000, default: 1000 },
      warningsDays: { type: 'integer', min: 1, max: 3650, default: 365 },
      maxWarnings: { type: 'integer', min: 50, max: 5000, default: 2000 },
      casesDays: { type: 'integer', min: 1, max: 3650, default: 365 },
      maxCases: { type: 'integer', min: 50, max: 5000, default: 2000 },
    },
  },
};

export const WARNINGS_SHAPE = {
  schemaVersion: { type: 'integer', min: 1, max: 100, default: 1 },
  guildId: { type: 'snowflake', default: '000000000000000000' },
  nextId: { type: 'integer', min: 1, max: 1_000_000, default: 1 },
  updatedAt: { type: 'date', default: nowIso },
  warnings: {
    type: 'array',
    default: [],
    maxItems: 5000,
    items: {
      type: 'object',
      shape: {
        id: { type: 'integer', min: 1, max: 1_000_000, default: 1 },
        userId: { type: 'snowflake', default: '000000000000000000' },
        moderatorId: { type: 'snowflake', default: '000000000000000000' },
        reason: { type: 'string', minLength: 1, maxLength: 1000, default: 'Sin motivo especificado' },
        createdAt: { type: 'date', default: nowIso },
        active: { type: 'boolean', default: true },
        removedBy: nullableSnowflake,
        removedAt: nullableDate,
      },
    },
  },
};

export const INCIDENTS_SHAPE = {
  schemaVersion: { type: 'integer', min: 1, max: 100, default: 1 },
  guildId: { type: 'snowflake', default: '000000000000000000' },
  nextId: { type: 'integer', min: 1, max: 1_000_000, default: 1 },
  updatedAt: { type: 'date', default: nowIso },
  incidents: {
    type: 'array',
    default: [],
    maxItems: 5000,
    items: {
      type: 'object',
      shape: {
        id: { type: 'integer', min: 1, max: 1_000_000, default: 1 },
        type: { type: 'enum', values: INCIDENT_TYPES, default: 'manual' },
        severity: { type: 'enum', values: SEVERITIES, default: 'medium' },
        userId: nullableSnowflake,
        actorId: nullableSnowflake,
        description: {
          type: 'string',
          minLength: 1,
          maxLength: 2000,
          default: 'Sin descripción',
        },
        action: nullableString(300),
        result: nullableString(500),
        channelId: nullableSnowflake,
        messageId: nullableSnowflake,
        urls: {
          type: 'array',
          items: { type: 'string', minLength: 1, maxLength: 2048 },
          default: [],
          maxItems: 10,
        },
        details: nullableString(1500),
        createdAt: { type: 'date', default: nowIso },
      },
    },
  },
};

export const MODERATION_SHAPE = {
  schemaVersion: { type: 'integer', min: 1, max: 100, default: 1 },
  guildId: { type: 'snowflake', default: '000000000000000000' },
  nextId: { type: 'integer', min: 1, max: 1_000_000, default: 1 },
  updatedAt: { type: 'date', default: nowIso },
  cases: {
    type: 'array',
    default: [],
    maxItems: 5000,
    items: {
      type: 'object',
      shape: {
        id: { type: 'integer', min: 1, max: 1_000_000, default: 1 },
        type: { type: 'enum', values: CASE_TYPES, default: 'warn' },
        targetId: nullableSnowflake,
        moderatorId: { type: 'snowflake', default: '000000000000000000' },
        reason: { type: 'string', minLength: 1, maxLength: 1000, default: 'Sin motivo especificado' },
        createdAt: { type: 'date', default: nowIso },
        durationSeconds: { type: 'integer', min: 0, max: 2419200, nullable: true, default: null },
        expiresAt: nullableDate,
        active: { type: 'boolean', default: true },
        result: nullableString(500),
      },
    },
  },
};

export const TRUSTED_SHAPE = {
  schemaVersion: { type: 'integer', min: 1, max: 100, default: 1 },
  guildId: { type: 'snowflake', default: '000000000000000000' },
  updatedAt: { type: 'date', default: nowIso },
  users: trustedArray(500),
  roles: trustedArray(500),
};

export const FILTERS_SHAPE = {
  schemaVersion: { type: 'integer', min: 1, max: 100, default: 1 },
  guildId: { type: 'snowflake', default: '000000000000000000' },
  updatedAt: { type: 'date', default: nowIso },
  whitelist: {
    type: 'object',
    shape: {
      domains: domainArray(2000),
    },
  },
  blacklist: {
    type: 'object',
    shape: {
      domains: domainArray(5000),
    },
  },
};

export const STATS_SHAPE = {
  schemaVersion: { type: 'integer', min: 1, max: 100, default: 1 },
  guildId: { type: 'snowflake', default: '000000000000000000' },
  since: { type: 'date', default: nowIso },
  updatedAt: { type: 'date', default: nowIso },
  counters: {
    type: 'object',
    shape: {
      messagesScanned: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      linksScanned: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      spamBlocked: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      phishingBlocked: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      raidsDetected: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      nukesBlocked: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      sanctionsApplied: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      incidents: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      commandsUsed: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      joins: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      leaves: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      warnings: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
      moderationActions: { type: 'integer', min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
    },
  },
};

export const DOCUMENT_SHAPES = Object.freeze({
  guilds: GUILD_SETTINGS_SHAPE,
  warnings: WARNINGS_SHAPE,
  incidents: INCIDENTS_SHAPE,
  moderation: MODERATION_SHAPE,
  trusted: TRUSTED_SHAPE,
  filters: FILTERS_SHAPE,
  stats: STATS_SHAPE,
});

/** Construye la configuración predeterminada de un servidor. */
export function defaultGuildSettings(guildId) {
  return normalizeWithShape({ guildId }, GUILD_SETTINGS_SHAPE);
}

/** Normaliza cualquier documento de servidor. */
export function normalizeDocument(kind, raw, guildId) {
  const shape = DOCUMENT_SHAPES[kind];
  if (!shape) throw new Error(`Tipo de documento desconocido: ${kind}`);
  const normalized = normalizeWithShape(raw, shape);
  normalized.guildId = guildId;
  return normalized;
}

/** Valida un documento normalizado. */
export function assertDocument(kind, data) {
  const shape = DOCUMENT_SHAPES[kind];
  if (!shape) throw new Error(`Tipo de documento desconocido: ${kind}`);
  assertWithShape(data, shape);
  if (!isSnowflake(data.guildId)) {
    throw new Error('El documento no tiene un guildId válido.');
  }
  return true;
}

// Reexportado para comodidad de los comandos.
export { isValidDomain, normalizeDomain };

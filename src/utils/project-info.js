// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { readFile } from 'node:fs/promises';
import { PROJECT } from '../constants.js';
import { VERSION } from './version.js';

const CHANGELOG_PATH = new URL('../../CHANGELOG.md', import.meta.url);
const LICENSE_PATH = new URL('../../LICENSE', import.meta.url);
const RELEASES_API = 'https://api.github.com/repos/AstroSoftwareMoon/SecurityMoon/releases?per_page=3';
const CACHE_MS = 10 * 60 * 1000;
let releaseCache = { at: 0, data: null };

export async function readChangelog() {
  try {
    return await readFile(CHANGELOG_PATH, 'utf8');
  } catch {
    return '';
  }
}

export async function readLicense() {
  try {
    return await readFile(LICENSE_PATH, 'utf8');
  } catch {
    return 'Licencia MIT. Consulta el repositorio para ver el texto completo.';
  }
}

/**
 * Divide CHANGELOG.md en secciones por encabezados de nivel 2.
 */
export function parseChangelog(markdown) {
  if (!markdown) return [];
  const sections = [];
  const parts = markdown.split(/^##\s+/m).slice(1);
  for (const part of parts) {
    const lines = part.split('\n');
    const title = lines.shift()?.trim() ?? '';
    const body = lines.join('\n').trim();
    if (title) sections.push({ title, body });
  }
  return sections;
}

/**
 * Consulta GitHub Releases si hay conexión. Nunca inventa datos.
 */
export async function fetchLatestReleases({ force = false } = {}) {
  if (!force && releaseCache.data && Date.now() - releaseCache.at < CACHE_MS) {
    return releaseCache.data;
  }
  try {
    const response = await fetch(RELEASES_API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `SecurityMoon/${VERSION}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      const data = {
        available: false,
        releases: [],
        reason: `GitHub respondió con HTTP ${response.status}.`,
      };
      releaseCache = { at: Date.now(), data };
      return data;
    }
    const payload = await response.json();
    const releases = Array.isArray(payload)
      ? payload
          .filter((release) => !release.draft)
          .slice(0, 3)
          .map((release) => ({
            tag: release.tag_name,
            name: release.name || release.tag_name,
            publishedAt: release.published_at,
            url: release.html_url,
            body: release.body ?? '',
            prerelease: Boolean(release.prerelease),
          }))
      : [];
    const data = { available: true, releases, reason: null };
    releaseCache = { at: Date.now(), data };
    return data;
  } catch (error) {
    const data = {
      available: false,
      releases: [],
      reason: error.name === 'TimeoutError' ? 'Tiempo de espera agotado.' : 'Sin conexión con GitHub.',
    };
    releaseCache = { at: Date.now(), data };
    return data;
  }
}

export function releasesUrl() {
  return `${PROJECT.repository}/releases`;
}

export function issuesUrl() {
  return `${PROJECT.repository}/issues`;
}

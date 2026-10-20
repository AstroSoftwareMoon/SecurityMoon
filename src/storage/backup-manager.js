// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { copyFile, mkdir, readFile, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

/**
 * Gestiona copias de seguridad de los archivos JSON importantes.
 * Cada archivo conserva una copia "latest" y varias versionadas.
 */
export class BackupManager {
  constructor({
    backupRoot,
    logger = null,
    maxBackups = 5,
  } = {}) {
    if (!backupRoot) throw new Error('BackupManager requiere backupRoot.');
    this.backupRoot = path.resolve(backupRoot);
    this.logger = logger;
    this.maxBackups = Math.max(2, maxBackups);
  }

  async init() {
    await mkdir(this.backupRoot, { recursive: true });
  }

  latestPath(relativePath) {
    return path.join(this.backupRoot, `${relativePath}.bak`);
  }

  async backup(relativePath, sourcePath, { reason = 'pre-write' } = {}) {
    let info;
    try {
      info = await stat(sourcePath);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
    if (!info.isFile() || info.size === 0) return null;

    const latest = this.latestPath(relativePath);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const versioned = `${latest}.${stamp}-${process.pid}`;
    await mkdir(path.dirname(latest), { recursive: true });

    await copyFile(sourcePath, versioned);
    await copyFile(sourcePath, latest);
    await this.prune(relativePath);

    this.logger?.debug('Copia de seguridad creada', {
      file: relativePath,
      reason,
      bytes: info.size,
    });
    return latest;
  }

  async prune(relativePath) {
    const latest = this.latestPath(relativePath);
    const directory = path.dirname(latest);
    const base = path.basename(latest);
    const entries = await readdir(directory).catch(() => []);
    const versions = entries
      .filter((name) => name.startsWith(`${base}.`) && !name.endsWith('.tmp'))
      .sort()
      .reverse();
    for (const extra of versions.slice(this.maxBackups)) {
      await unlink(path.join(directory, extra)).catch(() => {});
    }
  }

  /**
   * Devuelve el contenido de la última copia válida, o null.
   * @param {string} relativePath
   */
  async readLatest(relativePath) {
    try {
      return await readFile(this.latestPath(relativePath), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      this.logger?.warn('No se pudo leer la copia de seguridad', {
        file: relativePath,
        error: error.message,
      });
      return null;
    }
  }

  async hasBackup(relativePath) {
    try {
      const info = await stat(this.latestPath(relativePath));
      return info.isFile();
    } catch {
      return false;
    }
  }
}

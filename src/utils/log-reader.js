// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { open, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

async function readTail(filePath, bytes = 2 * 1024 * 1024) {
  const info = await stat(filePath);
  const start = Math.max(0, info.size - bytes);
  const handle = await open(filePath, 'r');
  try {
    const length = info.size - start;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, start);
    return buffer.toString('utf8');
  } finally {
    await handle.close();
  }
}

function parseLines(text) {
  const entries = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Una línea incompleta por rotación no debe romper la lectura.
    }
  }
  return entries;
}

/**
 * Lee las entradas del registro global filtradas por servidor.
 * No devuelve entradas de otros servidores ni secretos (el logger ya los redacta).
 */
export async function readGuildLogEntries({ logFilePath, guildId, limit = 20 }) {
  if (!logFilePath) return [];
  const directory = path.dirname(logFilePath);
  let files = [];
  try {
    const entries = await readdir(directory);
    files = entries
      .filter((name) => name === path.basename(logFilePath) || /^security-.*\.json$/.test(name))
      .sort()
      .reverse()
      .slice(0, 3);
  } catch {
    return [];
  }

  const collected = [];
  for (const file of files) {
    try {
      const text = await readTail(path.join(directory, file));
      for (const entry of parseLines(text)) {
        if (entry?.context?.guildId === guildId) collected.push(entry);
      }
    } catch {
      // Archivo rotado o eliminado.
    }
    if (collected.length >= limit * 4) break;
  }
  return collected
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(-Math.max(1, Math.min(100, limit)))
    .reverse();
}

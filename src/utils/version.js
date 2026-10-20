// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { readFileSync } from 'node:fs';

let packageData = { version: '0.0.0', name: 'securitymoon' };
try {
  packageData = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
} catch {
  // Mantiene un valor seguro si package.json no está disponible.
}

export const VERSION = packageData.version;
export const PACKAGE_NAME = packageData.name;

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import path from 'node:path';
import { loadConfig } from './config.js';
import { loadCommands, commandData } from './utils/command-loader.js';
import { registerGlobalCommands } from './utils/command-registration.js';

async function main() {
  let config;
  try {
    config = await loadConfig();
  } catch (error) {
    console.error(`[SecurityMoon] ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const commands = await loadCommands(path.join(process.cwd(), 'src', 'commands'));
  const body = commandData(commands);

  console.log(`[SecurityMoon] Registrando ${body.length} comandos slash globales…`);
  try {
    const result = await registerGlobalCommands({
      token: config.token,
      clientId: config.clientId,
      body,
    });
    console.log(`[SecurityMoon] ${Array.isArray(result) ? result.length : body.length} comandos registrados correctamente.`);
    console.log('[SecurityMoon] Discord puede tardar unos minutos en mostrarlos en todos los servidores.');
  } catch (error) {
    console.error('[SecurityMoon] No se pudieron registrar los comandos.');
    console.error(`[SecurityMoon] ${error.message}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[SecurityMoon] Error inesperado al registrar comandos.');
  console.error(`[SecurityMoon] ${error.message}`);
  process.exitCode = 1;
});

// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { REST, Routes } from 'discord.js';

export async function registerGlobalCommands({ token, clientId, body }) {
  const rest = new REST({ version: '10' }).setToken(token);
  return rest.put(Routes.applicationCommands(clientId), { body });
}

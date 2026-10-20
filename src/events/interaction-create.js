// Soporte: https://discord.gg/eBszxvAuhN
// codigo fuente: https://github.com/AstroSoftwareMoon/SecurityMoon

import { Events } from 'discord.js';
import { handleInteraction } from '../interactions/router.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(client, interaction) {
  await handleInteraction(interaction);
}

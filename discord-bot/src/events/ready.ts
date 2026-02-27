import { Client, Events } from 'discord.js';

export function registerReadyEvent(client: Client) {
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`[discord] Bot logged in as ${readyClient.user.tag}`);
    console.log(`[discord] Connected to ${readyClient.guilds.cache.size} server(s):`);
    readyClient.guilds.cache.forEach((guild) => {
      console.log(`  - ${guild.name} (${guild.id})`);
    });
  });
}

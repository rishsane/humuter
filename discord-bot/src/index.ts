import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config';
import { registerReadyEvent } from './events/ready';
import { registerMessageCreateEvent } from './events/messageCreate';
import { registerGuildMemberAddEvent } from './events/guildMemberAdd';
import { startTelegramListeners } from './telegram/listener';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// Register event handlers
registerReadyEvent(client);
registerMessageCreateEvent(client);
registerGuildMemberAddEvent(client);

// Login
client.login(config.discordBotToken).catch((err) => {
  console.error('[discord] Failed to login:', err);
  process.exit(1);
});

// Start Telegram personal account listeners (if configured)
startTelegramListeners().catch((err) => {
  console.error('[tg-listener] Failed to start:', err);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[discord] Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[discord] Shutting down...');
  client.destroy();
  process.exit(0);
});

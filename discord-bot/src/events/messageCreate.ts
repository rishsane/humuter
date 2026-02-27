import { Client, Events, Message } from 'discord.js';
import { getAgentByServerId } from '../utils/agent-cache';
import { handleMessagePipeline } from '../handlers/message-pipeline';
import { handleSupervisorDm } from '../handlers/supervisor-dm';

export function registerMessageCreateEvent(client: Client) {
  client.on(Events.MessageCreate, async (message: Message) => {
    try {
      // Ignore bot messages (including self)
      if (message.author.bot) return;

      // DM — check if it's a supervisor replying
      if (!message.guild) {
        await handleSupervisorDm(message, client);
        return;
      }

      // Guild message — route through pipeline
      const agent = await getAgentByServerId(message.guild.id);
      if (!agent) return; // Bot is in server but no agent configured

      await handleMessagePipeline(message, agent, client);
    } catch (err) {
      console.error('[discord] Error in messageCreate:', err);
    }
  });
}

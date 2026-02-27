import { Client, Events, GuildMember, TextChannel } from 'discord.js';
import { getAgentByServerId } from '../utils/agent-cache';

export function registerGuildMemberAddEvent(client: Client) {
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      const agent = await getAgentByServerId(member.guild.id);
      if (!agent) return;

      const welcomeMessage = agent.training_data?.welcome_message;
      if (!welcomeMessage) return;

      // Try system channel, then first text channel named "general"
      const channel =
        member.guild.systemChannel ||
        member.guild.channels.cache.find(
          (ch) => ch.isTextBased() && ch.name === 'general'
        );

      if (!channel || !channel.isTextBased()) return;

      const text = `${welcomeMessage}\n\nWelcome, ${member.displayName}!`;
      await (channel as TextChannel).send(text);

      console.log(`[discord] Welcome sent for ${member.user.tag} in ${member.guild.name}`);
    } catch (err) {
      console.error('[discord] Error in guildMemberAdd:', err);
    }
  });
}

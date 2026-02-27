import { Client, Message } from 'discord.js';
import type { Agent } from '../shared/types/agent';
import { createServiceClient } from '../shared/supabase/service';

export async function handleEscalation(
  message: Message,
  agent: Agent,
  userQuestion: string,
  client: Client
) {
  const supabase = createServiceClient();

  console.log('[discord] Escalating to supervisor:', userQuestion.substring(0, 50));

  // Reply in channel
  await message.reply('Let me check with the team and get back to you on this.');

  if (!agent.discord_supervisor_user_id) return;

  try {
    // DM supervisor
    const supervisor = await client.users.fetch(agent.discord_supervisor_user_id);
    const forwardText = `New question from the server:\n\n"${userQuestion}"\n\nFrom: ${message.author.tag}\nChannel: #${(message.channel as { name?: string }).name || message.channel.id}\n\nReply to this message with:\n- Context/info → bot will reply in its own voice\n- /direct Your exact message → sent as-is\n- /ignore → skip, no reply sent`;

    const forwardedDm = await supervisor.send(forwardText);

    // Create escalation record
    await supabase.from('escalations').insert({
      agent_id: agent.id,
      group_chat_id: 0,
      original_message_id: 0,
      user_question: userQuestion,
      user_name: message.author.tag,
      forwarded_message_id: null,
      status: 'pending',
      source_platform: 'discord',
      discord_channel_id: message.channel.id,
      discord_message_id: message.id,
      discord_forwarded_message_id: forwardedDm.id,
    });

    console.log('[discord] Escalation forwarded to supervisor via DM');
  } catch (err) {
    console.error('[discord] Failed to DM supervisor:', err);
  }
}

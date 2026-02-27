import { Client, Message } from 'discord.js';
import { getAgentBySupervisorUserId } from '../utils/agent-cache';
import { createServiceClient } from '../shared/supabase/service';
import { generateResponse } from '../shared/ai/provider';
import { buildSystemPrompt } from '../shared/ai/system-prompt';

export async function handleSupervisorDm(message: Message, client: Client) {
  // Check if the DM author is a supervisor for any agent
  const agent = await getAgentBySupervisorUserId(message.author.id);
  if (!agent) return; // Not a supervisor — ignore DM

  const supabase = createServiceClient();
  const agentId = agent.id;
  const replyText = message.content?.trim();
  if (!replyText) return;

  // Check if replying to a forwarded escalation
  let escalation = null;

  if (message.reference?.messageId) {
    // Replying to a specific message — look up by discord_forwarded_message_id
    const { data } = await supabase
      .from('escalations')
      .select('*')
      .eq('agent_id', agentId)
      .eq('discord_forwarded_message_id', message.reference.messageId)
      .eq('status', 'pending')
      .single();
    escalation = data;
  }

  if (!escalation) {
    // Fallback: most recent pending escalation for this agent
    const { data } = await supabase
      .from('escalations')
      .select('*')
      .eq('agent_id', agentId)
      .eq('source_platform', 'discord')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    escalation = data;
  }

  if (!escalation) {
    await message.reply('No pending escalations to respond to.');
    return;
  }

  const lowerReply = replyText.toLowerCase();

  // Option 1: /ignore
  if (lowerReply === '/ignore' || lowerReply === 'ignore') {
    await supabase
      .from('escalations')
      .update({
        admin_reply: '[ignored]',
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', escalation.id);

    await message.reply('Got it — question ignored, no reply sent to the server.');
    console.log('[discord] Escalation ignored by supervisor:', escalation.id);
    return;
  }

  // Option 2: /direct <message>
  if (lowerReply.startsWith('/direct ')) {
    const directMessage = replyText.substring(8).trim();
    if (!directMessage) return;

    try {
      const channel = await client.channels.fetch(escalation.discord_channel_id);
      if (channel && channel.isTextBased() && 'send' in channel) {
        // Reply to the original message
        const originalMsg = await (channel as { messages: { fetch: (id: string) => Promise<Message> } }).messages.fetch(
          escalation.discord_message_id
        );
        await originalMsg.reply(directMessage.length > 2000 ? directMessage.substring(0, 1997) + '...' : directMessage);
      }
    } catch {
      console.log('[discord] Failed to send direct reply to channel');
    }

    await supabase
      .from('escalations')
      .update({
        admin_reply: directMessage,
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', escalation.id);

    // Save as FAQ
    const newFaqEntry = `Q: ${escalation.user_question}\nA: ${directMessage}`;
    const existingFaqs = agent.training_data?.faq_items || '';
    const updatedFaqs = existingFaqs ? `${existingFaqs}\n\n${newFaqEntry}` : newFaqEntry;
    await supabase
      .from('agents')
      .update({ training_data: { ...agent.training_data, faq_items: updatedFaqs } })
      .eq('id', agentId);

    await message.reply('Your exact message was sent to the channel and saved as training data.');
    console.log('[discord] Direct reply sent for escalation', escalation.id);
    return;
  }

  // Option 3 (default): Context-based reply
  const contextPrompt = `A user asked: "${escalation.user_question}"\n\nYou didn't know the answer before, but the supervisor has now provided this context:\n"${replyText}"\n\nUsing this context, write a helpful reply to the user in your normal tone and style. Do NOT mention the supervisor or that you had to check with someone. Just answer naturally as if you knew it all along.`;

  const provider = agent.llm_provider ?? undefined;
  const systemPrompt = buildSystemPrompt(agent);
  const { text: generatedReply } = await generateResponse(systemPrompt, contextPrompt, { provider });
  let finalReply = generatedReply.trim();

  if (finalReply && finalReply !== 'SKIP' && finalReply !== 'DELETE' && finalReply !== 'ESCALATE') {
    if (finalReply.length > 2000) {
      finalReply = finalReply.substring(0, 1997) + '...';
    }

    try {
      const channel = await client.channels.fetch(escalation.discord_channel_id);
      if (channel && channel.isTextBased() && 'send' in channel) {
        const originalMsg = await (channel as { messages: { fetch: (id: string) => Promise<Message> } }).messages.fetch(
          escalation.discord_message_id
        );
        await originalMsg.reply(finalReply);
      }
    } catch {
      console.log('[discord] Failed to send context-based reply to channel');
    }
  }

  // Mark resolved
  await supabase
    .from('escalations')
    .update({
      admin_reply: `[context: ${replyText}] → ${finalReply}`,
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', escalation.id);

  // Save as FAQ
  const newFaqEntry = `Q: ${escalation.user_question}\nA: ${finalReply}`;
  const existingFaqs = agent.training_data?.faq_items || '';
  const updatedFaqs = existingFaqs ? `${existingFaqs}\n\n${newFaqEntry}` : newFaqEntry;
  await supabase
    .from('agents')
    .update({ training_data: { ...agent.training_data, faq_items: updatedFaqs } })
    .eq('id', agentId);

  await message.reply(`Bot replied to the channel using your context:\n\n"${finalReply.substring(0, 500)}"\n\nSaved as training data.`);
  console.log('[discord] Context-based reply sent for escalation', escalation.id);
}

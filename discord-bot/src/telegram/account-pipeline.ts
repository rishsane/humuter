import { TelegramClient, Api } from 'telegram';
import type { Agent } from '../shared/types/agent';
import { createServiceClient } from '../shared/supabase/service';
import { generateResponse } from '../shared/ai/provider';
import { buildSystemPrompt } from '../shared/ai/system-prompt';
import { TOKEN_LIMITS } from '../shared/constants/pricing';
import { isSpamMessage } from '../shared/utils/spam-detection';

// Random delay between 30-60 seconds to look natural
function humanDelay(): Promise<void> {
  const delay = 30_000 + Math.floor(Math.random() * 30_000);
  console.log(`[tg-account] Waiting ${Math.round(delay / 1000)}s before replying...`);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// Helper to send message — uses message.respond() to avoid entity resolution issues
async function sendReply(message: Api.Message, text: string) {
  await message.respond({ message: text });
}

export async function handleTelegramAccountMessage(
  client: TelegramClient,
  message: Api.Message,
  agent: Agent
) {
  const supabase = createServiceClient();
  const agentId = agent.id;

  // Skip outgoing messages (messages sent by the logged-in account itself)
  if (message.out) return;

  // Get peer info
  const chatId = message.chatId?.toJSNumber?.() ?? Number(message.chatId);
  if (!chatId) return;

  // Determine if it's a group or private chat
  const isGroup = message.isGroup || message.isChannel;
  const isPrivateChat = !isGroup;

  // Get sender info
  const senderId = message.senderId?.toJSNumber?.() ?? Number(message.senderId);

  const text = message.text?.trim();
  if (!text) return;

  console.log('[tg-account] Message from chat', chatId, 'sender:', senderId, 'isGroup:', isGroup, 'isPrivate:', isPrivateChat, 'text:', text.substring(0, 50));

  // Group whitelist check
  const allowedGroups = agent.allowed_group_ids;
  if (isGroup && allowedGroups && allowedGroups.length > 0) {
    if (!allowedGroups.includes(chatId)) {
      console.log('[tg-account] SKIP: group not whitelisted', chatId);
      return;
    }
  }

  // Personal accounts respond to all DMs (unlike bot mode which restricts to supervisor-only)
  console.log('[tg-account] Passed whitelist checks, proceeding. supervisor:', agent.reporting_human_chat_id, 'senderId:', senderId);

  // Spam detection — auto-delete in groups
  if (isGroup && isSpamMessage(text)) {
    console.log('[tg-account] Spam detected:', text.substring(0, 80));
    try {
      await client.deleteMessages(chatId, [message.id], { revoke: true });
    } catch {
      console.log('[tg-account] Failed to delete spam (missing permissions)');
    }
    return;
  }

  // Check if sender is the supervisor
  const isSupervisor = agent.reporting_human_chat_id && senderId === Number(agent.reporting_human_chat_id);

  // --- ADMIN DM REPLY HANDLING ---
  if (isPrivateChat && isSupervisor && text) {
    const replyToMsgId = message.replyTo?.replyToMsgId;
    let escalation = null;

    if (replyToMsgId) {
      const { data } = await supabase
        .from('escalations')
        .select('*')
        .eq('agent_id', agentId)
        .eq('forwarded_message_id', replyToMsgId)
        .eq('status', 'pending')
        .single();
      escalation = data;
    }

    if (!escalation) {
      const { data } = await supabase
        .from('escalations')
        .select('*')
        .eq('agent_id', agentId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      escalation = data;
    }

    if (escalation) {
      const adminReply = text.trim();
      const lowerReply = adminReply.toLowerCase();

      if (lowerReply === '/ignore' || lowerReply === 'ignore') {
        await supabase
          .from('escalations')
          .update({
            admin_reply: '[ignored]',
            status: 'resolved',
            resolved_at: new Date().toISOString(),
          })
          .eq('id', escalation.id);
        await sendReply(message, 'Got it — question ignored, no reply sent to the group.');
        return;
      }

      if (lowerReply.startsWith('/direct ')) {
        const directMessage = adminReply.substring(8).trim();
        if (directMessage) {
          try {
            await client.sendMessage(escalation.group_chat_id, {
              message: directMessage,
              replyTo: escalation.original_message_id,
            });
          } catch (err) {
            console.log('[tg-account] Failed to send direct reply to group:', err instanceof Error ? err.message : err);
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

          await sendReply(message, 'Your exact message was sent to the group and saved as training data.');
          return;
        }
      }

      // Default: context-based reply
      const contextPrompt = `A user asked: "${escalation.user_question}"\n\nYou didn't know the answer before, but the supervisor has now provided this context:\n"${adminReply}"\n\nUsing this context, write a helpful reply to the user in your normal tone and style. Do NOT mention the supervisor or that you had to check with someone. Just answer naturally as if you knew it all along.`;
      const provider = agent.llm_provider ?? undefined;
      const systemPrompt = buildSystemPrompt(agent);
      const { text: generatedReply } = await generateResponse(systemPrompt, contextPrompt, { provider });
      const finalReply = generatedReply.trim();

      if (finalReply && finalReply !== 'SKIP' && finalReply !== 'DELETE' && finalReply !== 'ESCALATE') {
        try {
          await client.sendMessage(escalation.group_chat_id, {
            message: finalReply,
            replyTo: escalation.original_message_id,
          });
        } catch (err) {
          console.log('[tg-account] Failed to send context reply to group:', err instanceof Error ? err.message : err);
        }
      }

      await supabase
        .from('escalations')
        .update({
          admin_reply: `[context: ${adminReply}] → ${finalReply}`,
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', escalation.id);

      const newFaqEntry = `Q: ${escalation.user_question}\nA: ${finalReply}`;
      const existingFaqs = agent.training_data?.faq_items || '';
      const updatedFaqs = existingFaqs ? `${existingFaqs}\n\n${newFaqEntry}` : newFaqEntry;
      await supabase
        .from('agents')
        .update({ training_data: { ...agent.training_data, faq_items: updatedFaqs } })
        .eq('id', agentId);

      await sendReply(message, `Bot replied to the group using your context:\n\n"${finalReply.substring(0, 500)}"\n\nSaved as training data.`);
      return;
    }
  }

  // --- NORMAL MESSAGE HANDLING ---
  const userMessage = text;

  // Free tier rate limiting
  if (agent.plan === 'free') {
    const monthlyUsed = agent.messages_handled ?? 0;
    if (monthlyUsed >= 10) return;

    const today = new Date().toISOString().slice(0, 10);
    let dailyCount = agent.daily_message_count ?? 0;
    if (agent.daily_message_date !== today) {
      dailyCount = 0;
      await supabase.from('agents').update({ daily_message_count: 0, daily_message_date: today }).eq('id', agentId);
    }
    if (isGroup && dailyCount >= 2) return;
  }

  // Token limit check
  const tokenLimit = TOKEN_LIMITS[agent.plan] || TOKEN_LIMITS.free;
  if ((agent.tokens_used ?? 0) >= tokenLimit) {
    console.log('[tg-account] Token limit exhausted for agent', agentId);
    await humanDelay();
    await sendReply(message, 'This agent has reached its monthly usage limit. Please contact the admin to upgrade the plan.');
    return;
  }

  let systemPrompt = buildSystemPrompt(agent);

  if (isPrivateChat) {
    systemPrompt += '\n\nIMPORTANT: This is a private/DM conversation. NEVER reply with "SKIP". Always respond to every message, including greetings like "hi" or "hello". The SKIP rule only applies to group chats.';
  }

  if (isSupervisor) {
    systemPrompt += '\n\nCRITICAL: You are currently talking to the PROJECT OWNER / SUPERVISOR — the person who deployed and manages you. You report to them. Do NOT treat them like a regular community member. Do NOT say "I\'ll forward this to my supervisor" — THEY ARE the supervisor. Never respond with SKIP, DELETE, or ESCALATE to them. Be direct, helpful, and give them status updates, summaries, and collected feedback when they ask. They have full authority over you.';
  }

  if (agent.reporting_human_chat_id && !isSupervisor) {
    systemPrompt += '\n\nFEEDBACK COLLECTION: When a user shares feedback, suggestions, complaints, or feature requests about the project, respond to them normally AND add a tag at the very end of your response on a new line: [FEEDBACK: brief summary of the feedback]. This tag will be automatically forwarded to the supervisor. Only use this tag for genuine feedback/suggestions, not for regular questions.';
  }

  const provider = agent.llm_provider ?? undefined;
  let { text: replyText, tokensUsed } = await generateResponse(systemPrompt, userMessage, { provider });
  let trimmedReply = replyText.trim();

  // Never skip/delete supervisor or DM messages
  if ((isSupervisor || isPrivateChat) && (trimmedReply === 'SKIP' || trimmedReply === 'DELETE' || trimmedReply === 'ESCALATE')) {
    const retry = await generateResponse(
      systemPrompt + '\n\nDo NOT reply with SKIP, DELETE, or ESCALATE. Give a normal, friendly, helpful response.',
      userMessage,
      { provider }
    );
    trimmedReply = retry.text.trim();
    tokensUsed += retry.tokensUsed;
    if (trimmedReply === 'SKIP' || trimmedReply === 'DELETE' || trimmedReply === 'ESCALATE') {
      trimmedReply = isSupervisor ? 'Hey! How can I help you today?' : 'Hi there! How can I help you?';
    }
  }

  // Self-escalation detection
  let isSelfEscalation = false;
  if (agent.reporting_human_chat_id && !isSupervisor && trimmedReply !== 'ESCALATE' && trimmedReply !== 'SKIP' && trimmedReply !== 'DELETE') {
    const lower = trimmedReply.toLowerCase();
    const selfEscalationPatterns = [
      'let me check with the team', "i'll get back to you", 'i will get back to you',
      'let me ask the team', "i'll check with", 'i will check with',
      "i'll forward this", 'i will forward this', 'let me escalate',
    ];
    isSelfEscalation = selfEscalationPatterns.some(p => lower.includes(p));
  }

  if (trimmedReply === 'ESCALATE' && agent.reporting_human_chat_id && !isSupervisor) {
    // Escalate to supervisor
    await humanDelay();
    await sendReply(message, 'Let me check with the team and get back to you on this.');

    const senderEntity = await message.getSender();
    const senderName = senderEntity && 'firstName' in senderEntity ? (senderEntity as Api.User).firstName : 'Unknown';
    const senderUsername = senderEntity && 'username' in senderEntity ? (senderEntity as Api.User).username : null;

    const forwardText = `New question from the group:\n\n"${userMessage}"\n\nFrom: ${senderName}${senderUsername ? ` (@${senderUsername})` : ''}\n\nReply to this message with:\n• Context/info → bot will reply in its own voice\n• /direct Your exact message → sent as-is\n• /ignore → skip, no reply sent`;

    try {
      const forwardedMsg = await client.sendMessage(Number(agent.reporting_human_chat_id), { message: forwardText });

      await supabase.from('escalations').insert({
        agent_id: agentId,
        group_chat_id: chatId,
        original_message_id: message.id,
        user_question: userMessage,
        user_name: senderName,
        forwarded_message_id: forwardedMsg.id,
        status: 'pending',
      });
    } catch (err) {
      console.log('[tg-account] Failed to forward escalation to supervisor:', err instanceof Error ? err.message : err);
    }
  } else if (trimmedReply === 'DELETE' && agent.auto_moderate !== false) {
    if (isGroup) {
      try {
        await client.deleteMessages(chatId, [message.id], { revoke: true });
      } catch {
        console.log('[tg-account] Failed to delete flagged message');
      }
    }
  } else if (trimmedReply !== 'SKIP' && trimmedReply !== 'DELETE' && trimmedReply !== 'ESCALATE') {
    // Extract feedback
    let feedbackContent: string | null = null;
    const feedbackMatch = trimmedReply.match(/\[FEEDBACK:\s*([^\]]+)\]\s*$/);
    if (feedbackMatch) {
      feedbackContent = feedbackMatch[1].trim();
      trimmedReply = trimmedReply.replace(/\n?\[FEEDBACK:\s*[^\]]+\]\s*$/, '').trim();
    }

    await humanDelay();
    await sendReply(message, trimmedReply);

    // Forward feedback to supervisor
    if (feedbackContent && agent.reporting_human_chat_id && !isSupervisor) {
      const senderEntity = await message.getSender();
      const senderName = senderEntity && 'firstName' in senderEntity ? (senderEntity as Api.User).firstName : 'Unknown';
      const feedbackText = `Feedback collected:\n\n"${feedbackContent}"\n\nFrom: ${senderName}\nOriginal message: "${userMessage.substring(0, 300)}"`;
      try {
        await client.sendMessage(Number(agent.reporting_human_chat_id), { message: feedbackText });
      } catch (err) {
        console.log('[tg-account] Failed to forward feedback to supervisor:', err instanceof Error ? err.message : err);
      }
    }

    // Self-escalation handling
    if (isSelfEscalation && agent.reporting_human_chat_id) {
      const senderEntity = await message.getSender();
      const senderName = senderEntity && 'firstName' in senderEntity ? (senderEntity as Api.User).firstName : 'Unknown';
      const forwardText = `Bot handled this but may need correction:\n\n"${userMessage}"\n\nFrom: ${senderName}\n\nBot replied: "${trimmedReply.substring(0, 500)}"\n\nReply with:\n• Context/info → bot sends a corrected reply\n• /direct Your exact message → sent as-is\n• /ignore → no correction needed`;
      try {
        const forwardedMsg = await client.sendMessage(Number(agent.reporting_human_chat_id), { message: forwardText });

        await supabase.from('escalations').insert({
          agent_id: agentId,
          group_chat_id: chatId,
          original_message_id: message.id,
          user_question: userMessage,
          user_name: senderName,
          forwarded_message_id: forwardedMsg.id,
          status: 'pending',
        });
      } catch (err) {
        console.log('[tg-account] Failed to forward self-escalation to supervisor:', err instanceof Error ? err.message : err);
      }
    }
  }

  // Increment counters
  await supabase.rpc('increment_messages_handled', { agent_row_id: agentId, count: 1 });
  await supabase.rpc('increment_tokens_used', { agent_row_id: agentId, count: tokensUsed });
  await supabase.rpc('increment_daily_message_count', { agent_row_id: agentId });
}

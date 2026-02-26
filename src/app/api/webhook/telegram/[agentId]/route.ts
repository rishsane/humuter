import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateResponse } from '@/lib/ai/provider';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { TOKEN_LIMITS } from '@/lib/constants/pricing';
import type { Agent } from '@/lib/types/agent';

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type: string };
  text?: string;
  new_chat_members?: TelegramUser[];
  reply_to_message?: { message_id: number; from?: { id: number; is_bot?: boolean } };
  entities?: { type: string; offset: number; length: number }[];
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyToMessageId?: number
) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_to_message_id: replyToMessageId,
    }),
  });
}

async function deleteTelegramMessage(botToken: string, chatId: number, messageId: number) {
  const url = `https://api.telegram.org/bot${botToken}/deleteMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  });
  if (!res.ok) {
    console.log('[webhook] Failed to delete message (bot may not be admin):', messageId);
  }
}

async function getBotInfo(botToken: string): Promise<{ id: number; username: string } | null> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.ok ? { id: data.result.id, username: data.result.username } : null;
}

function isBotMentioned(
  message: TelegramMessage,
  botUsername: string
): boolean {
  if (!message.text || !message.entities) return false;
  return message.entities.some(
    (e) =>
      e.type === 'mention' &&
      message.text!.substring(e.offset, e.offset + e.length).toLowerCase() ===
        `@${botUsername.toLowerCase()}`
  );
}

function isReplyToBot(message: TelegramMessage, botId: number): boolean {
  return message.reply_to_message?.from?.id === botId;
}

function isSpamMessage(text: string): boolean {
  const lower = text.toLowerCase();

  // Asks for private keys, seed phrases, or wallet credentials
  const keyPatterns = [
    /\b(private\s*key|seed\s*phrase|secret\s*phrase|recovery\s*phrase|mnemonic)\b/i,
    /\b(send|share|enter|give|submit|verify)\s+(your\s+)?(wallet|keys?|phrase|password|credentials?)\b/i,
    /\b(connect|validate|verify|sync)\s+(your\s+)?wallet\b/i,
  ];

  // Suspicious DM solicitation
  const dmPatterns = [
    /\b(dm|pm|message)\s+me\b/i,
    /\bsend\s+(me\s+)?a?\s*(dm|pm|message)\b/i,
    /\bcheck\s+(your\s+)?(dm|pm|inbox)\b/i,
  ];

  // Spam links (common scam TLDs, shortened URLs, known patterns)
  const linkPatterns = [
    /https?:\/\/[^\s]*\.(xyz|tk|ml|ga|cf|gq|top|buzz|club|icu|monster|rest)\b/i,
    /https?:\/\/(bit\.ly|tinyurl|t\.co|is\.gd|rb\.gy|shorturl|cutt\.ly)\//i,
    /\b(claim|airdrop|free\s*tokens?|earn\s*\$|guaranteed\s*(profit|return))\b.*https?:\/\//i,
    /https?:\/\/[^\s]*(claim|airdrop|reward|bonus|prize|giveaway)[^\s]*/i,
  ];

  for (const p of keyPatterns) if (p.test(lower)) return true;
  for (const p of dmPatterns) if (p.test(text)) return true;
  for (const p of linkPatterns) if (p.test(text)) return true;

  return false;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    const supabase = createServiceClient();
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single<Agent>();

    if (agentError || !agent || !agent.telegram_bot_token) {
      console.error('[webhook] Agent lookup failed:', agentError?.message || 'No agent or no bot token');
      return NextResponse.json({ ok: true });
    }

    const botToken = agent.telegram_bot_token;
    const botInfo = await getBotInfo(botToken);
    if (!botInfo) {
      console.error('[webhook] getBotInfo failed');
      return NextResponse.json({ ok: true });
    }

    const update: TelegramUpdate = await request.json();
    const message = update.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const isGroup =
      message.chat.type === 'group' || message.chat.type === 'supergroup';
    const isPrivateChat = message.chat.type === 'private';

    console.log('[webhook] Message from chat', chatId, 'type:', message.chat.type, 'text:', message.text?.substring(0, 50));

    // Group whitelist check — if allowed_group_ids is set, only respond in those groups
    const allowedGroups = agent.allowed_group_ids;
    if (isGroup && allowedGroups && allowedGroups.length > 0) {
      if (!allowedGroups.includes(chatId)) {
        console.log('[webhook] Group not whitelisted, ignoring:', chatId);
        return NextResponse.json({ ok: true });
      }
    }

    // DM whitelist — if allowed_group_ids is set, only respond to supervisor in DMs
    if (isPrivateChat && allowedGroups && allowedGroups.length > 0) {
      const isSupervisorDm = agent.reporting_human_chat_id && message.from?.id === agent.reporting_human_chat_id;
      if (!isSupervisorDm) {
        console.log('[webhook] DM from non-supervisor, ignoring:', message.from?.id);
        return NextResponse.json({ ok: true });
      }
    }

    // Handle new members
    if (message.new_chat_members && message.new_chat_members.length > 0) {
      const nonBotMembers = message.new_chat_members.filter(
        (m) => m.id !== botInfo.id
      );
      if (nonBotMembers.length > 0 && agent.training_data.welcome_message) {
        const names = nonBotMembers
          .map((m) => m.first_name)
          .join(', ');
        const welcomeText = `${agent.training_data.welcome_message}\n\nWelcome, ${names}!`;
        await sendTelegramMessage(botToken, chatId, welcomeText);
      }
      return NextResponse.json({ ok: true });
    }

    // Skip if no text
    if (!message.text) {
      return NextResponse.json({ ok: true });
    }

    // In groups, skip messages from the bot itself
    if (isGroup && message.from?.id === botInfo.id) {
      return NextResponse.json({ ok: true });
    }

    // Auto-delete spam / scam messages
    if (isGroup && isSpamMessage(message.text)) {
      console.log('[webhook] Spam detected, deleting:', message.text.substring(0, 80));
      await deleteTelegramMessage(botToken, chatId, message.message_id);
      return NextResponse.json({ ok: true });
    }

    // --- ADMIN DM REPLY HANDLING ---
    if (
      isPrivateChat &&
      agent.reporting_human_chat_id &&
      message.from?.id === agent.reporting_human_chat_id &&
      message.text
    ) {
      // Check if admin replied to a forwarded escalation message
      const replyToMsgId = message.reply_to_message?.from?.id === botInfo.id
        ? message.reply_to_message.message_id
        : undefined;

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
        // Fallback: most recent pending escalation
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
        const adminReply = message.text.trim();
        const lowerReply = adminReply.toLowerCase();

        // Option 1: /ignore — skip this question, don't reply to group
        if (lowerReply === '/ignore' || lowerReply === 'ignore') {
          await supabase
            .from('escalations')
            .update({
              admin_reply: '[ignored]',
              status: 'resolved',
              resolved_at: new Date().toISOString(),
            })
            .eq('id', escalation.id);

          await sendTelegramMessage(botToken, chatId, 'Got it — question ignored, no reply sent to the group.');
          console.log('[webhook] Escalation ignored by supervisor:', escalation.id);
          return NextResponse.json({ ok: true });
        }

        // Option 2: /direct <message> — send verbatim reply to group
        if (lowerReply.startsWith('/direct ')) {
          const directMessage = adminReply.substring(8).trim();
          if (directMessage) {
            await sendTelegramMessage(
              botToken,
              escalation.group_chat_id,
              directMessage,
              escalation.original_message_id
            );

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

            await sendTelegramMessage(botToken, chatId, 'Your exact message was sent to the group and saved as training data.');
            console.log('[webhook] Direct reply sent for escalation', escalation.id);
            return NextResponse.json({ ok: true });
          }
        }

        // Option 3 (default): Supervisor provides context — bot generates reply in its own voice
        const contextPrompt = `A user asked: "${escalation.user_question}"\n\nYou didn't know the answer before, but the supervisor has now provided this context:\n"${adminReply}"\n\nUsing this context, write a helpful reply to the user in your normal tone and style. Do NOT mention the supervisor or that you had to check with someone. Just answer naturally as if you knew it all along.`;

        const provider = agent.llm_provider ?? undefined;
        const systemPrompt = buildSystemPrompt(agent);
        const { text: generatedReply } = await generateResponse(systemPrompt, contextPrompt, { provider });
        const finalReply = generatedReply.trim();

        // Send bot-generated reply to group
        if (finalReply && finalReply !== 'SKIP' && finalReply !== 'DELETE' && finalReply !== 'ESCALATE') {
          await sendTelegramMessage(
            botToken,
            escalation.group_chat_id,
            finalReply,
            escalation.original_message_id
          );
        }

        // Mark resolved
        await supabase
          .from('escalations')
          .update({
            admin_reply: `[context: ${adminReply}] → ${finalReply}`,
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

        // Confirm to supervisor
        await sendTelegramMessage(botToken, chatId, `Bot replied to the group using your context:\n\n"${finalReply.substring(0, 500)}"\n\nSaved as training data.`);

        console.log('[webhook] Context-based reply sent for escalation', escalation.id);
        return NextResponse.json({ ok: true });
      }
    }

    // Reply instantly to all messages (mentions, replies, DMs, and group messages)
    let userMessage = message.text;

    // Strip bot mention if present
    const mentioned = isBotMentioned(message, botInfo.username);
    if (mentioned) {
      userMessage = userMessage.replace(
        new RegExp(`@${botInfo.username}`, 'gi'),
        ''
      ).trim();
    }

    if (!userMessage) {
      return NextResponse.json({ ok: true });
    }

    // Free tier rate limiting: 2 group messages/day, 10 total/month
    if (agent.plan === 'free') {
      const monthlyUsed = agent.messages_handled ?? 0;
      if (monthlyUsed >= 10) {
        console.log('[webhook] Free tier monthly limit reached for agent', agentId);
        return NextResponse.json({ ok: true });
      }

      const today = new Date().toISOString().slice(0, 10);
      let dailyCount = agent.daily_message_count ?? 0;
      if (agent.daily_message_date !== today) {
        dailyCount = 0;
        await supabase.from('agents').update({ daily_message_count: 0, daily_message_date: today }).eq('id', agentId);
      }

      if (isGroup && dailyCount >= 2) {
        console.log('[webhook] Free tier daily group limit reached for agent', agentId);
        return NextResponse.json({ ok: true });
      }
    }

    // Universal token limit check — all plans
    const tokenLimit = TOKEN_LIMITS[agent.plan] || TOKEN_LIMITS.free;
    if ((agent.tokens_used ?? 0) >= tokenLimit) {
      console.log('[webhook] Token limit exhausted for agent', agentId, 'plan:', agent.plan);
      await sendTelegramMessage(
        botToken,
        chatId,
        'This agent has reached its monthly usage limit. Please contact the admin to upgrade the plan.',
        message.message_id
      );
      return NextResponse.json({ ok: true });
    }

    const isSupervisor = agent.reporting_human_chat_id && message.from?.id === agent.reporting_human_chat_id;

    console.log('[webhook] Replying to:', userMessage.substring(0, 50), isSupervisor ? '(supervisor)' : '');
    let systemPrompt = buildSystemPrompt(agent);
    if (isSupervisor) {
      systemPrompt += '\n\nIMPORTANT: This message is from the project owner/supervisor. Always reply to them — never respond with SKIP, DELETE, or ESCALATE. Treat their messages with priority and respond helpfully.';
    }
    const provider = agent.llm_provider ?? undefined;
    let { text: replyText, tokensUsed } = await generateResponse(systemPrompt, userMessage, {
      provider,
    });

    let trimmedReply = replyText.trim();

    // Never skip or delete supervisor messages
    if (isSupervisor && (trimmedReply === 'SKIP' || trimmedReply === 'DELETE' || trimmedReply === 'ESCALATE')) {
      // Regenerate without action keywords
      const retry = await generateResponse(
        systemPrompt + '\n\nDo NOT reply with SKIP, DELETE, or ESCALATE. Give a normal, helpful response.',
        userMessage,
        { provider }
      );
      trimmedReply = retry.text.trim();
      tokensUsed += retry.tokensUsed;
    }

    // Detect if the AI tried to handle escalation naturally instead of returning ESCALATE
    let isSelfEscalation = false;
    if (agent.reporting_human_chat_id && trimmedReply !== 'ESCALATE' && trimmedReply !== 'SKIP' && trimmedReply !== 'DELETE') {
      const lower = trimmedReply.toLowerCase();
      const selfEscalationPatterns = [
        'let me check with the team',
        'i\'ll get back to you',
        'i will get back to you',
        'let me ask the team',
        'i\'ll check with',
        'i will check with',
        'i\'ll forward this',
        'i will forward this',
        'let me escalate',
      ];
      isSelfEscalation = selfEscalationPatterns.some(p => lower.includes(p));
    }

    if (trimmedReply === 'ESCALATE' && agent.reporting_human_chat_id) {
      // AI doesn't know the answer — escalate to reporting human
      console.log('[webhook] Escalating to reporting human:', userMessage.substring(0, 50));
      await sendTelegramMessage(botToken, chatId, 'Let me check with the team and get back to you on this.', message.message_id);

      // Forward question to reporting human via DM
      const forwardText = `New question from the group:\n\n"${userMessage}"\n\nFrom: ${message.from?.first_name || 'Unknown'}${message.from?.username ? ` (@${message.from.username})` : ''}\n\nReply to this message with:\n• Context/info → bot will reply in its own voice\n• /direct Your exact message → sent as-is\n• /ignore → skip, no reply sent`;
      const forwardRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: agent.reporting_human_chat_id, text: forwardText }),
      });
      const forwardData = await forwardRes.json();
      const forwardedMessageId = forwardData.ok ? forwardData.result.message_id : null;

      // Create escalation record
      await supabase.from('escalations').insert({
        agent_id: agentId,
        group_chat_id: chatId,
        original_message_id: message.message_id,
        user_question: userMessage,
        user_name: message.from?.first_name || message.from?.username || null,
        forwarded_message_id: forwardedMessageId,
        status: 'pending',
      });
    } else if (trimmedReply === 'DELETE' && agent.auto_moderate !== false) {
      // AI flagged this message as FUD/spam — delete it
      console.log('[webhook] AI flagged for deletion:', userMessage.substring(0, 50));
      if (isGroup) {
        await deleteTelegramMessage(botToken, chatId, message.message_id);
      }
    } else if (trimmedReply !== 'SKIP' && trimmedReply !== 'DELETE' && trimmedReply !== 'ESCALATE') {
      console.log('[webhook] Sending reply:', trimmedReply.substring(0, 50));
      await sendTelegramMessage(botToken, chatId, trimmedReply, message.message_id);

      // If the AI handled escalation naturally, also DM the supervisor
      if (isSelfEscalation && agent.reporting_human_chat_id) {
        console.log('[webhook] Self-escalation detected, forwarding to supervisor:', userMessage.substring(0, 50));
        const forwardText = `Bot handled this but may need correction:\n\n"${userMessage}"\n\nFrom: ${message.from?.first_name || 'Unknown'}${message.from?.username ? ` (@${message.from.username})` : ''}\n\nBot replied: "${trimmedReply}"\n\nReply with:\n• Context/info → bot sends a corrected reply\n• /direct Your exact message → sent as-is\n• /ignore → no correction needed`;
        const forwardRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: agent.reporting_human_chat_id, text: forwardText }),
        });
        const forwardData = await forwardRes.json();
        const forwardedMessageId = forwardData.ok ? forwardData.result.message_id : null;

        await supabase.from('escalations').insert({
          agent_id: agentId,
          group_chat_id: chatId,
          original_message_id: message.message_id,
          user_question: userMessage,
          user_name: message.from?.first_name || message.from?.username || null,
          forwarded_message_id: forwardedMessageId,
          status: 'pending',
        });
      }
    }

    // Increment message + token counters
    await supabase.rpc('increment_messages_handled', { agent_row_id: agentId, count: 1 });
    await supabase.rpc('increment_tokens_used', { agent_row_id: agentId, count: tokensUsed });

    // Increment daily counter for free tier tracking
    await supabase.rpc('increment_daily_message_count', { agent_row_id: agentId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhook] Error:', err instanceof Error ? err.message : err);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateResponse } from '@/lib/ai/provider';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
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
  reply_to_message?: { from?: { id: number; is_bot?: boolean } };
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

    console.log('[webhook] Message from chat', chatId, 'type:', message.chat.type, 'text:', message.text?.substring(0, 50));

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

    // Check if bot was mentioned or replied to
    const mentioned = isBotMentioned(message, botInfo.username);
    const replied = isReplyToBot(message, botInfo.id);

    if (mentioned || replied || !isGroup) {
      // INSTANT REPLY — bot was mentioned, replied to, or it's a DM
      let userMessage = message.text;
      userMessage = userMessage.replace(
        new RegExp(`@${botInfo.username}`, 'gi'),
        ''
      ).trim();

      if (!userMessage) {
        return NextResponse.json({ ok: true });
      }

      console.log('[webhook] Instant reply for:', userMessage.substring(0, 50));
      const systemPrompt = buildSystemPrompt(agent);
      const provider = agent.llm_provider ?? undefined;
      const reply = await generateResponse(systemPrompt, userMessage, {
        provider,
      });

      console.log('[webhook] Sending reply:', reply.substring(0, 50));
      await sendTelegramMessage(botToken, chatId, reply, message.message_id);
    } else {
      // QUEUE — store for batch processing every 30 minutes
      console.log('[webhook] Queuing message for batch processing');
      await supabase.from('message_queue').insert({
        agent_id: agentId,
        chat_id: String(chatId),
        user_name: message.from?.first_name || 'Unknown',
        message_text: message.text,
        message_id: message.message_id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhook] Error:', err instanceof Error ? err.message : err);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}

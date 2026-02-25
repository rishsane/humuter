import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateResponse } from '@/lib/ai/provider';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { TOKEN_LIMITS } from '@/lib/constants/pricing';
import type { Agent } from '@/lib/types/agent';

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Get all queued messages grouped by agent_id + chat_id
    const { data: messages, error } = await supabase
      .from('message_queue')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !messages || messages.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    // Group messages by agent_id + chat_id
    const groups: Record<string, typeof messages> = {};
    for (const msg of messages) {
      const key = `${msg.agent_id}::${msg.chat_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    }

    let processed = 0;

    for (const [key, groupMessages] of Object.entries(groups)) {
      const [agentId, chatId] = key.split('::');

      // Fetch agent
      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single<Agent>();

      if (!agent || !agent.telegram_bot_token || agent.status !== 'active') {
        // Clean up messages for inactive/missing agents
        const ids = groupMessages.map((m) => m.id);
        await supabase.from('message_queue').delete().in('id', ids);
        continue;
      }

      // Token limit check — skip processing if exhausted
      const tokenLimit = TOKEN_LIMITS[agent.plan] || TOKEN_LIMITS.free;
      if ((agent.tokens_used ?? 0) >= tokenLimit) {
        console.log('[cron] Token limit exhausted for agent', agentId, '— skipping batch');
        const ids = groupMessages.map((m) => m.id);
        await supabase.from('message_queue').delete().in('id', ids);
        continue;
      }

      // Build conversation summary from queued messages
      const conversation = groupMessages
        .map((m) => `${m.user_name}: ${m.message_text}`)
        .join('\n');

      const systemPrompt = buildSystemPrompt(agent);
      const batchPrompt = `Here are recent messages from the community chat. Review them and provide a single helpful response addressing the key questions or topics raised. If there's nothing that needs a response, reply with exactly "SKIP".\n\nMessages:\n${conversation}`;

      const provider = agent.llm_provider ?? undefined;
      const { text: replyText, tokensUsed } = await generateResponse(systemPrompt, batchPrompt, {
        provider,
      });

      // Send response if the LLM didn't skip
      if (replyText.trim() !== 'SKIP') {
        console.log('[cron] Sending batch reply to chat', chatId, ':', replyText.substring(0, 50));
        await sendTelegramMessage(agent.telegram_bot_token, chatId, replyText);
      }

      // Delete processed messages and increment counter
      const ids = groupMessages.map((m) => m.id);
      await supabase.from('message_queue').delete().in('id', ids);
      await supabase.rpc('increment_messages_handled', { agent_row_id: agentId, count: groupMessages.length });
      await supabase.rpc('increment_tokens_used', { agent_row_id: agentId, count: tokensUsed });
      processed += groupMessages.length;
    }

    return NextResponse.json({ processed, groups: Object.keys(groups).length });
  } catch (err) {
    console.error('[cron] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

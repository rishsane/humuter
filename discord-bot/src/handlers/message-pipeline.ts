import { Client, Message } from 'discord.js';
import type { Agent } from '../shared/types/agent';
import { createServiceClient } from '../shared/supabase/service';
import { generateResponse } from '../shared/ai/provider';
import { buildSystemPrompt } from '../shared/ai/system-prompt';
import { TOKEN_LIMITS } from '../shared/constants/pricing';
import { isSpamMessage } from '../shared/utils/spam-detection';
import { handleEscalation } from './escalation';

export async function handleMessagePipeline(
  message: Message,
  agent: Agent,
  client: Client
) {
  const supabase = createServiceClient();
  const agentId = agent.id;

  // Channel whitelist check
  const allowedChannels = agent.discord_allowed_channel_ids;
  if (allowedChannels && allowedChannels.length > 0) {
    if (!allowedChannels.includes(message.channel.id)) {
      return; // Not in allowed channel
    }
  }

  // Skip if no text content
  const userMessage = message.content?.trim();
  if (!userMessage) return;

  // Spam detection — auto-delete
  if (isSpamMessage(userMessage)) {
    console.log('[discord] Spam detected, deleting:', userMessage.substring(0, 80));
    try {
      await message.delete();
    } catch {
      console.log('[discord] Failed to delete spam message (missing permissions)');
    }
    return;
  }

  // Check if author is the supervisor
  const isSupervisor =
    agent.discord_supervisor_user_id &&
    message.author.id === agent.discord_supervisor_user_id;

  // Free tier rate limiting: 2/day, 10/month
  if (agent.plan === 'free') {
    const monthlyUsed = agent.messages_handled ?? 0;
    if (monthlyUsed >= 10) {
      console.log('[discord] Free tier monthly limit reached for agent', agentId);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    let dailyCount = agent.daily_message_count ?? 0;
    if (agent.daily_message_date !== today) {
      dailyCount = 0;
      await supabase
        .from('agents')
        .update({ daily_message_count: 0, daily_message_date: today })
        .eq('id', agentId);
    }

    if (dailyCount >= 2) {
      console.log('[discord] Free tier daily limit reached for agent', agentId);
      return;
    }
  }

  // Token limit check
  const tokenLimit = TOKEN_LIMITS[agent.plan] || TOKEN_LIMITS.free;
  if ((agent.tokens_used ?? 0) >= tokenLimit) {
    console.log('[discord] Token limit exhausted for agent', agentId);
    await message.reply(
      'This agent has reached its monthly usage limit. Please contact the admin to upgrade the plan.'
    );
    return;
  }

  // Build system prompt
  let systemPrompt = buildSystemPrompt(agent);

  if (isSupervisor) {
    systemPrompt +=
      '\n\nCRITICAL: You are currently talking to the PROJECT OWNER / SUPERVISOR — the person who deployed and manages you. You report to them. Do NOT treat them like a regular community member. Do NOT say "I\'ll forward this to my supervisor" — THEY ARE the supervisor. Never respond with SKIP, DELETE, or ESCALATE to them. Be direct, helpful, and give them status updates, summaries, and collected feedback when they ask. They have full authority over you.';
  }

  // Feedback collection
  if (agent.discord_supervisor_user_id && !isSupervisor) {
    systemPrompt +=
      '\n\nFEEDBACK COLLECTION: When a user shares feedback, suggestions, complaints, or feature requests about the project, respond to them normally AND add a tag at the very end of your response on a new line: [FEEDBACK: brief summary of the feedback]. This tag will be automatically forwarded to the supervisor. Only use this tag for genuine feedback/suggestions, not for regular questions.';
  }

  console.log(
    '[discord] Replying to:',
    userMessage.substring(0, 50),
    isSupervisor ? '(supervisor)' : '',
    'from:',
    message.author.id
  );

  const provider = agent.llm_provider ?? undefined;
  let { text: replyText, tokensUsed } = await generateResponse(
    systemPrompt,
    userMessage,
    { provider }
  );
  let trimmedReply = replyText.trim();

  // Never skip/delete supervisor messages
  if (isSupervisor && (trimmedReply === 'SKIP' || trimmedReply === 'DELETE' || trimmedReply === 'ESCALATE')) {
    const retry = await generateResponse(
      systemPrompt +
        '\n\nDo NOT reply with SKIP, DELETE, or ESCALATE. Give a normal, friendly, helpful response.',
      userMessage,
      { provider }
    );
    trimmedReply = retry.text.trim();
    tokensUsed += retry.tokensUsed;

    if (trimmedReply === 'SKIP' || trimmedReply === 'DELETE' || trimmedReply === 'ESCALATE') {
      trimmedReply = 'Hey! How can I help you today?';
    }
  }

  // Self-escalation detection
  let isSelfEscalation = false;
  if (
    agent.discord_supervisor_user_id &&
    !isSupervisor &&
    trimmedReply !== 'ESCALATE' &&
    trimmedReply !== 'SKIP' &&
    trimmedReply !== 'DELETE'
  ) {
    const lower = trimmedReply.toLowerCase();
    const selfEscalationPatterns = [
      'let me check with the team',
      "i'll get back to you",
      'i will get back to you',
      'let me ask the team',
      "i'll check with",
      'i will check with',
      "i'll forward this",
      'i will forward this',
      'let me escalate',
    ];
    isSelfEscalation = selfEscalationPatterns.some((p) => lower.includes(p));
  }

  if (
    trimmedReply === 'ESCALATE' &&
    agent.discord_supervisor_user_id &&
    !isSupervisor
  ) {
    await handleEscalation(message, agent, userMessage, client);
  } else if (trimmedReply === 'DELETE' && agent.auto_moderate !== false) {
    console.log('[discord] AI flagged for deletion:', userMessage.substring(0, 50));
    try {
      await message.delete();
    } catch {
      console.log('[discord] Failed to delete flagged message');
    }
  } else if (
    trimmedReply !== 'SKIP' &&
    trimmedReply !== 'DELETE' &&
    trimmedReply !== 'ESCALATE'
  ) {
    // Extract feedback tag
    let feedbackContent: string | null = null;
    const feedbackMatch = trimmedReply.match(/\[FEEDBACK:\s*([^\]]+)\]\s*$/);
    if (feedbackMatch) {
      feedbackContent = feedbackMatch[1].trim();
      trimmedReply = trimmedReply.replace(/\n?\[FEEDBACK:\s*[^\]]+\]\s*$/, '').trim();
    }

    // Discord has 2000 char limit per message
    if (trimmedReply.length > 2000) {
      trimmedReply = trimmedReply.substring(0, 1997) + '...';
    }

    // Natural delay if configured
    if (agent.response_delay === 'natural') {
      const delay = 30_000 + Math.floor(Math.random() * 30_000);
      console.log(`[discord] Waiting ${Math.round(delay / 1000)}s before replying...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    console.log('[discord] Sending reply:', trimmedReply.substring(0, 50));
    await message.reply(trimmedReply);

    // Forward feedback to supervisor via DM
    if (feedbackContent && agent.discord_supervisor_user_id && !isSupervisor) {
      try {
        const supervisor = await client.users.fetch(agent.discord_supervisor_user_id);
        const feedbackText = `Feedback collected:\n\n"${feedbackContent}"\n\nFrom: ${message.author.tag}\nIn: #${(message.channel as { name?: string }).name || message.channel.id}\nOriginal message: "${userMessage.substring(0, 300)}"`;
        await supervisor.send(feedbackText);
        console.log('[discord] Feedback forwarded to supervisor:', feedbackContent.substring(0, 50));
      } catch {
        console.log('[discord] Failed to DM supervisor with feedback');
      }
    }

    // Self-escalation — also notify supervisor
    if (isSelfEscalation && agent.discord_supervisor_user_id) {
      console.log('[discord] Self-escalation detected, forwarding to supervisor');
      try {
        const supervisor = await client.users.fetch(agent.discord_supervisor_user_id);
        const forwardText = `Bot handled this but may need correction:\n\n"${userMessage}"\n\nFrom: ${message.author.tag}\n\nBot replied: "${trimmedReply.substring(0, 500)}"\n\nReply with:\n- Context/info → bot sends a corrected reply\n- /direct Your exact message → sent as-is\n- /ignore → no correction needed`;
        const forwardedDm = await supervisor.send(forwardText);

        await supabase.from('escalations').insert({
          agent_id: agentId,
          group_chat_id: 0,
          original_message_id: 0,
          user_question: userMessage,
          user_name: message.author.tag,
          forwarded_message_id: null,
          status: 'pending',
          source_platform: 'discord',
          discord_channel_id: message.channel.id,
          discord_message_id: message.id,
          discord_forwarded_message_id: forwardedDm.id,
        });
      } catch {
        console.log('[discord] Failed to DM supervisor for self-escalation');
      }
    }
  }

  // Increment counters
  await supabase.rpc('increment_messages_handled', { agent_row_id: agentId, count: 1 });
  await supabase.rpc('increment_tokens_used', { agent_row_id: agentId, count: tokensUsed });
  await supabase.rpc('increment_daily_message_count', { agent_row_id: agentId });
}

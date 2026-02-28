import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import { createServiceClient } from '../shared/supabase/service';
import type { Agent } from '../shared/types/agent';
import { handleTelegramAccountMessage } from './account-pipeline';

const apiId = Number(process.env.TELEGRAM_API_ID || '0');
const apiHash = process.env.TELEGRAM_API_HASH || '';

interface ActiveSession {
  client: TelegramClient;
  agent: Agent;
}

const activeSessions = new Map<string, ActiveSession>();

async function startSessionForAgent(agent: Agent): Promise<void> {
  if (!agent.telegram_account_session) return;
  if (activeSessions.has(agent.id)) return;

  try {
    const session = new StringSession(agent.telegram_account_session);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    // Verify session is still valid
    const me = await client.getMe();
    if (!me) {
      console.error('[tg-listener] Session invalid for agent', agent.id);
      await client.disconnect();
      return;
    }

    const displayName = `${(me as Api.User).firstName || ''}${(me as Api.User).lastName ? ' ' + (me as Api.User).lastName : ''}`.trim();
    console.log(`[tg-listener] Connected as ${displayName} for agent ${agent.id}`);

    // Add message handler
    client.addEventHandler(async (event) => {
      try {
        // Re-fetch agent for fresh data (rate limits, training data changes)
        const supabase = createServiceClient();
        const { data: freshAgent } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agent.id)
          .single();

        if (!freshAgent || freshAgent.status !== 'active') return;

        await handleTelegramAccountMessage(client, event.message, freshAgent as Agent);
      } catch (err) {
        console.error('[tg-listener] Message handler error:', err instanceof Error ? err.message : err);
      }
    }, new NewMessage({ incoming: true }));

    activeSessions.set(agent.id, { client, agent });
  } catch (err) {
    console.error(`[tg-listener] Failed to start session for agent ${agent.id}:`, err instanceof Error ? err.message : err);
  }
}

async function stopSession(agentId: string): Promise<void> {
  const session = activeSessions.get(agentId);
  if (session) {
    try {
      await session.client.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    activeSessions.delete(agentId);
    console.log(`[tg-listener] Disconnected session for agent ${agentId}`);
  }
}

export async function refreshTelegramListeners(): Promise<void> {
  if (!apiId || !apiHash) {
    return; // Telegram API credentials not configured, skip
  }

  const supabase = createServiceClient();

  // Fetch all active agents with personal account sessions
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*')
    .eq('telegram_account_type', 'personal')
    .not('telegram_account_session', 'is', null)
    .eq('status', 'active');

  if (error) {
    console.error('[tg-listener] Failed to fetch agents:', error.message);
    return;
  }

  const activeAgentIds = new Set((agents || []).map((a: Agent) => a.id));

  // Stop sessions for agents that are no longer active or have been disconnected
  for (const [agentId] of activeSessions) {
    if (!activeAgentIds.has(agentId)) {
      await stopSession(agentId);
    }
  }

  // Start sessions for new agents
  for (const agent of (agents || []) as Agent[]) {
    if (!activeSessions.has(agent.id)) {
      await startSessionForAgent(agent);
    }
  }
}

export async function startTelegramListeners(): Promise<void> {
  if (!apiId || !apiHash) {
    console.log('[tg-listener] TELEGRAM_API_ID/HASH not set, skipping personal account listeners');
    return;
  }

  console.log('[tg-listener] Starting Telegram personal account listeners...');
  await refreshTelegramListeners();

  // Refresh every 60 seconds to pick up new sessions or stop removed ones
  setInterval(async () => {
    try {
      await refreshTelegramListeners();
    } catch (err) {
      console.error('[tg-listener] Refresh error:', err instanceof Error ? err.message : err);
    }
  }, 60_000);
}

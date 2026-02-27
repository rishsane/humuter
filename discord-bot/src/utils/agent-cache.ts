import { createServiceClient } from '../shared/supabase/service';
import type { Agent } from '../shared/types/agent';

interface CachedAgent {
  agent: Agent;
  fetchedAt: number;
}

const cache = new Map<string, CachedAgent>();
const TTL_MS = 60_000; // 60 seconds

export async function getAgentByServerId(serverId: string): Promise<Agent | null> {
  const cached = cache.get(serverId);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.agent;
  }

  const supabase = createServiceClient();
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('discord_server_id', serverId)
    .eq('status', 'active')
    .single<Agent>();

  if (error || !agent) {
    cache.delete(serverId);
    return null;
  }

  cache.set(serverId, { agent, fetchedAt: Date.now() });
  return agent;
}

export function invalidateCache(serverId: string) {
  cache.delete(serverId);
}

export async function getAgentBySupervisorUserId(discordUserId: string): Promise<Agent | null> {
  // Check cache first
  for (const [, cached] of cache) {
    if (
      cached.agent.discord_supervisor_user_id === discordUserId &&
      Date.now() - cached.fetchedAt < TTL_MS
    ) {
      return cached.agent;
    }
  }

  const supabase = createServiceClient();
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('discord_supervisor_user_id', discordUserId)
    .eq('status', 'active')
    .single<Agent>();

  if (error || !agent) return null;

  if (agent.discord_server_id) {
    cache.set(agent.discord_server_id, { agent, fetchedAt: Date.now() });
  }
  return agent;
}

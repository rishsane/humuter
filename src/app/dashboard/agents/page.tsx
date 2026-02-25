import { createClient } from '@/lib/supabase/server';
import { AgentCard } from '@/components/dashboard/agent-card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function AgentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let agents: { id: string; name: string; agent_type: string; plan: string; status: string; channels: string[]; messages_handled: number }[] = [];

  if (user) {
    const { data } = await supabase
      .from('agents')
      .select('id, name, agent_type, plan, status, channels, messages_handled')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    agents = (data || []).map(a => ({ ...a, messages_handled: a.messages_handled ?? 0 }));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-neutral-900">Agents</h1>
          <p className="font-mono text-sm text-neutral-500">Manage your deployed AI agents</p>
        </div>
        <Link href="/onboarding/agents">
          <Button className="rounded-none bg-orange-500 font-mono text-sm uppercase text-white hover:bg-orange-600">
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Button>
        </Link>
      </div>

      {agents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              id={agent.id}
              name={agent.name}
              agentType={agent.agent_type}
              plan={agent.plan}
              status={agent.status as 'active' | 'paused' | 'pending' | 'archived'}
              messagesHandled={agent.messages_handled}
              channelsActive={agent.channels?.length || 0}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 bg-neutral-100 p-4">
            <Plus className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="font-mono text-lg font-medium text-neutral-900">No agents yet</h3>
          <p className="mt-1 font-mono text-sm text-neutral-500">Create your first AI agent to get started</p>
          <Link href="/onboarding/agents" className="mt-4">
            <Button className="rounded-none bg-orange-500 font-mono text-sm uppercase text-white hover:bg-orange-600">
              Create Agent
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

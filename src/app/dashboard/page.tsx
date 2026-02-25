import { createClient } from '@/lib/supabase/server';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { AgentCard } from '@/components/dashboard/agent-card';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let agents: { id: string; name: string; agent_type: string; plan: string; status: string; channels: string[] }[] = [];

  if (user) {
    const { data } = await supabase
      .from('agents')
      .select('id, name, agent_type, plan, status, channels')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    agents = data || [];
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-neutral-900">Dashboard</h1>
          <p className="font-mono text-sm text-neutral-500">Overview of your AI agents</p>
        </div>
        <Link href="/onboarding/agents">
          <Button className="rounded-none bg-orange-500 font-mono text-sm uppercase text-white hover:bg-orange-600">
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Button>
        </Link>
      </div>

      <StatsGrid />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnalyticsChart />
        <ActivityFeed />
      </div>

      <div>
        <h2 className="mb-4 font-mono text-base font-bold text-neutral-900">Your Agents</h2>
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
                messagesHandled={0}
                channelsActive={agent.channels?.length || 0}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-neutral-200">
            <Plus className="h-8 w-8 text-neutral-400 mb-3" />
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
    </div>
  );
}

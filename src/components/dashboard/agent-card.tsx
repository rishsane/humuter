import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Settings, BarChart3 } from 'lucide-react';

interface AgentCardProps {
  id: string;
  name: string;
  projectName?: string;
  agentType: string;
  plan: string;
  status: 'active' | 'paused' | 'pending' | 'archived';
  messagesHandled: number;
  channelsActive: number;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-50 text-green-700 rounded-none font-mono uppercase text-xs',
  paused: 'bg-orange-50 text-orange-700 rounded-none font-mono uppercase text-xs',
  pending: 'bg-neutral-100 text-neutral-500 rounded-none font-mono uppercase text-xs',
  archived: 'bg-red-50 text-red-700 rounded-none font-mono uppercase text-xs',
};

export function AgentCard({
  id,
  name,
  projectName,
  agentType,
  plan,
  status,
  messagesHandled,
  channelsActive,
}: AgentCardProps) {
  return (
    <Card className="border border-neutral-200 bg-white rounded-none shadow-none transition-all hover:border-orange-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-none bg-orange-50">
              <Bot className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-mono font-semibold text-neutral-900">{name}</h3>
              <p className="font-mono text-sm text-neutral-500 capitalize">
                {projectName ? `${projectName} · ` : ''}{agentType.replace('_', ' ')}
              </p>
            </div>
          </div>
          <Badge className={statusColors[status]}>{status}</Badge>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">Plan</p>
            <p className="font-mono font-medium text-neutral-900 capitalize">{plan}</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">Messages</p>
            <p className="font-mono font-medium text-neutral-900">{messagesHandled.toLocaleString()}</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">Channels</p>
            <p className="font-mono font-medium text-neutral-900">{channelsActive}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Link href={`/dashboard/agents/${id}`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors">
              <Settings className="h-3.5 w-3.5" />
              Manage
            </button>
          </Link>
          <Link href={`/dashboard/agents/${id}?tab=analytics`}>
            <button className="flex items-center justify-center border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors">
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

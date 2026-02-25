import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Radio, Bot } from 'lucide-react';

interface StatsGridProps {
  totalMessages: number;
  activeChannels: number;
  activeAgents: number;
}

export function StatsGrid({ totalMessages, activeChannels, activeAgents }: StatsGridProps) {
  const stats = [
    {
      label: 'Total Messages',
      value: totalMessages.toLocaleString(),
      icon: MessageSquare,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
    {
      label: 'Active Channels',
      value: String(activeChannels),
      icon: Radio,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active Agents',
      value: String(activeAgents),
      icon: Bot,
      color: 'text-neutral-900',
      bg: 'bg-neutral-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border border-neutral-200 bg-white rounded-none shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={`rounded-none p-2 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="font-mono text-2xl font-bold text-neutral-900">{stat.value}</p>
              <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

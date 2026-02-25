import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Radio, Bot, TrendingUp } from 'lucide-react';

const stats = [
  {
    label: 'Total Messages',
    value: '0',
    icon: MessageSquare,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    label: 'Active Channels',
    value: '0',
    icon: Radio,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    label: 'Active Agents',
    value: '0',
    icon: Bot,
    color: 'text-neutral-900',
    bg: 'bg-neutral-100',
  },
  {
    label: 'Response Quality',
    value: '--',
    icon: TrendingUp,
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
];

export function StatsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

const activities = [
  {
    icon: MessageSquare,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    message: 'Agent responded to 12 messages in #general',
    time: '5 min ago',
  },
  {
    icon: UserPlus,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    message: 'New user onboarded via Discord',
    time: '23 min ago',
  },
  {
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-50',
    message: 'Successfully handled staking FAQ',
    time: '1 hour ago',
  },
  {
    icon: AlertCircle,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    message: 'Escalated ticket to @admin — user reported lost funds',
    time: '2 hours ago',
  },
  {
    icon: MessageSquare,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    message: 'Agent handled 47 messages across Telegram & Discord',
    time: '4 hours ago',
  },
];

export function ActivityFeed() {
  return (
    <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
      <CardHeader>
        <CardTitle className="font-mono text-base font-bold text-neutral-900">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-neutral-100">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className={`mt-0.5 rounded-none p-1.5 ${activity.bg}`}>
                <activity.icon className={`h-3.5 w-3.5 ${activity.color}`} />
              </div>
              <div className="flex-1">
                <p className="font-mono text-sm text-neutral-700">{activity.message}</p>
                <p className="font-mono text-xs text-neutral-400">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

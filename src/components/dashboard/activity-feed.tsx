import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export function ActivityFeed() {
  return (
    <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
      <CardHeader>
        <CardTitle className="font-mono text-base font-bold text-neutral-900">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-8 w-8 text-neutral-300 mb-3" />
          <p className="font-mono text-sm text-neutral-500">No activity yet</p>
          <p className="font-mono text-xs text-neutral-400 mt-1">Activity will show up as your bot interacts with users</p>
        </div>
      </CardContent>
    </Card>
  );
}

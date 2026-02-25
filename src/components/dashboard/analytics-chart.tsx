import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export function AnalyticsChart() {
  return (
    <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
      <CardHeader>
        <CardTitle className="font-mono text-base font-bold text-neutral-900">Messages This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <BarChart3 className="h-8 w-8 text-neutral-300 mb-3" />
          <p className="font-mono text-sm text-neutral-500">No message data yet</p>
          <p className="font-mono text-xs text-neutral-400 mt-1">Analytics will appear once your bot starts handling messages</p>
        </div>
      </CardContent>
    </Card>
  );
}

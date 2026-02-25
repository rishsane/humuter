import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const data = [
  { day: 'Mon', messages: 145 },
  { day: 'Tue', messages: 230 },
  { day: 'Wed', messages: 185 },
  { day: 'Thu', messages: 310 },
  { day: 'Fri', messages: 267 },
  { day: 'Sat', messages: 120 },
  { day: 'Sun', messages: 90 },
];

const maxMessages = Math.max(...data.map((d) => d.messages));

export function AnalyticsChart() {
  return (
    <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
      <CardHeader>
        <CardTitle className="font-mono text-base font-bold text-neutral-900">Messages This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 h-48">
          {data.map((item) => (
            <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
              <span className="font-mono text-xs text-neutral-500">{item.messages}</span>
              <div
                className="w-full bg-orange-500 transition-all hover:bg-orange-600"
                style={{ height: `${(item.messages / maxMessages) * 100}%` }}
              />
              <span className="font-mono text-xs text-neutral-400">{item.day}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

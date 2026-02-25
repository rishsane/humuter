import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TOKEN_LIMITS } from '@/lib/constants/pricing';
import { ArrowUpRight, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let agents: { id: string; name: string; plan: string; tokens_used: number }[] = [];

  if (user) {
    const { data } = await supabase
      .from('agents')
      .select('id, name, plan, tokens_used')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    agents = (data || []).map(a => ({ ...a, tokens_used: a.tokens_used ?? 0 }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-2xl font-bold text-neutral-900">Billing</h1>
        <p className="font-mono text-sm text-neutral-500">Manage your plan and usage</p>
      </div>

      {agents.length > 0 ? (
        <div className="space-y-6">
          {agents.map((agent) => {
            const tokenLimit = TOKEN_LIMITS[agent.plan] || TOKEN_LIMITS.free;
            const pct = Math.min((agent.tokens_used / tokenLimit) * 100, 100);
            const isHigh = pct >= 70;
            const isExhausted = pct >= 100;

            return (
              <Card key={agent.id} className="border border-neutral-200 bg-white rounded-none shadow-none">
                <CardHeader>
                  <CardTitle className="font-mono text-base font-bold text-neutral-900">{agent.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Plan */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">Current Plan</p>
                      <p className="font-mono text-lg font-bold text-neutral-900 capitalize">{agent.plan}</p>
                    </div>
                    <Link href="/onboarding/pricing">
                      <button className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors">
                        <ArrowUpRight className="h-4 w-4" />
                        Change Plan
                      </button>
                    </Link>
                  </div>

                  {/* Usage */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm text-neutral-600">Token usage</p>
                      <p className="font-mono text-sm font-bold text-neutral-900">
                        {agent.tokens_used.toLocaleString()} / {tokenLimit.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-full bg-neutral-100 h-3 rounded-none">
                      <div
                        className={`h-3 rounded-none transition-all ${isExhausted ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className={`font-mono text-xs ${isExhausted ? 'text-red-500 font-medium' : isHigh ? 'text-orange-500 font-medium' : 'text-neutral-400'}`}>
                      {pct.toFixed(0)}% used
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="h-8 w-8 text-neutral-300 mb-3" />
            <p className="font-mono text-sm text-neutral-500">No agents yet</p>
            <p className="font-mono text-xs text-neutral-400 mt-1">Create an agent to see billing information</p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
        <CardHeader>
          <CardTitle className="font-mono text-base font-bold text-neutral-900">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm text-neutral-400">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}

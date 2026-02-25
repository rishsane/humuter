import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { count: starterCount } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'starter')
      .neq('status', 'archived');

    const { count: proCount } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'pro')
      .neq('status', 'archived');

    return NextResponse.json({
      starter: { used: starterCount ?? 0, total: 20 },
      pro: { used: proCount ?? 0, total: 0, waitlistOnly: true },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

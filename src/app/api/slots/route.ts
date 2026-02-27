import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// Admin emails whose agents don't count toward public slots
const ADMIN_EMAILS = ['rish.anand18@gmail.com'];

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Look up admin user IDs via auth.admin
    const adminUserIds: string[] = [];
    const { data: authData } = await supabase.auth.admin.listUsers();
    if (authData?.users) {
      for (const u of authData.users) {
        if (u.email && ADMIN_EMAILS.includes(u.email)) {
          adminUserIds.push(u.id);
        }
      }
    }

    let starterQuery = supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'starter')
      .neq('status', 'archived');

    let proQuery = supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'pro')
      .neq('status', 'archived');

    for (const uid of adminUserIds) {
      starterQuery = starterQuery.neq('user_id', uid);
      proQuery = proQuery.neq('user_id', uid);
    }

    const { count: starterCount } = await starterQuery;
    const { count: proCount } = await proQuery;

    return NextResponse.json({
      starter: { used: starterCount ?? 0, total: 20 },
      pro: { used: proCount ?? 0, total: 0, waitlistOnly: true },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

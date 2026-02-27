import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agents });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, industry, agent_type, plan, training_data, skill_file_url } = body;

    if (!agent_type) {
      return NextResponse.json({ error: 'agent_type is required' }, { status: 400 });
    }

    // Limit 1 agent per user during early access (bypass for admin)
    const ADMIN_EMAILS = ['rish.anand18@gmail.com'];
    const isAdmin = ADMIN_EMAILS.includes(user.email ?? '');

    if (!isAdmin) {
      const { count: existingCount } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'archived');

      if ((existingCount ?? 0) >= 1) {
        return NextResponse.json(
          { error: 'You can only deploy 1 agent during early access' },
          { status: 403 }
        );
      }
    }

    // Generate API key
    const chars = 'abcdef0123456789';
    let apiKey = 'hmt_';
    for (let i = 0; i < 48; i++) {
      apiKey += chars[Math.floor(Math.random() * chars.length)];
    }
    const prefix = apiKey.substring(0, 12) + '...';

    // Simple hash for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        user_id: user.id,
        name: name || `My ${agent_type?.replace('_', ' ')} Agent`,
        industry,
        agent_type,
        plan,
        status: 'active',
        api_key_hash: hash,
        api_key_prefix: prefix,
        training_data: training_data || {},
        skill_file_url,
        channels: [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agent, apiKey });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = await params;

    // Verify agent belongs to user
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await request.json();
    const { server_id } = body;

    if (!server_id || typeof server_id !== 'string') {
      return NextResponse.json(
        { error: 'server_id is required' },
        { status: 400 }
      );
    }

    // Starter plan: can only use one channel (Telegram OR Discord), not both
    const ADMIN_EMAILS = ['rish.anand18@gmail.com'];
    const isAdmin = ADMIN_EMAILS.includes(user.email ?? '');
    if (!isAdmin && agent.plan === 'starter' && agent.telegram_bot_token) {
      return NextResponse.json(
        { error: 'Starter plan supports one channel only (Telegram or Discord). Upgrade to Pro for multi-channel deployment.' },
        { status: 403 }
      );
    }

    // Check that no other agent is already using this server ID
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('discord_server_id', server_id)
      .neq('id', agentId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This Discord server is already connected to another agent' },
        { status: 409 }
      );
    }

    // Update agent with Discord server ID and add discord to channels
    const channels: string[] = agent.channels || [];
    if (!channels.includes('discord')) {
      channels.push('discord');
    }

    const { error: updateError } = await supabase
      .from('agents')
      .update({
        discord_server_id: server_id,
        channels,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      connected: true,
      server_id,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = await params;

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Remove discord from channels and clear Discord fields
    const channels: string[] = (agent.channels || []).filter(
      (c: string) => c !== 'discord'
    );

    const { error: updateError } = await supabase
      .from('agents')
      .update({
        discord_server_id: null,
        discord_allowed_channel_ids: null,
        discord_supervisor_user_id: null,
        channels,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

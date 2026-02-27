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

    // Starter plan: can only use one channel (Telegram OR Discord), not both
    const ADMIN_EMAILS = ['rish.anand18@gmail.com'];
    const isAdmin = ADMIN_EMAILS.includes(user.email ?? '');
    if (!isAdmin && agent.plan === 'starter' && agent.discord_server_id) {
      return NextResponse.json(
        { error: 'Starter plan supports one channel only (Telegram or Discord). Upgrade to Pro for multi-channel deployment.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { bot_token } = body;

    if (!bot_token || typeof bot_token !== 'string') {
      return NextResponse.json(
        { error: 'bot_token is required' },
        { status: 400 }
      );
    }

    // Validate token by calling Telegram getMe
    const getMeRes = await fetch(
      `https://api.telegram.org/bot${bot_token}/getMe`
    );
    const getMeData = await getMeRes.json();

    if (!getMeData.ok) {
      return NextResponse.json(
        { error: 'Invalid Telegram bot token' },
        { status: 400 }
      );
    }

    // Set webhook
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const webhookUrl = `${appUrl}/api/webhook/telegram/${agentId}`;

    const setWebhookRes = await fetch(
      `https://api.telegram.org/bot${bot_token}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      }
    );
    const webhookData = await setWebhookRes.json();

    if (!webhookData.ok) {
      return NextResponse.json(
        { error: 'Failed to set Telegram webhook' },
        { status: 500 }
      );
    }

    // Update agent with bot token and add telegram to channels
    const channels: string[] = agent.channels || [];
    if (!channels.includes('telegram')) {
      channels.push('telegram');
    }

    const { error: updateError } = await supabase
      .from('agents')
      .update({
        telegram_bot_token: bot_token,
        channels,
      })
      .eq('id', agentId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bot: {
        username: getMeData.result.username,
        name: getMeData.result.first_name,
      },
      webhook_url: webhookUrl,
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

    // Delete webhook if token exists
    if (agent.telegram_bot_token) {
      await fetch(
        `https://api.telegram.org/bot${agent.telegram_bot_token}/deleteWebhook`
      );
    }

    // Remove telegram from channels and clear token
    const channels: string[] = (agent.channels || []).filter(
      (c: string) => c !== 'telegram'
    );

    const { error: updateError } = await supabase
      .from('agents')
      .update({
        telegram_bot_token: null,
        channels,
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

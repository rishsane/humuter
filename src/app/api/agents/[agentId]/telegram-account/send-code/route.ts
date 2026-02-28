import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH || '';

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

    if (!apiId || !apiHash) {
      return NextResponse.json(
        { error: 'Telegram API credentials not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
      connectionRetries: 3,
    });
    await client.connect();

    const result = await client.sendCode(
      { apiId, apiHash },
      phone
    );

    await client.disconnect();

    // Store phone_code_hash temporarily in DB
    await supabase
      .from('agents')
      .update({
        telegram_account_phone: phone,
        telegram_account_phone_code_hash: result.phoneCodeHash,
      })
      .eq('id', agentId);

    return NextResponse.json({
      phone_code_hash: result.phoneCodeHash,
      phone,
    });
  } catch (err) {
    console.error('[telegram-account] Send code error:', err);
    const message = err instanceof Error ? err.message : 'Failed to send verification code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

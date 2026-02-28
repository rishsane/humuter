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

    // Save the intermediate session — Telegram ties the code to this session/DC
    const intermediateSession = client.session.save() as unknown as string;

    await client.disconnect();

    // Store phone_code_hash AND intermediate session in DB
    await supabase
      .from('agents')
      .update({
        telegram_account_phone: phone,
        telegram_account_phone_code_hash: result.phoneCodeHash,
        telegram_account_session: intermediateSession, // reused in verify step
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

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TelegramClient, Api } from 'telegram';
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
    const { phone, code, password } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone and verification code are required' },
        { status: 400 }
      );
    }

    const phoneCodeHash = agent.telegram_account_phone_code_hash;
    const intermediateSession = agent.telegram_account_session;
    if (!phoneCodeHash || !intermediateSession) {
      return NextResponse.json(
        { error: 'No pending verification. Please request a new code.' },
        { status: 400 }
      );
    }

    // Restore the session from sendCode step — Telegram ties the code to this session/DC
    const session = new StringSession(intermediateSession);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 3,
    });
    await client.connect();

    try {
      // Try signing in with the code
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash: phoneCodeHash,
          phoneCode: code,
        })
      );
    } catch (signInError: unknown) {
      // Check if 2FA is required
      if (
        signInError &&
        typeof signInError === 'object' &&
        'errorMessage' in signInError &&
        (signInError as { errorMessage: string }).errorMessage === 'SESSION_PASSWORD_NEEDED'
      ) {
        if (!password) {
          await client.disconnect();
          return NextResponse.json({
            requires_2fa: true,
            message: 'Two-factor authentication is enabled. Please provide your password.',
          });
        }

        // Handle 2FA
        const passwordResult = await client.invoke(
          new Api.account.GetPassword()
        );
        const { computeCheck } = await import('telegram/Password');
        const passwordHash = await computeCheck(passwordResult, password);
        await client.invoke(
          new Api.auth.CheckPassword({ password: passwordHash })
        );
      } else {
        throw signInError;
      }
    }

    // Successfully authenticated — save session
    const sessionString = client.session.save() as unknown as string;

    // Get account info
    const me = await client.getMe();
    const displayName = `${(me as Api.User).firstName || ''}${(me as Api.User).lastName ? ' ' + (me as Api.User).lastName : ''}`.trim();

    await client.disconnect();

    // Update agent with session and account type
    const channels: string[] = agent.channels || [];
    if (!channels.includes('telegram')) {
      channels.push('telegram');
    }

    const { error: updateError } = await supabase
      .from('agents')
      .update({
        telegram_account_type: 'personal',
        telegram_account_session: sessionString,
        telegram_account_phone: phone,
        telegram_account_phone_code_hash: null, // Clear temporary hash
        channels,
      })
      .eq('id', agentId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      connected: true,
      account: {
        name: displayName,
        phone,
      },
    });
  } catch (err) {
    console.error('[telegram-account] Verify error:', err);
    const message = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

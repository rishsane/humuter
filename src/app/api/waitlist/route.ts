import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, plan } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    if (!plan || !['starter', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'Plan must be starter or pro' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check for duplicate
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('plan', plan)
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, message: 'Already on the waitlist' });
    }

    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.toLowerCase().trim(), plan });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Added to waitlist' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

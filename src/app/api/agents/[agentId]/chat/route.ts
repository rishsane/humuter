import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateResponse } from '@/lib/ai/provider';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import type { Agent } from '@/lib/types/agent';

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

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single<Agent>();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    let systemPrompt = buildSystemPrompt(agent);
    // This is the project owner talking to the agent via the dashboard
    systemPrompt +=
      '\n\nCRITICAL: You are currently talking to the PROJECT OWNER / SUPERVISOR — the person who deployed and manages you. You report to them. Do NOT treat them like a regular community member. Do NOT say "I\'ll forward this to my supervisor" — THEY ARE the supervisor. Never respond with SKIP, DELETE, or ESCALATE. Be direct, helpful, and give them status updates, summaries, and collected feedback when they ask. They have full authority over you. If they give you new context, corrections, or guidance about how to handle certain topics, acknowledge it and confirm you understand.';

    const provider = agent.llm_provider ?? undefined;
    const { text, tokensUsed } = await generateResponse(
      systemPrompt,
      message,
      { provider }
    );

    return NextResponse.json({
      reply: text.trim(),
      tokens_used: tokensUsed,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

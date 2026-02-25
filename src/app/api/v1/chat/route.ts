import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateResponse } from '@/lib/ai/provider';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import type { Agent } from '@/lib/types/agent';

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7);
    if (!apiKey.startsWith('hmt_')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      );
    }

    // Hash key and look up agent
    const keyHash = await hashApiKey(apiKey);
    const supabase = createServiceClient();

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('api_key_hash', keyHash)
      .single<Agent>();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    if (agent.status !== 'active') {
      return NextResponse.json(
        { error: 'Agent is not active' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message, channel, user_id } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required and must be a string' },
        { status: 400 }
      );
    }

    // Build system prompt and call LLM
    const systemPrompt = buildSystemPrompt(agent);
    const provider = agent.llm_provider ?? undefined;
    const reply = await generateResponse(systemPrompt, message, { provider });

    return NextResponse.json({
      reply,
      agent_id: agent.id,
      channel: channel || 'api',
      user_id: user_id || null,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { fetchTweets, fetchWebsiteContent } from '@/lib/utils/social-scraper';
import type { Agent } from '@/lib/types/agent';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const { data: agent, error } = await serviceClient
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single<Agent>();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const parts: string[] = [];

    if (agent.twitter_handle) {
      const tweets = await fetchTweets(agent.twitter_handle);
      if (tweets) {
        parts.push(`Recent tweets from @${agent.twitter_handle}:\n${tweets}`);
      }
    }

    const websiteUrl = agent.training_data?.website_url;
    if (websiteUrl) {
      const content = await fetchWebsiteContent(websiteUrl);
      if (content) {
        parts.push(`Website content from ${websiteUrl}:\n${content}`);
      }
    }

    const socialContext = parts.join('\n\n---\n\n') || null;

    await serviceClient
      .from('agents')
      .update({ social_context: socialContext })
      .eq('id', agentId);

    return NextResponse.json({ ok: true, chars: socialContext?.length || 0 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

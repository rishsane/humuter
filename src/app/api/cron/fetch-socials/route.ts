import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { fetchTweets, fetchWebsiteContent } from '@/lib/utils/social-scraper';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'active');

    if (error || !agents || agents.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let processed = 0;

    for (const agent of agents) {
      const parts: string[] = [];

      if (agent.twitter_handle) {
        const tweets = await fetchTweets(agent.twitter_handle);
        if (tweets) parts.push(`Recent tweets from @${agent.twitter_handle}:\n${tweets}`);
      }

      const websiteUrl = agent.training_data?.website_url;
      if (websiteUrl) {
        const content = await fetchWebsiteContent(websiteUrl);
        if (content) parts.push(`Website content from ${websiteUrl}:\n${content}`);
      }

      if (parts.length > 0) {
        await supabase
          .from('agents')
          .update({ social_context: parts.join('\n\n---\n\n') })
          .eq('id', agent.id);
        processed++;
      }
    }

    return NextResponse.json({ processed });
  } catch (err) {
    console.error('[cron/fetch-socials] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

export async function fetchTweets(handle: string): Promise<string> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) return '';

  try {
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${handle}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!userRes.ok) return '';
    const userData = await userRes.json();
    const userId = userData.data?.id;
    if (!userId) return '';

    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!tweetsRes.ok) return '';
    const tweetsData = await tweetsRes.json();

    if (!tweetsData.data || tweetsData.data.length === 0) return '';

    return tweetsData.data
      .map((t: { text: string; created_at: string }) => `[${t.created_at}] ${t.text}`)
      .join('\n\n');
  } catch {
    return '';
  }
}

export async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HumuterBot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return '';
    const html = await res.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    return text.substring(0, 2000);
  } catch {
    return '';
  }
}

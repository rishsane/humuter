import { createServiceClient } from '@/lib/supabase/service';
import { setWebhook } from './utils';

interface CreateAgentParams {
  userId: string;
  agentType: string;
  plan: string;
  trainingData: Record<string, string>;
  skillFileContent?: string | null;
  botToken: string;
}

export async function createAgent(params: CreateAgentParams): Promise<{
  success: boolean;
  agentId?: string;
  apiKey?: string;
  botUsername?: string;
  error?: string;
}> {
  const supabase = createServiceClient();
  const { userId, agentType, plan, trainingData, skillFileContent, botToken } = params;

  // Check 1-agent-per-user limit
  const { count: existingCount } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'archived');

  if ((existingCount ?? 0) >= 1) {
    return { success: false, error: 'You can only deploy 1 agent during early access.' };
  }

  // Generate API key
  const chars = 'abcdef0123456789';
  let apiKey = 'hmt_';
  for (let i = 0; i < 48; i++) {
    apiKey += chars[Math.floor(Math.random() * chars.length)];
  }
  const prefix = apiKey.substring(0, 12) + '...';

  // Hash key
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Get bot username for name
  const botRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const botData = await botRes.json();
  const botUsername = botData.ok ? botData.result.username : undefined;

  const agentName = trainingData.project_name
    ? `${trainingData.project_name} Agent`
    : `My ${agentType.replace('_', ' ')} Agent`;

  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      user_id: userId,
      name: agentName,
      industry: trainingData.industry || 'crypto',
      agent_type: agentType,
      plan,
      status: 'active',
      api_key_hash: hash,
      api_key_prefix: prefix,
      training_data: trainingData,
      skill_file_url: skillFileContent ? null : null,
      channels: ['telegram'],
      telegram_bot_token: botToken,
    })
    .select()
    .single();

  if (error) {
    console.error('[onboarding] Agent creation error:', error.message);
    return { success: false, error: error.message };
  }

  // Store skill file content directly in training_data if provided
  if (skillFileContent) {
    await supabase
      .from('agents')
      .update({
        training_data: { ...trainingData, skill_file_content: skillFileContent },
      })
      .eq('id', agent.id);
  }

  // Set webhook on the user's bot
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://humuter.com';
  const webhookUrl = `${appUrl}/api/webhook/telegram/${agent.id}`;
  const webhookSet = await setWebhook(botToken, webhookUrl);

  if (!webhookSet) {
    console.error('[onboarding] Failed to set webhook for agent', agent.id);
  }

  return {
    success: true,
    agentId: agent.id,
    apiKey,
    botUsername,
  };
}

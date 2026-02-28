function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  discordBotToken: requireEnv('DISCORD_BOT_TOKEN'),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  llmProvider: (process.env.LLM_PROVIDER || 'anthropic') as 'anthropic' | 'openai',
  telegramApiId: process.env.TELEGRAM_API_ID || '',
  telegramApiHash: process.env.TELEGRAM_API_HASH || '',
};

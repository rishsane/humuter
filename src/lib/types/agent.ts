export interface Agent {
  id: string;
  user_id: string;
  name: string;
  industry: string;
  agent_type: string;
  plan: string;
  status: 'pending' | 'active' | 'paused' | 'archived';
  api_key_hash: string | null;
  api_key_prefix: string | null;
  training_data: Record<string, string>;
  skill_file_url: string | null;
  channels: string[];
  telegram_bot_token: string | null;
  llm_provider: 'anthropic' | 'openai' | null;
  messages_handled: number;
  tokens_used: number;
  created_at: string;
  updated_at: string;
}

export interface AgentCreateInput {
  name: string;
  industry: string;
  agent_type: string;
  plan: string;
  training_data: Record<string, string>;
  skill_file_url?: string;
  custom_agent_description?: string;
}

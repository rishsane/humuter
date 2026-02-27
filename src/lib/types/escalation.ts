export interface Escalation {
  id: string;
  agent_id: string;
  group_chat_id: number;
  original_message_id: number;
  user_question: string;
  user_name: string | null;
  admin_reply: string | null;
  forwarded_message_id: number | null;
  status: 'pending' | 'resolved' | 'expired';
  source_platform: 'telegram' | 'discord';
  discord_channel_id: string | null;
  discord_message_id: string | null;
  discord_forwarded_message_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

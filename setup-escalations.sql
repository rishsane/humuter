ALTER TABLE agents ADD COLUMN IF NOT EXISTS reporting_human_chat_id bigint;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS twitter_handle text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS social_context text;

CREATE TABLE IF NOT EXISTS escalations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  group_chat_id bigint NOT NULL,
  original_message_id bigint NOT NULL,
  user_question text NOT NULL,
  user_name text,
  admin_reply text,
  forwarded_message_id bigint,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'expired')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_escalations_agent_status ON escalations(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_escalations_agent_created ON escalations(agent_id, created_at DESC);

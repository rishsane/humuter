-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Add messages_handled column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS messages_handled integer DEFAULT 0;

-- 2. Create RPC function to atomically increment the counter
CREATE OR REPLACE FUNCTION increment_messages_handled(agent_row_id uuid, count integer)
RETURNS void AS $$
BEGIN
  UPDATE agents SET messages_handled = messages_handled + count WHERE id = agent_row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

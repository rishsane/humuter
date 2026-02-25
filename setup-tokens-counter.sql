ALTER TABLE agents ADD COLUMN IF NOT EXISTS tokens_used integer DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_tokens_used(agent_row_id uuid, count integer)
RETURNS void AS $$
BEGIN
  UPDATE agents SET tokens_used = tokens_used + count WHERE id = agent_row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

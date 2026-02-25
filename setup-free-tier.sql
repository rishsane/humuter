ALTER TABLE agents ADD COLUMN IF NOT EXISTS daily_message_count integer DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS daily_message_date text;

CREATE OR REPLACE FUNCTION increment_daily_message_count(agent_row_id uuid)
RETURNS void AS $$
DECLARE
  today text := to_char(now(), 'YYYY-MM-DD');
BEGIN
  UPDATE agents
  SET daily_message_count = CASE
    WHEN daily_message_date = today THEN daily_message_count + 1
    ELSE 1
  END,
  daily_message_date = today
  WHERE id = agent_row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
